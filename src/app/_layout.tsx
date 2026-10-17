import { Stack } from "expo-router";
import { Provider } from "../data/context";
export default function Layout() {
  return (
    <Provider>
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
