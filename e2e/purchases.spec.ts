import { expect, test } from "@playwright/test";
test("web only shows mobile IAP guidance in both background themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/settings");
  for (const mode of ["Dark", "Light"]) {
    await page
      .getByRole("radio", { name: `${mode} 배경`, exact: true })
      .click();
    await expect(
      page.getByRole("radio", { name: `${mode} 배경`, exact: true }),
    ).toBeChecked();
    await expect(
      page.getByText("인앱 결제 테스트는 Android/iOS 앱에서 지원합니다.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "구매 복원", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /테스트 구매/ })).toHaveCount(
      0,
    );
  }
  expect(errors).toEqual([]);
});
