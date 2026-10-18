import { test, expect } from "@playwright/test";
test("routine completion persists; history, statistics, weekly goal and project work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("오늘, 하나씩 끝내볼까요?")).toBeVisible();
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByLabel("활동 이름 (직접 추가 가능)").fill("아침 독서");
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await expect(page.getByText("아침 독서", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "기록", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "수정", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("실제 소요 시간 (분)").fill("35");
  await page.getByLabel("메모").fill("첫 실행");
  await page
    .getByRole("button", { name: "완료 시각 선택", exact: true })
    .click();
  await page
    .getByRole("button", { name: "오후 8시 15분", exact: true })
    .click();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await page.getByRole("button", { name: "기록 저장", exact: true }).click();
  await expect(page.getByText("첫 실행", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "완료 시각 선택", exact: true }),
  ).toHaveText("오후 8시 15분");
  await page.getByRole("button", { name: "닫기", exact: true }).last().click();
  await page.getByRole("button", { name: "통계", exact: true }).click();
  await expect(page.getByText("35분", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "오늘", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  await page.getByRole("button", { name: "완료 취소", exact: true }).click();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "루틴", exact: true }).click();
  await page
    .getByRole("button", { name: "＋ 루틴 만들기", exact: true })
    .click();
  await page.getByLabel("활동 이름 (직접 추가 가능)").fill("자유 운동");
  await page.getByRole("button", { name: "주 N회", exact: true }).click();
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "오늘", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  await expect(
    page.getByText("자유 운동 · 주 3회 목표", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "지금 실행 기록", exact: true })
    .click();
  await expect(
    page.getByText("이번 주 1회 완료 · 정해진 요일 없이 실행"),
  ).toBeVisible();
  await page.getByRole("button", { name: "프로젝트", exact: true }).click();
  await page
    .getByRole("button", { name: "＋ 프로젝트 만들기", exact: true })
    .click();
  await page.getByLabel("프로젝트 제목").fill("첫 앱 출시");
  await page.getByLabel("완료 기준").fill("MVP 검증");
  await page.getByLabel("추가할 마일스톤 (선택)").fill("핵심 기능");
  await page
    .getByRole("button", { name: "프로젝트 저장", exact: true })
    .click();
  await page.getByRole("button", { name: "○ 핵심 기능", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "✓ 핵심 기능", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByText(/^완료일 /)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "✓ 핵심 기능", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "오늘", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  await expect(page.getByText("오늘, 하나씩 끝내볼까요?")).toBeVisible();
  await expect(page.getByText("아침 독서", { exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/mobile-web.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("empty dark desktop layout and input validation", async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByText("아직 기록이 없어요").first()).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCSS(
    "background-color",
    "rgb(17, 23, 37)",
  );
  await page.screenshot({ path: "docs/desktop-dark.png", fullPage: true });
  await page.getByRole("button", { name: "＋ 활동 추가", exact: true }).click();
  await page.getByLabel("활동 이름 (직접 추가 가능)").fill("");
  await page.getByRole("button", { name: "루틴 저장", exact: true }).click();
  await expect(page.getByText("활동 이름을 입력하세요.").last()).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).last().click();
});
