export const purchaseConfig = {
  offering: "test",
  package: "test_purchase",
  entitlement: "test_purchase",
  productIds: {
    ios: "com.finishcoach.app.testpurchase",
    android: "finish_coach_test_purchase",
  },
} as const;
export function configurationIssue(
  platform: string,
  key: string | undefined,
  enabled: boolean,
  expoGo: boolean,
) {
  if (platform !== "ios" && platform !== "android")
    return "인앱 결제 테스트는 Android/iOS 앱에서 지원합니다.";
  if (expoGo)
    return "실제 스토어 결제는 Expo Go에서 지원하지 않습니다. 네이티브 앱을 새로 빌드해주세요.";
  if (!enabled)
    return "결제 테스트가 비활성화되어 있습니다. 테스트 계정 준비 후 EXPO_PUBLIC_IAP_TEST_ENABLED=true로 빌드해주세요.";
  if (
    !key ||
    !key.startsWith(platform === "ios" ? "appl_" : "goog_") ||
    key.includes("YOUR_")
  )
    return "이 플랫폼의 RevenueCat 공개 SDK 키를 설정해주세요. 비밀 키와 Test Store 키는 사용할 수 없습니다.";
  return null;
}
