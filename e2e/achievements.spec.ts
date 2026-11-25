import { expect, test } from "@playwright/test";

test("history opens the runner and shows completed activity by day", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByLabel("활동 이름 (직접 추가 가능)").fill("아침 독서");
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await page.getByRole("button", { name: "완료", exact: true }).click();

  await page.goto("/history");
  await page.getByRole("button", { name: "달성률 확인하기" }).click();
  await expect(
    page.getByRole("heading", { name: "달려온 기록" }),
  ).toBeVisible();
  await expect(page.getByText("3%", { exact: true })).toBeVisible();
  await expect(
    page.getByText("30일 중 1일에 할 일을 완료했어요."),
  ).toBeVisible();
  const days = page.getByTestId(/^achievement-day-/);
  await expect(days).toHaveCount(30);
  await expect(days.last()).toBeEnabled();
  await days.last().click();
  await expect(
    page.getByText("아침 독서", { exact: true }).last(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 달리기" })).toBeVisible();
  await page.getByRole("button", { name: "다시 달리기" }).click();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "달려온 기록" })).toHaveCount(
    0,
  );
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("finish-coach-v1", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("logs", "readwrite");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onabort = () => reject(transaction.error);
        const logs = transaction.objectStore("logs");
        const existing = logs.getAll();
        existing.onsuccess = () => {
          const sample = existing.result[0];
          for (let offset = 1; offset <= 23; offset++) {
            const day = new Date();
            day.setDate(day.getDate() - offset);
            day.setHours(12, 0, 0, 0);
            logs.put({
              ...sample,
              id: "verification-log-" + offset,
              completedAt: day.toISOString(),
              plannedOccurrenceId: null,
            });
          }
        };
      };
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "달성률 확인하기" }).click();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "이제 조금만 더!" }),
  ).toBeVisible();
  await expect(
    page.getByText("30일 중 24일에 할 일을 완료했어요."),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "다시 달리기" })).toHaveCount(
    0,
  );
  await page.screenshot({ path: testInfo.outputPath("achievements.png") });
  const foot = page.getByTestId("achievement-runner-front-foot");
  const rest = await foot.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(
      () => foot.evaluate((element) => getComputedStyle(element).transform),
      {
        intervals: [25, 40, 60],
      },
    )
    .not.toBe(rest);
});
