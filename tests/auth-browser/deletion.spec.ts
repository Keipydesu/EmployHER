import { test, expect } from "@playwright/test";
import { signIn } from "./session";

test("deletion requires confirmation, survives reload and immediately blocks private work", async ({
  page,
  context,
  browser,
}) => {
  await signIn(context, "auth0|delete-browser-student");
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Delete my data", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I understand that deleting my saved work cannot be undone.",
    })
    .check();
  await page
    .getByRole("button", { name: "Delete my data", exact: true })
    .click();
  await expect(page.getByText(/Deletion pending/)).toBeVisible();
  const statusResponse = await context.request.get(
    "http://127.0.0.1:3101/api/me/data",
  );
  expect(statusResponse.status()).toBe(200);
  const status = await statusResponse.json();
  expect(status.status).toBe("pending");
  await page.reload();
  await expect(page.getByText(/Deletion pending/)).toBeVisible();
  await page.getByRole("button", { name: "Refresh deletion status" }).click();
  await expect(page.getByText(/Deletion pending/)).toBeVisible();
  expect(
    (
      await context.request.get("http://127.0.0.1:3101/api/me/interests")
    ).status(),
  ).toBe(403);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/account$/);
  const other = await browser.newContext();
  try {
    await signIn(other, "auth0|other-delete-browser-student");
    expect(
      (
        await other.request.get(
          `http://127.0.0.1:3101/api/deletions/${status.deletionId}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      await (
        await other.request.get("http://127.0.0.1:3101/api/me/data")
      ).json(),
    ).toBeNull();
  } finally {
    await other.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/account-deletion-mobile.png",
    fullPage: true,
  });
});
