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
  error: string;
  notice: string;
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
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
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
        "데이터는 저장되었습니다. 알림 예약에 실패했습니다. 앱을 다시 열면 재시도합니다.",
      );
    }
  }, []);
  const reload = useCallback(async () => {
    try {
      const s = (await repository.load()) ?? emptyState();
      if (s.version !== 1) throw new Error("지원되지 않는 데이터 버전입니다.");
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
      setError(e instanceof Error ? e.message : "저장소를 열 수 없습니다.");
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
              e instanceof Error
                ? e.message
                : "저장하지 못했습니다. 다시 시도하세요.",
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
