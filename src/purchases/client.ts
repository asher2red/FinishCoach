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
function configError(message: string): Error {
  const error = new Error(message);
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
      "RevenueCat의 test offering, test_purchase 패키지와 플랫폼 상품 ID 연결을 확인해주세요.",
    );
  const product = item.product;
  if (
    product.productCategory !== sdk!.PRODUCT_CATEGORY.NON_SUBSCRIPTION ||
    (platform === "ios" &&
      product.productType !== sdk!.PRODUCT_TYPE.NON_CONSUMABLE)
  )
    throw configError(
      "일회성 비소모성 상품 설정이 필요합니다. 구독·소모성 상품은 구매할 수 없습니다.",
    );
  if (product.currencyCode === "USD" && Math.abs(product.price - 0.99) > 0.0001)
    throw configError(
      "USD 기준 가격이 $0.99가 아닙니다. 스토어 가격 설정을 확인해주세요.",
    );
  if (!product.priceString)
    throw configError("스토어에서 상품 가격을 받지 못했습니다.");
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
