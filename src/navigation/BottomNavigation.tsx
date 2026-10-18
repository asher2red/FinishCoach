import { View, Pressable, Text } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionIcon } from "../ui/ActionIcon";
import { useAppTheme } from "../ui/useAppTheme";
import { mainMenu, navigateToPage } from "./menu";

export const BOTTOM_MENU_HEIGHT = 56;
export function BottomNavigation() {
  const path = usePathname();
  const c = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="bottom-navigation"
      style={{
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View
        testID="bottom-navigation-items"
        style={{
          flexDirection: "row",
          minHeight: BOTTOM_MENU_HEIGHT,
          alignItems: "stretch",
        }}
      >
        {mainMenu.map((item) => {
          const selected = path === item.href;
          return (
            <Pressable
              key={item.href}
              testID={`bottom-menu-${item.icon}`}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) navigateToPage(item.label);
              }}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                minHeight: BOTTOM_MENU_HEIGHT,
                paddingHorizontal: 2,
                paddingVertical: 6,
                gap: 2,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 2,
                borderTopColor: selected ? c.accent : "transparent",
                backgroundColor: selected ? c.soft : pressed ? c.hover : c.card,
              })}
            >
              <ActionIcon name={item.icon} size={24} />
              <Text
                style={{
                  color: selected ? c.accent : c.muted,
                  fontSize: 10,
                  lineHeight: 14,
                  fontWeight: selected ? "800" : "500",
                  textAlign: "center",
                  flexShrink: 1,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
