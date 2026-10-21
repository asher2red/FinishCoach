import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { PurchaseController } from "./controller";
import { purchaseClient } from "./client";
const Context = createContext<PurchaseController>(null!);
export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [controller] = useState(() => new PurchaseController(purchaseClient));
  useEffect(() => {
    const stop = controller.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void controller.refresh();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [controller]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}
export function usePurchase() {
  const controller = useContext(Context);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { controller, state };
}
