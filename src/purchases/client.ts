import { message as msg, LocalizedError, type AppMessage } from "../i18n/core";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import type { PurchaseClient, PurchaseInfo } from "./controller";
import { configurationIssue, purchaseConfig } from "./config";

const platform = Platform.OS;
const key =
  platform === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const issue = configurationIssue(
  platform,
  key,
  process.env.EXPO_PUBLIC_IAP_TEST_ENABLED === "true",
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
);
const expectedId =
  platform === "ios"
    ? purchaseConfig.productIds.ios
    : purchaseConfig.productIds.android;
let initialization: Promise<void> | undefined;
let sdk: typeof import("react-native-purchases") | undefined;
function configError(value: AppMessage): Error {
  const error =
    typeof value === "string"
      ? new Error(value)
      : new LocalizedError(value.key, value.params);
  error.name = "PurchaseConfigurationError";
  return error;
}
async function initialize() {
  if (issue) throw configError(issue);
  if (!initialization)
    initialization = (async () => {
      sdk = await import("react-native-purchases");
      if (!(await sdk.default.isConfigured()))
        sdk.default.configure({ apiKey: key! });
    })().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  return initialization;
}
export function customerSnapshot(info: CustomerInfo): PurchaseInfo {
  const entitlement = info.entitlements.active[purchaseConfig.entitlement];
  return {
    owned:
      !!entitlement?.isActive && entitlement.productIdentifier === expectedId,
    sandbox: entitlement?.isSandbox ?? null,
    requestDate: info.requestDate,
  };
}
async function getPackage(): Promise<PurchasesPackage> {
  await initialize();
  const offerings = await sdk!.default.getOfferings();
  const item = offerings.all[purchaseConfig.offering]?.availablePackages.find(
    (p) => p.identifier === purchaseConfig.package,
  );
  if (!item || item.product.identifier !== expectedId)
    throw configError(
      msg(
        "purchases.check.the.revenuecat.test.offering.test.purchase.package.and",
      ),
    );
  const product = item.product;
  if (
    product.productCategory !== sdk!.PRODUCT_CATEGORY.NON_SUBSCRIPTION ||
    (platform === "ios" &&
      product.productType !== sdk!.PRODUCT_TYPE.NON_CONSUMABLE)
  )
    throw configError(
      msg(
        "purchases.configure.a.non.consumable.one.time.product.subscriptions.and",
      ),
    );
  if (product.currencyCode === "USD" && Math.abs(product.price - 0.99) > 0.0001)
    throw configError(msg("purchases.the.usd.price.is.not.0.99.check.your"));
  if (!product.priceString)
    throw configError(
      msg("purchases.the.store.did.not.return.a.product.price"),
    );
  return item;
}
export const purchaseClient: PurchaseClient = {
  issue,
  initialize,
  async info() {
    await initialize();
    await sdk!.default.invalidateCustomerInfoCache();
    return customerSnapshot(await sdk!.default.getCustomerInfo());
  },
  async product() {
    const item = await getPackage();
    return {
      id: item.product.identifier,
      title: item.product.title,
      price: item.product.priceString,
    };
  },
  async purchase() {
    const item = await getPackage();
    return customerSnapshot(
      (await sdk!.default.purchasePackage(item)).customerInfo,
    );
  },
  async restore() {
    await initialize();
    return customerSnapshot(await sdk!.default.restorePurchases());
  },
  listen(callback) {
    const listener = (info: CustomerInfo) => callback(customerSnapshot(info));
    sdk!.default.addCustomerInfoUpdateListener(listener);
    return () => {
      sdk!.default.removeCustomerInfoUpdateListener(listener);
    };
  },
};
