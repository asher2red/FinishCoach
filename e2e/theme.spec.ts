import { test, expect } from "@playwright/test";

test("six color themes apply immediately and persist across reload and routes", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByText("현재 색상: green", { exact: true }),
  ).toBeVisible();
  const images = await page
    .locator("img")
    .evaluateAll((items) => items.map((item) => item.getAttribute("src")));
  const colors = new Set<string>();
  for (const color of ["red", "blue", "green", "orange", "purple", "black"]) {
    const choice = page.getByRole("radio", {
      name: `${color} 테마`,
      exact: true,
    });
    await choice.click();
    await expect(choice).toBeChecked();
    await expect(
      page.getByText(`현재 색상: ${color}`, { exact: true }),
    ).toBeVisible();
    const selectedMenu = page.getByRole("button", {
      name: "설정",
      exact: true,
    });
    colors.add(
      await selectedMenu.evaluate((item) => getComputedStyle(item).borderColor),
    );
    await page.reload();
    await expect(
      page.getByRole("radio", { name: `${color} 테마`, exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("switch", { name: "알림음", exact: true }),
    ).toBeChecked();
  }
  expect(colors.size).toBe(6);
  expect(
    await page
      .locator("img")
      .evaluateAll((items) => items.map((item) => item.getAttribute("src"))),
  ).toEqual(images);
  await page.getByRole("radio", { name: "green 테마", exact: true }).click();
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  const today = page.getByRole("button", { name: "오늘", exact: true });
  await expect(today).toHaveCSS("border-color", "rgb(35, 101, 70)");
  await page.mouse.move(0, 0);
  await expect(today).toHaveCSS("background-color", "rgb(243, 248, 244)");
  const tiles = ["오늘", "루틴", "기록", "통계", "프로젝트", "설정"];
  const surfaces = new Set<string>();
  for (const name of tiles)
    surfaces.add(
      await page
        .getByRole("button", { name, exact: true })
        .evaluate((item) => getComputedStyle(item).backgroundColor),
    );
  expect(surfaces.size).toBe(1);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBeTruthy();
  await page.screenshot({ path: "docs/theme-green.png", fullPage: true });
  await page.goto("/settings");
  await expect(
    page.getByRole("radio", { name: "green 테마", exact: true }),
  ).toBeChecked();
  await page.screenshot({ path: "docs/theme-settings.png", fullPage: true });
});
