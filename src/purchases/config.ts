import { message as msg } from "../i18n/core";
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
    return msg("purchases.in.app.purchase.testing.is.available.in.the.android");
  if (expoGo)
    return msg("purchases.real.store.purchases.are.not.supported.in.expo.go");
  if (!enabled)
    return msg(
      "purchases.purchase.testing.is.disabled.prepare.test.accounts.then.build",
    );
  if (
    !key ||
    !key.startsWith(platform === "ios" ? "appl_" : "goog_") ||
    key.includes("YOUR_")
  )
    return msg(
      "purchases.set.this.platform.s.revenuecat.public.sdk.key.secret",
    );
  return null;
}
