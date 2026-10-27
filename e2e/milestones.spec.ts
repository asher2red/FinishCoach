import { test, expect } from "@playwright/test";

test("milestone drafts batch-save, retry failures, edit, reorder, delete and cancel", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "＋ 프로젝트 만들기", exact: true })
    .click();
  await page
    .getByLabel("프로젝트 제목", { exact: true })
    .fill("일괄 편집 검증");
  const add = page.getByRole("button", {
    name: "＋ 마일스톤 추가",
    exact: true,
  });
  for (let i = 1; i <= 3; i++) {
    await add.click();
    const field = page.getByLabel(`마일스톤 ${i}`, { exact: true });
    await expect(field).toBeFocused();
    await field.fill(`단계 ${i}`);
    await expect(page.getByLabel("마일스톤 1", { exact: true })).toHaveValue(
      "단계 1",
    );
  }
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    let fail = true;
    IDBDatabase.prototype.transaction = function (names, mode, options) {
      if (mode === "readwrite" && fail) {
        fail = false;
        throw new DOMException("검증용 저장 실패", "QuotaExceededError");
      }
      return original.call(this, names, mode, options);
    };
  });
  const save = page.getByRole("button", { name: "프로젝트 저장", exact: true });
  await save.click();
  await expect(
    page.getByText("저장하지 못했습니다. 다시 시도하세요.").last(),
  ).toBeVisible();
  await expect(page.getByLabel("마일스톤 3", { exact: true })).toHaveValue(
    "단계 3",
  );
  await save.click();
  await expect(page.getByLabel("프로젝트 제목", { exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  for (let i = 1; i <= 3; i++)
    await expect(
      page.getByRole("button", { name: `○ 단계 ${i}`, exact: true }),
    ).toBeVisible();
  const edit = page.getByRole("button", {
    name: "편집 · 마일스톤 추가",
    exact: true,
  });
  await edit.click();
  await page.getByLabel("마일스톤 1", { exact: true }).fill("첫 단계 수정");
  await add.click();
  await page.getByLabel("마일스톤 4", { exact: true }).fill("단계 4");
  await page
    .getByRole("button", { name: "마일스톤 2 삭제", exact: true })
    .click();
  await page.getByRole("button", { name: "위로", exact: true }).last().click();
  await save.click();
  await expect(page.getByLabel("프로젝트 제목", { exact: true })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "○ 단계 2", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "○ 첫 단계 수정", exact: true }),
  ).toBeVisible();
  await edit.click();
  await expect(page.getByLabel("마일스톤 2", { exact: true })).toHaveValue(
    "단계 4",
  );
  await add.click();
  await save.click();
  await expect(
    page.getByText("마일스톤 4 이름을 입력하세요.").last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).last().click();
  await edit.click();
  await expect(page.getByLabel("마일스톤 4", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "docs/milestone-batch-editor.png",
    fullPage: true,
  });
});

test("web visual viewport resize reveals the focused draft without resetting selection", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "＋ 프로젝트 만들기", exact: true })
    .click();
  await page
    .getByLabel("프로젝트 제목", { exact: true })
    .fill("가상 키보드 검증");
  for (let i = 1; i <= 3; i++) {
    await page
      .getByRole("button", { name: "＋ 마일스톤 추가", exact: true })
      .click();
    await page
      .getByLabel(`마일스톤 ${i}`, { exact: true })
      .fill(`Milestone ${i}`);
  }
  const input = page.getByLabel("마일스톤 3", { exact: true });
  await input.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 5),
  );
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      get: () => 420,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => {
      const rect = await input.boundingBox();
      return rect!.y + rect!.height;
    })
    .toBeLessThanOrEqual(420);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Milestone 3");
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([2, 5]);
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(
      async () =>
        (await page.getByTestId("editor-scroll").boundingBox())!.height,
    )
    .toBeGreaterThan(420);
  await expect(input).toHaveValue("Milestone 3");
});
