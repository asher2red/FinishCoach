import { formatMessage } from "../src/i18n/core";
import { describe, expect, it, vi } from "vitest";
import { configurationIssue } from "../src/purchases/config";
import {
  PurchaseController,
  type PurchaseClient,
  type PurchaseInfo,
} from "../src/purchases/controller";
const info = (owned = false, time = 1): PurchaseInfo => ({
  owned,
  sandbox: owned ? true : null,
  requestDate: new Date(time * 1000).toISOString(),
});
function fixture() {
  let listener: ((value: PurchaseInfo) => void) | undefined;
  const stop = vi.fn();
  const client = {
    issue: null as string | null,
    initialize: vi.fn(async () => {}),
    info: vi.fn(async () => info()),
    product: vi.fn(async () => ({
      id: "test",
      title: "스토어 상품명",
      price: "₩1,100",
    })),
    purchase: vi.fn(async () => info(true, 2)),
    restore: vi.fn(async () => info(true, 2)),
    listen: vi.fn((fn: (value: PurchaseInfo) => void) => {
      listener = fn;
      return stop;
    }),
  } satisfies PurchaseClient;
  return { client, stop, update: (value: PurchaseInfo) => listener?.(value) };
}
describe("purchase configuration", () => {
  it("requires an enabled platform public key and blocks Expo Go, secrets, Test Store and web", () => {
    expect(configurationIssue("ios", "appl_public", true, false)).toBeNull();
    expect(
      configurationIssue("android", "goog_public", true, false),
    ).toBeNull();
    for (const key of [
      undefined,
      "sk_secret",
      "test_public",
      "goog_wrong_platform",
      "appl_YOUR_KEY",
    ])
      expect(configurationIssue("ios", key, true, false)).toBeTruthy();
    expect(configurationIssue("ios", "appl_public", false, false)).toBeTruthy();
    expect(configurationIssue("ios", "appl_public", true, true)).toBeTruthy();
    expect(
      formatMessage(
        configurationIssue("web", "appl_public", true, false)!,
        "ko",
      ),
    ).toContain("Android/iOS");
  });
});
describe("purchase lifecycle with a mocked SDK adapter (not store testing)", () => {
  it("disabled mode never initializes or purchases", async () => {
    const { client } = fixture();
    client.issue = "설정 필요";
    const c = new PurchaseController(client);
    const stop = c.start();
    await c.refresh();
    await c.purchase();
    await c.restore();
    stop();
    expect(c.getSnapshot().status).toBe("disabled");
    expect(client.initialize).not.toHaveBeenCalled();
    expect(client.purchase).not.toHaveBeenCalled();
  });
  it("shows localized store price, verifies ownership and prevents duplicate presses", async () => {
    const { client } = fixture();
    const c = new PurchaseController(client);
    await c.refresh();
    expect(c.getSnapshot().product?.price).toBe("₩1,100");
    let finish!: (value: PurchaseInfo) => void;
    client.purchase.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const operation = c.purchase();
    await vi.waitFor(() => expect(client.purchase).toHaveBeenCalledTimes(1));
    await c.purchase();
    await c.restore();
    await c.refresh();
    expect(c.getSnapshot().status).toBe("purchasing");
    finish(info(true, 2));
    await operation;
    expect(c.getSnapshot().ownership).toBe("owned");
    expect(c.canPurchase()).toBe(false);
    await c.purchase();
    expect(client.purchase).toHaveBeenCalledTimes(1);
  });
  it("checks existing purchases before opening a payment sheet", async () => {
    const { client } = fixture();
    const c = new PurchaseController(client);
    await c.refresh();
    client.info.mockResolvedValue(info(true, 3));
    await c.purchase();
    expect(client.purchase).not.toHaveBeenCalled();
    expect(c.getSnapshot().status).toBe("purchased");
  });
  it("treats cancellation normally and permits a retry", async () => {
    const { client } = fixture();
    const c = new PurchaseController(client);
    await c.refresh();
    client.purchase.mockRejectedValueOnce({ code: "1", userCancelled: true });
    await c.purchase();
    expect(c.getSnapshot().status).toBe("cancelled");
    expect(c.canPurchase()).toBe(true);
    await c.purchase();
    expect(c.getSnapshot().status).toBe("purchased");
  });
  it("does not unlock pending purchases or allow repeat purchase while approval is pending", async () => {
    const f = fixture();
    const c = new PurchaseController(f.client);
    const stop = c.start();
    await vi.waitFor(() => expect(c.getSnapshot().status).toBe("ready"));
    f.client.purchase.mockRejectedValue({ code: "20" });
    await c.purchase();
    await c.refresh();
    expect(c.getSnapshot().pending).toBe(true);
    expect(c.canPurchase()).toBe(false);
    f.update(info(true, 5));
    expect(c.getSnapshot().status).toBe("purchased");
    expect(c.getSnapshot().pending).toBe(false);
    stop();
    expect(f.stop).toHaveBeenCalledTimes(1);
  });
  it("requires entitlement after a successful transaction", async () => {
    const { client } = fixture();
    const c = new PurchaseController(client);
    await c.refresh();
    client.purchase.mockResolvedValue(info(false, 2));
    await c.purchase();
    expect(c.getSnapshot().status).toBe("pending");
    expect(c.getSnapshot().ownership).toBe("not_owned");
  });
  it("restores purchases or distinguishes no matching purchases", async () => {
    const { client } = fixture();
    const c = new PurchaseController(client);
    await c.refresh();
    await c.restore();
    expect(formatMessage(c.getSnapshot().message, "ko")).toContain(
      "복원이 완료",
    );
    client.restore.mockResolvedValue(info(false, 3));
    await c.restore();
    expect(c.getSnapshot().ownership).toBe("not_owned");
    expect(formatMessage(c.getSnapshot().message, "ko")).toContain(
      "찾지 못했습니다",
    );
  });
  it("preserves known ownership on network error and keeps unknown distinct from unpurchased", async () => {
    const { client } = fixture();
    client.info.mockResolvedValue(info(true, 2));
    const c = new PurchaseController(client);
    await c.refresh();
    client.info.mockRejectedValue({ code: "10" });
    await c.refresh();
    expect(c.getSnapshot().status).toBe("error");
    expect(c.getSnapshot().ownership).toBe("owned");
    const next = new PurchaseController(client);
    await next.refresh();
    expect(next.getSnapshot().ownership).toBe("unknown");
    expect(next.canPurchase()).toBe(false);
  });
  it("revokes refunded ownership on newer updates and ignores stale results", async () => {
    const f = fixture();
    f.client.info.mockResolvedValue(info(true, 2));
    const c = new PurchaseController(f.client);
    const stop = c.start();
    await vi.waitFor(() => expect(c.getSnapshot().status).toBe("purchased"));
    f.update(info(false, 4));
    expect(c.getSnapshot().ownership).toBe("not_owned");
    f.update(info(true, 3));
    expect(c.getSnapshot().ownership).toBe("not_owned");
    stop();
  });
  it("allows restore even when the offering is misconfigured and never shows a fake price", async () => {
    const { client } = fixture();
    client.product.mockRejectedValue({ code: "23" });
    const c = new PurchaseController(client);
    await c.refresh();
    expect(c.getSnapshot().product).toBeNull();
    expect(c.getSnapshot().initialized).toBe(true);
    expect(c.canPurchase()).toBe(false);
    await c.restore();
    expect(c.getSnapshot().ownership).toBe("owned");
  });
  it("reconnects listener after initialization failure and removes it on cleanup", async () => {
    const f = fixture();
    f.client.initialize.mockRejectedValueOnce(new Error("offline"));
    const c = new PurchaseController(f.client);
    const stop = c.start();
    await vi.waitFor(() => expect(c.getSnapshot().status).toBe("error"));
    await c.refresh();
    expect(f.client.listen).toHaveBeenCalledTimes(1);
    stop();
    expect(f.stop).toHaveBeenCalledTimes(1);
  });
});

it("restore sheet cancellation is a normal outcome and retains known ownership", async () => {
  const { client } = fixture();
  const c = new PurchaseController(client);
  await c.refresh();
  client.restore.mockRejectedValue({ code: "1", userCancelled: true });
  await c.restore();
  expect(c.getSnapshot().status).toBe("cancelled");
  expect(c.getSnapshot().ownership).toBe("not_owned");
  expect(formatMessage(c.getSnapshot().message, "ko")).toContain("복원을 취소");
});
