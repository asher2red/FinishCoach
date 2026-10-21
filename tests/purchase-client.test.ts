import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  sdk: {
    isConfigured: vi.fn(async () => false),
    configure: vi.fn(),
    getOfferings: vi.fn(),
    invalidateCustomerInfoCache: vi.fn(async () => {}),
    getCustomerInfo: vi.fn(),
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
    addCustomerInfoUpdateListener: vi.fn(),
    removeCustomerInfoUpdateListener: vi.fn(),
  },
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-constants", () => ({
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
vi.mock("react-native-purchases", () => ({
  default: mocks.sdk,
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: "NON_SUBSCRIPTION" },
  PRODUCT_TYPE: { NON_CONSUMABLE: "NON_CONSUMABLE" },
}));
const item = () => ({
  identifier: "test_purchase",
  product: {
    identifier: "com.finishcoach.app.testpurchase",
    title: "스토어 상품명",
    priceString: "$0.99",
    price: 0.99,
    currencyCode: "USD",
    productCategory: "NON_SUBSCRIPTION",
    productType: "NON_CONSUMABLE",
  },
});
const receipt = (id = "com.finishcoach.app.testpurchase") => ({
  entitlements: {
    active: {
      test_purchase: { isActive: true, productIdentifier: id, isSandbox: true },
    },
  },
  requestDate: "2026-10-22T00:00:00Z",
});
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.platform.OS = "ios";
  vi.stubEnv("EXPO_PUBLIC_IAP_TEST_ENABLED", "true");
  vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", "appl_unit_test_public");
  vi.stubEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY", "goog_unit_test_public");
  mocks.sdk.getOfferings.mockResolvedValue({
    all: { test: { availablePackages: [item()] } },
  });
  mocks.sdk.getCustomerInfo.mockResolvedValue(receipt());
  mocks.sdk.purchasePackage.mockResolvedValue({ customerInfo: receipt() });
  mocks.sdk.restorePurchases.mockResolvedValue(receipt());
});
afterEach(() => vi.unstubAllEnvs());
it("initializes the real SDK interface only once with the platform key and no app user ID", async () => {
  const { purchaseClient: c } = await import("../src/purchases/client");
  await Promise.all([c.initialize(), c.initialize(), c.info()]);
  expect(mocks.sdk.configure).toHaveBeenCalledTimes(1);
  expect(mocks.sdk.configure).toHaveBeenCalledWith({
    apiKey: "appl_unit_test_public",
  });
  expect(mocks.sdk.invalidateCustomerInfoCache).toHaveBeenCalledTimes(1);
});
it("loads store metadata and purchases only the exact offering package", async () => {
  const { purchaseClient: c } = await import("../src/purchases/client");
  expect(await c.product()).toEqual({
    id: "com.finishcoach.app.testpurchase",
    title: "스토어 상품명",
    price: "$0.99",
  });
  expect((await c.purchase()).owned).toBe(true);
  expect(mocks.sdk.purchasePackage).toHaveBeenCalledWith(item());
  expect((await c.restore()).sandbox).toBe(true);
});
it("accepts localized currency without replacing it with a dollar amount", async () => {
  const p = item();
  Object.assign(p.product, {
    currencyCode: "KRW",
    price: 1100,
    priceString: "₩1,100",
  });
  mocks.sdk.getOfferings.mockResolvedValue({
    all: { test: { availablePackages: [p] } },
  });
  const { purchaseClient: c } = await import("../src/purchases/client");
  expect((await c.product()).price).toBe("₩1,100");
});
it.each([
  "missing offering",
  "wrong ID",
  "subscription",
  "consumable",
  "wrong USD price",
])("rejects %s before invoking the store sheet", async (kind) => {
  const p = item();
  if (kind === "wrong ID") p.product.identifier = "unexpected";
  if (kind === "subscription") p.product.productCategory = "SUBSCRIPTION";
  if (kind === "consumable") p.product.productType = "CONSUMABLE";
  if (kind === "wrong USD price") p.product.price = 1.99;
  mocks.sdk.getOfferings.mockResolvedValue({
    all:
      kind === "missing offering" ? {} : { test: { availablePackages: [p] } },
  });
  const { purchaseClient: c } = await import("../src/purchases/client");
  await expect(c.purchase()).rejects.toMatchObject({
    name: "PurchaseConfigurationError",
  });
  expect(mocks.sdk.purchasePackage).not.toHaveBeenCalled();
});
it("uses Google public key, product ID and non-subscription category on Android", async () => {
  mocks.platform.OS = "android";
  const p = item();
  Object.assign(p.product, {
    identifier: "finish_coach_test_purchase",
    productType: "UNKNOWN",
  });
  mocks.sdk.getOfferings.mockResolvedValue({
    all: { test: { availablePackages: [p] } },
  });
  const { purchaseClient: c } = await import("../src/purchases/client");
  expect((await c.product()).id).toBe("finish_coach_test_purchase");
  expect(mocks.sdk.configure).toHaveBeenCalledWith({
    apiKey: "goog_unit_test_public",
  });
});
it("only maps active entitlement for the configured product and cleans up the SDK listener", async () => {
  const { purchaseClient: c } = await import("../src/purchases/client");
  await c.initialize();
  const listener = vi.fn();
  const stop = c.listen(listener);
  const callback = mocks.sdk.addCustomerInfoUpdateListener.mock.calls[0][0] as (
    value: unknown,
  ) => void;
  callback(receipt("other_product"));
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({ owned: false }),
  );
  callback(receipt());
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({ owned: true }),
  );
  stop();
  expect(mocks.sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(
    callback,
  );
});
it("never configures or invokes a payment sheet with the test switch disabled", async () => {
  vi.stubEnv("EXPO_PUBLIC_IAP_TEST_ENABLED", "false");
  const { purchaseClient: c } = await import("../src/purchases/client");
  expect(c.issue).toBeTruthy();
  await expect(c.initialize()).rejects.toThrow();
  expect(mocks.sdk.configure).not.toHaveBeenCalled();
  expect(mocks.sdk.purchasePackage).not.toHaveBeenCalled();
});
