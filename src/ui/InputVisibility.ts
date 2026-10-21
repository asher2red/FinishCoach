import { createContext, ComponentRef } from "react";
import type { TextInput } from "react-native";
export const InputVisibility = createContext<
  (input: ComponentRef<typeof TextInput> | null) => void
>(() => {});
