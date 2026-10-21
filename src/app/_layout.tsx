import { Stack } from "expo-router";
import { Provider } from "../data/context";
import { Platform, View } from "react-native";
import { BottomNavigation } from "../navigation/BottomNavigation";
import { useAppTheme } from "../ui/useAppTheme";
import { ThemeRuntime } from "../ui/ThemeRuntime";

function AppFrame() {
  const c = useAppTheme();
  if (Platform.OS === "web")
    return (
      <>
        <ThemeRuntime />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        />
      </>
    );
  return (
    <View
      testID="native-app-frame"
      style={{ flex: 1, backgroundColor: c.card }}
    >
      <ThemeRuntime />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        />
      </View>
      <BottomNavigation />
    </View>
  );
}
export default function Layout() {
  return (
    <Provider>
      <AppFrame />
    </Provider>
  );
}
