import { useEffect, useMemo, useRef } from "react";
import { emptyState } from "../domain/model";
import { reconcileNotifications } from "../services/notifications";
import { AuthProvider, useAuth } from "../account/auth";
import { accountRepository } from "../account/repository";
import { WidgetSync } from "../widgets/WidgetSync";
import { I18nProvider } from "../i18n/context";
import { PurchaseProvider } from "../purchases/context";
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
function Workspace() {
  const { ready, session } = useAuth();
  const userId = session?.user.id;
  const backend = useMemo(
    () => (userId ? accountRepository(userId) : undefined),
    [userId],
  );
  const workspaceId = userId || "guest";
  const previousWorkspace = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    if (
      previousWorkspace.current &&
      previousWorkspace.current !== workspaceId
    ) {
      void reconcileNotifications(emptyState()).catch(() => {});
    }
    previousWorkspace.current = workspaceId;
  }, [ready, workspaceId]);
  if (!ready) return null;
  return (
    <Provider key={workspaceId} backend={backend}>
      <I18nProvider>
        <WidgetSync />
        <PurchaseProvider>
          <AppFrame />
        </PurchaseProvider>
      </I18nProvider>
    </Provider>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <Workspace />
    </AuthProvider>
  );
}
