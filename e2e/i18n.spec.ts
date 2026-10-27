import { expect, test } from "@playwright/test";

test("language, themes and user-authored projects persist independently", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "＋ 프로젝트 만들기", exact: true })
    .click();
  await page
    .getByLabel("프로젝트 제목", { exact: true })
    .fill("사용자가 쓴 제목 그대로");
  await page
    .getByRole("button", { name: "＋ 마일스톤 추가", exact: true })
    .click();
  await page.getByLabel("마일스톤 1", { exact: true }).fill("사용자 마일스톤");
  await page
    .getByRole("button", { name: "프로젝트 저장", exact: true })
    .click();
  await expect(page.getByLabel("프로젝트 제목", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByRole("radio", { name: "Dark 배경", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Dark 배경", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "purple 테마", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "purple 테마", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByText("Make Finish Coach your own", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("radio", { name: "Dark background", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "purple theme", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByText("사용자가 쓴 제목 그대로", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "○ 사용자 마일스톤", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => ["ko-KR"],
    });
    window.dispatchEvent(new Event("languagechange"));
  });
  await expect(
    page.getByText("Make Finish Coach your own", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "한국어", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("radio", { name: "Dark 배경", exact: true }),
  ).toBeChecked();
});

test("automatic language updates preserve an open draft and selection", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "＋ 프로젝트 만들기", exact: true })
    .click();
  const field = page.getByLabel("프로젝트 제목", { exact: true });
  await field.fill("Keep this draft");
  await field.evaluate((element: HTMLInputElement) =>
    element.setSelectionRange(2, 7),
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => ["en-US"],
    });
    window.dispatchEvent(new Event("languagechange"));
  });
  const translated = page.getByLabel("Project title", { exact: true });
  await expect(translated).toHaveValue("Keep this draft");
  await expect(translated).toBeFocused();
  expect(
    await translated.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([2, 7]);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(page.getByLabel("Project title", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Keep this draft", { exact: true }),
  ).toBeVisible();
});

test.describe("English device language", () => {
  test.use({ locale: "en-US" });
  test("all major screens and editable errors use English on narrow and wide layouts", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByText("Ready to finish one thing today?", { exact: true }),
    ).toBeVisible();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of [
        "Today",
        "Routines",
        "History",
        "Statistics",
        "Projects",
        "Settings",
      ]) {
        const button = page.getByRole("button", { name, exact: true });
        await button.click();
        await expect(button).toHaveAttribute("aria-current", "page");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page
      .getByRole("button", { name: "＋ Create project", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await expect(
      page.getByText("Enter a project title.", { exact: true }).last(),
    ).toBeVisible();
    await page
      .getByLabel("Project title", { exact: true })
      .fill("English project");
    await page
      .getByRole("button", { name: "＋ Add milestone", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await expect(
      page.getByText("Enter a name for milestone 1.", { exact: true }).last(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("radio", { name: "Dark background", exact: true })
      .click();
    await expect(
      page.getByRole("radio", { name: "Dark background", exact: true }),
    ).toBeChecked();
    await page
      .getByText(
        "In-app purchase testing is available in the Android and iOS apps.",
        { exact: true },
      )
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/i18n-settings-en-dark.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await page.screenshot({ path: "docs/i18n-today-en.png", fullPage: true });
  });
});

test.describe("unsupported device language", () => {
  test.use({ locale: "fr-FR" });
  test("falls back to English", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Ready to finish one thing today?", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
