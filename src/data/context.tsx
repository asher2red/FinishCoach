import {
  LocalizedError,
  message,
  errorMessage,
  type AppMessage,
} from "../i18n/core";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { emptyState, State } from "../domain/model";
import { generate } from "../domain/engine";
import { repository } from "./storage";
import { reconcileNotifications } from "../services/notifications";
interface Store {
  state: State;
  ready: boolean;
  busy: boolean;
  error: AppMessage;
  notice: AppMessage;
  mutate: (
    fn: (s: State) => void,
    options?: { syncNotifications?: boolean },
  ) => Promise<boolean>;
  reload: () => Promise<void>;
  clearError: () => void;
}
const Context = createContext<Store>(null!);
export function Provider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(emptyState),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<AppMessage>(""),
    [notice, setNotice] = useState<AppMessage>("");
  const current = useRef(state),
    initialized = useRef(false),
    queue = useRef(Promise.resolve());
  const sync = useCallback(async (s: State) => {
    try {
      await reconcileNotifications(s);
      setNotice("");
    } catch (e) {
      console.error(
        "Notification reconciliation failed",
        e instanceof Error ? e.name : "Error",
      );
      setNotice(
        message("errors.your.data.was.saved.but.notifications.could.not.be"),
      );
    }
  }, []);
  const reload = useCallback(async () => {
    try {
      const s = (await repository.load()) ?? emptyState();
      if (s.version !== 1)
        throw new LocalizedError("errors.this.data.version.is.not.supported");
      generate(s);
      await repository.commit(s);
      current.current = s;
      initialized.current = true;
      setState(s);
      setReady(true);
      setError("");
      await sync(s);
    } catch (e) {
      console.error(
        "Storage initialization failed",
        e instanceof Error ? e.name : "Error",
      );
      setError(errorMessage(e, "errors.unable.to.open.storage"));
    }
  }, [sync]);
  const mutate = useCallback(
    (
      fn: (s: State) => void,
      options?: { syncNotifications?: boolean },
    ): Promise<boolean> =>
      new Promise((resolve) => {
        queue.current = queue.current.then(async () => {
          if (!initialized.current) {
            resolve(false);
            return;
          }
          setBusy(true);
          try {
            const next = JSON.parse(JSON.stringify(current.current)) as State;
            fn(next);
            await repository.commit(next);
            current.current = next;
            setState(next);
            setError("");
            if (options?.syncNotifications !== false) await sync(next);
            resolve(true);
          } catch (e) {
            console.error(
              "Mutation failed",
              e instanceof Error ? e.name : "Error",
            );
            setError(
              errorMessage(
                e,
                "errors.couldn.t.save.your.changes.please.try.again",
              ),
            );
            resolve(false);
          } finally {
            setBusy(false);
          }
        });
      }),
    [sync],
  );
  useEffect(() => {
    void Promise.resolve().then(reload);
    const sub = AppState.addEventListener("change", (v) => {
      if (v === "active") void mutate((s) => generate(s));
    });
    const timer = setInterval(() => void mutate((s) => generate(s)), 60000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [reload, mutate]);
  return (
    <Context.Provider
      value={{
        state,
        ready,
        busy,
        error,
        notice,
        mutate,
        reload,
        clearError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
