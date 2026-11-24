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
import type { Repository } from "./repository";
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
export function Provider({
  children,
  backend = repository,
}: {
  children: React.ReactNode;
  backend?: Repository;
}) {
  const [state, setState] = useState(emptyState),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<AppMessage>(""),
    [notice, setNotice] = useState<AppMessage>("");
  const active = useRef(true);
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
  const reload = useCallback(() => {
    const run = queue.current.then(async () => {
      if (!active.current) return;
      try {
        const s = (await backend.load()) ?? emptyState();
        if (s.version !== 1)
          throw new LocalizedError("errors.this.data.version.is.not.supported");
        generate(s);
        await backend.commit(s);
        current.current = s;
        initialized.current = true;
        setState(s);
        setReady(true);
        setError("");
        if (active.current) await sync(s);
      } catch (e) {
        console.error(
          "Storage initialization failed",
          e instanceof Error ? e.name : "Error",
        );
        setError(errorMessage(e, "errors.unable.to.open.storage"));
      }
    });
    queue.current = run;
    return run;
  }, [backend, sync]);
  const mutate = useCallback(
    (
      fn: (s: State) => void,
      options?: { syncNotifications?: boolean },
    ): Promise<boolean> =>
      new Promise((resolve) => {
        queue.current = queue.current.then(async () => {
          if (!active.current || !initialized.current) {
            resolve(false);
            return;
          }
          setBusy(true);
          try {
            const next = JSON.parse(JSON.stringify(current.current)) as State;
            fn(next);
            await backend.commit(next);
            current.current = next;
            setState(next);
            setError("");
            if (active.current && options?.syncNotifications !== false)
              await sync(next);
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
    [backend, sync],
  );
  useEffect(() => {
    active.current = true;
    void reload();
    const refresh = () => {
      if (backend === repository) void mutate((s) => generate(s));
      else void reload();
    };
    const sub = AppState.addEventListener("change", (v) => {
      if (v === "active") refresh();
    });
    const timer = setInterval(refresh, 60000);
    return () => {
      active.current = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [backend, reload, mutate]);
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
