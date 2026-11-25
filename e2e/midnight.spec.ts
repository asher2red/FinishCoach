import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Seoul" });

test("Today shows the next day's routine at local midnight", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-25T23:59:30+09:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByLabel("활동 이름 (직접 추가 가능)").fill("아침 독서");
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();

  const complete = page.getByRole("button", { name: "완료", exact: true });
  await complete.click();
  await expect(complete).toHaveCount(0);
  await page.clock.fastForward(31_000);
  await expect(complete).toBeVisible();
});
