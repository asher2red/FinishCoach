import { it, expect, vi } from "vitest";
import {
  requestPermission,
  reconcileNotifications,
} from "../src/services/notifications.web";
import { emptyState } from "../src/domain/model";
it("handles unsupported browsers and denied permission without disrupting the app", async () => {
  vi.stubGlobal("Notification", undefined);
  expect(await requestPermission()).toContain("지원하지");
  await expect(reconcileNotifications(emptyState())).resolves.toBeUndefined();
  vi.stubGlobal("Notification", {
    permission: "denied",
    requestPermission: async () => "denied",
  });
  expect(await requestPermission()).toContain("허용되지");
  await expect(reconcileNotifications(emptyState())).resolves.toBeUndefined();
  vi.unstubAllGlobals();
});
