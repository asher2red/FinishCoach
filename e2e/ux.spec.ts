import { test, expect } from "@playwright/test";
test("calendar selection/cancel, range limits and precise keyboard wheel selection survive editing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByRole("button", { name: "시작일 선택", exact: true }).click();
  await page.getByRole("button", { name: "내일", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  const original = await page
    .getByRole("button", { name: "시작일 선택", exact: true })
    .innerText();
  await page.getByRole("button", { name: "시작일 선택", exact: true }).click();
  await page.getByRole("button", { name: "내일", exact: true }).click();
  const cells = await page
    .getByTestId("picker-panel")
    .getByRole("button", { name: /^\d{4}-\d{2}-\d{2}/ })
    .evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top };
      }),
    );
  expect(cells).toHaveLength(42);
  for (let i = 0; i < cells.length; i++) {
    if (i % 7 !== 6) {
      expect(cells[i].top).toBeCloseTo(cells[i + 1].top, 0);
      expect(cells[i].right).toBeLessThanOrEqual(cells[i + 1].left + 1);
    }
  }
  await page.screenshot({ path: "docs/calendar-picker.png" });
  await page.getByRole("button", { name: "확인", exact: true }).click();
  const selected = await page
    .getByRole("button", { name: "시작일 선택", exact: true })
    .innerText();
  expect(selected).not.toBe(original);
  await page
    .getByRole("button", { name: "종료일 (선택) 선택", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp("^" + original) }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "시작일 선택", exact: true }).click();
  await page
    .getByTestId("picker-panel")
    .getByRole("button", { name: "오늘", exact: true })
    .click();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page
    .getByRole("button", { name: "알림 및 목표 시각 선택", exact: true })
    .click();
  await page
    .getByRole("button", { name: "오후 8시 15분", exact: true })
    .click();
  await expect(
    page.getByText("선택: 오후 8시 15분", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("listbox", { name: "오전·오후", exact: true })
    .press("Home");
  await expect(
    page.getByText("선택: 오전 8시 15분", { exact: true }),
  ).toBeVisible();
  await page.getByRole("listbox", { name: "시", exact: true }).press("End");
  await expect(
    page.getByText("선택: 오전 12시 15분", { exact: true }),
  ).toBeVisible();
  await page.getByRole("listbox", { name: "분", exact: true }).press("Home");
  await expect(
    page.getByText("선택: 오전 12시 00분", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("listbox", { name: "분", exact: true })
    .press("ArrowDown");
  await expect(
    page.getByText("선택: 오전 12시 01분", { exact: true }),
  ).toBeVisible();
  await page.getByRole("listbox", { name: "분", exact: true }).hover();
  await page.mouse.wheel(0, 44);
  await expect(
    page.getByText("선택: 오전 12시 02분", { exact: true }),
  ).toBeVisible();
  await page.getByRole("option", { name: "37", exact: true }).click();
  await expect(
    page.getByText("선택: 오전 12시 37분", { exact: true }),
  ).toBeVisible();
  await page.getByRole("listbox", { name: "분", exact: true }).press("Home");
  await page
    .getByRole("listbox", { name: "분", exact: true })
    .press("ArrowDown");
  await expect(
    page.getByText("선택: 오전 12시 01분", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/time-wheel.png" });
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "알림 및 목표 시각 선택", exact: true }),
  ).toHaveText("오전 12시 01분");
  await page
    .getByRole("button", { name: "알림 및 목표 시각 선택", exact: true })
    .click();
  await page
    .getByRole("button", { name: "알림 시각 지우기", exact: true })
    .click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "알림 및 목표 시각 선택", exact: true }),
  ).toHaveText("오전 12시 01분");
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await page.getByRole("button", { name: "상세", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "알림 및 목표 시각 선택", exact: true }),
  ).toHaveText("오전 12시 01분");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "상세", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "알림 및 목표 시각 선택", exact: true }),
  ).toHaveText("오전 12시 01분");
  await page.screenshot({ path: "docs/routine-picker.png" });
});
test("record dashboard uses actual logs and unsupported web notification settings are disabled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.getByRole("button", { name: "기록", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /완료 1회 예정 1회 0분/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("실제 소요 시간 (분)")).toHaveValue("");
  await page.getByLabel("실제 소요 시간 (분)").fill("20");
  await page.getByRole("button", { name: "기록 저장", exact: true }).click();
  await expect(
    page.getByText("주간 실행 그래프", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("활동별 완료 횟수", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("주별 누적 실행 시간", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /완료 1회 예정 1회 20분/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "년", exact: true }).click();
  await expect(
    page.getByText("월별 누적 실행 시간", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/history-dashboard.png" });
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "알림음", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", { name: "진동", exact: true }),
  ).toBeDisabled();
});
