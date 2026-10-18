import { Stack } from "expo-router";
import { Provider } from "../data/context";
import { Platform, View } from "react-native";
import { BottomNavigation } from "../navigation/BottomNavigation";
import { useAppTheme } from "../ui/useAppTheme";

function AppFrame() {
  const c = useAppTheme();
  if (Platform.OS === "web")
    return <Stack screenOptions={{ headerShown: false }} />;
  return (
    <View
      testID="native-app-frame"
      style={{ flex: 1, backgroundColor: c.card }}
    >
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
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
