import { expect, test } from "@playwright/test";

test("settings offers Google sign-in while preserving guest mode", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByText("내 계정", { exact: true })).toBeVisible();
  await expect(
    page.getByText("게스트 모드 · 데이터는 이 기기에만 저장됩니다."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Apple/ })).toHaveCount(0);
});
