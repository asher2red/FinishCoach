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

test("background mode and all six accents persist independently of OS appearance", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const mode = (name: string) =>
    page.getByRole("radio", { name: `${name} 배경`, exact: true });
  await expect(mode("Light")).toBeChecked();
  const background = page.getByText("배경 테마", { exact: true });
  const accents = page.getByText("메뉴 컬러 테마", { exact: true });
  expect((await background.boundingBox())!.y).toBeLessThan(
    (await accents.boundingBox())!.y,
  );
  for (const name of ["Dark", "Light"]) {
    await mode(name).click();
    const expected = name === "Dark" ? "rgb(17, 23, 37)" : "rgb(247, 248, 250)";
    await expect(page.getByTestId("app-shell").first()).toHaveCSS(
      "background-color",
      expected,
    );
    for (const color of ["red", "blue", "green", "orange", "purple", "black"]) {
      const choice = page.getByRole("radio", {
        name: `${color} 테마`,
        exact: true,
      });
      await choice.click();
      await expect(choice).toBeChecked();
      await expect(mode(name)).toBeChecked();
      await expect(page.getByTestId("app-shell").first()).toHaveCSS(
        "background-color",
        expected,
      );
    }
    await page.reload();
    await expect(mode(name)).toBeChecked();
    await expect(
      page.getByRole("radio", { name: "black 테마", exact: true }),
    ).toBeChecked();
    await page.emulateMedia({
      colorScheme: name === "Dark" ? "light" : "dark",
    });
    await expect(mode(name)).toBeChecked();
    await expect(page.locator("html")).toHaveCSS(
      "color-scheme",
      name.toLowerCase(),
    );
  }
  await mode("Dark").click();
  await page.getByRole("radio", { name: "green 테마", exact: true }).click();
  await page.screenshot({
    path: "docs/background-dark-settings.png",
    fullPage: true,
  });
  for (const route of [
    "/",
    "/routines",
    "/history",
    "/statistics",
    "/projects",
    "/settings",
  ]) {
    await page.goto(route);
    await expect(page.getByTestId("app-shell").first()).toHaveCSS(
      "background-color",
      "rgb(17, 23, 37)",
    );
  }
  await page.goto("/routines");
  await page
    .getByRole("button", { name: "＋ 루틴 만들기", exact: true })
    .click();
  const field = page.getByLabel("활동 이름 (직접 추가 가능)");
  await field.fill("테마 검증 초안");
  await expect(field).toHaveCSS("background-color", "rgb(28, 37, 53)");
  await page.getByRole("button", { name: "시작일 선택", exact: true }).click();
  await expect(page.getByTestId("picker-panel")).toHaveCSS(
    "background-color",
    "rgb(38, 50, 71)",
  );
  await page.screenshot({
    path: "docs/background-dark-picker.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(field).toHaveValue("테마 검증 초안");
  await page.getByRole("button", { name: "닫기", exact: true }).last().click();
  await page.goto("/settings");
  await mode("Light").click();
  await page.screenshot({
    path: "docs/background-light-settings.png",
    fullPage: true,
  });
});
