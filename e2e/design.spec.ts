import { test, expect, type Page } from "@playwright/test";

async function waitForImages(page: Page) {
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
        ),
    )
    .toBeTruthy();
}

test("menu tiles remain readable and keyboard operable across viewport sizes", async ({
  page,
}) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("bottom-navigation")).toHaveCount(0);
    const today = page.getByRole("button", { name: "오늘", exact: true });
    const routine = page.getByRole("button", { name: "루틴", exact: true });
    await expect(today).toHaveAttribute("aria-current", "page");
    for (const label of ["오늘", "루틴", "기록", "통계", "프로젝트", "설정"]) {
      const tile = page.getByRole("button", { name: label, exact: true });
      const rect = await tile.boundingBox();
      expect(rect!.width).toBeGreaterThanOrEqual(44);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      const image = tile.locator("img");
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBeTruthy();
    }
    await routine.focus();
    await expect(routine).toBeFocused();
    await expect(routine).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByText("꾸준함을 만드는 루틴")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "루틴", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("dark cards and long action titles stay within small screens", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/settings");
  const action = page.getByRole("button", {
    name: "알림 권한 확인 및 요청",
    exact: true,
  });
  await expect(action).toBeVisible();
  const rect = await action.boundingBox();
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
  await expect(
    page.getByRole("switch", { name: "알림음", exact: true }),
  ).toBeDisabled();
  await waitForImages(page);
  await page.screenshot({
    path: "docs/design-settings-dark.png",
    fullPage: true,
  });
  await page.goto("/");
  await waitForImages(page);
  await page.screenshot({
    path: "docs/design-mobile-dark.png",
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForImages(page);
  await page.screenshot({ path: "docs/design-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await waitForImages(page);
  await page.screenshot({ path: "docs/design-desktop.png", fullPage: true });
});
