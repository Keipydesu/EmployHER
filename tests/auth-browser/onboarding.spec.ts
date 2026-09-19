import { test, expect } from "@playwright/test";
import { signIn } from "./session";

test("authenticated interests persist, scope account setup, and stay isolated across users", async ({
  browser,
  page,
  context,
}) => {
  await page.goto("/onboarding");
  await expect(
    page.getByRole("link", { name: "Sign in to continue" }),
  ).toBeVisible();
  await signIn(context, "auth0|browser-student-one");
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("button", { name: "Save and continue" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Software Engineering", exact: true })
    .check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goto("/onboarding");
  await expect(
    page.getByRole("checkbox", { name: "Software Engineering", exact: true }),
  ).toBeChecked();
  await page.screenshot({
    path: "test-results/authenticated-interests.png",
    fullPage: true,
  });
  const other = await browser.newContext();
  try {
    await signIn(other, "auth0|browser-student-two");
    const otherPage = await other.newPage();
    await otherPage.goto("/onboarding");
    await expect(
      otherPage.getByRole("checkbox", {
        name: "Software Engineering",
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(
      otherPage.getByRole("button", { name: "Save and continue" }),
    ).toBeDisabled();
  } finally {
    await other.close();
  }
});

test("mobile keyboard setup rejects stale edits, foreign origins and expired sessions", async ({
  page,
  context,
}) => {
  await signIn(context, "auth0|browser-mobile-student");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding");
  const choice = page.getByRole("checkbox", {
    name: "Software Engineering",
    exact: true,
  });
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(choice).toBeChecked();
  await page.screenshot({
    path: "test-results/authenticated-interests-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const stale = await context.request.put(
    "http://127.0.0.1:3101/api/me/interests",
    {
      headers: {
        Origin: "http://127.0.0.1:3101",
        "Idempotency-Key": "stale-browser-test",
      },
      data: { fields: ["ml"], expectedVersion: 0 },
    },
  );
  expect(stale.status()).toBe(409);
  const foreign = await context.request.put(
    "http://127.0.0.1:3101/api/me/interests",
    {
      headers: {
        Origin: "https://foreign.invalid",
        "Idempotency-Key": "foreign-browser-test",
      },
      data: { fields: ["ml"], expectedVersion: 1 },
    },
  );
  expect(foreign.status()).toBe(403);
  await context.clearCookies();
  expect(
    (
      await context.request.get("http://127.0.0.1:3101/api/me/interests")
    ).status(),
  ).toBe(401);
  await page.goto("/career");
  await expect(
    page.getByText("Sign in to view your private résumé-based guidance."),
  ).toBeVisible();
});
