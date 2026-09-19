import { test, expect } from "@playwright/test";
import { resumeFixtures } from "../../src/profile/fixtures";
import { syntheticPdf } from "../../src/profile/demo-pdf";
test("review, correct, confirm, reload, and inspect supported résumé suggestions", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Start sample session" }).click();
  await expect(
    page.getByRole("button", { name: "Review my experience" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/profile-empty.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm reviewed profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Skill", exact: true }).first(),
  ).toHaveValue("Python");
  await page
    .getByRole("textbox", { name: "Skill", exact: true })
    .first()
    .fill("Python basics");
  await expect(
    page.getByText("User-reported", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm reviewed profile" }).click();
  await expect(
    page.getByText("Demo embedding prepared — not usable for real matching."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Find résumé suggestions" }).click();
  await expect(
    page.getByRole("textbox", { name: "Editable résumé draft" }),
  ).toHaveValue("Cleaned survey data with Python and wrote SQL queries.");
  await page.getByRole("button", { name: "Accept draft" }).click();
  await expect(page.getByRole("button", { name: "Selected ✓" })).toBeVisible();
  await page.screenshot({
    path: "test-results/profile-reviewed.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Skill", exact: true }).first(),
  ).toHaveValue("Python basics");
  await page
    .getByRole("textbox", { name: "Skill", exact: true })
    .first()
    .fill("Python");
  await expect(
    page.getByRole("button", { name: "Find résumé suggestions" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/v3 · DRAFT/)).toBeVisible();
});
test("sample PDF upload works and no-evidence case shows a recoverable error", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Start sample session" }).click();
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click();
  await page.getByLabel("Choose a text-based sample PDF").setInputFiles({
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(syntheticPdf(resumeFixtures[0].text)),
  });
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm reviewed profile" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sample résumé", exact: true })
    .click();
  await page.getByRole("radio", { name: /Empty evidence case/ }).check();
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "No supported skills",
  );
});
test("mobile layout stays within viewport and rejects nonfixture intake", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Start sample session" }).click();
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByLabel("Sample résumé text")
    .fill(
      "This is arbitrary input which is not an approved synthetic fixture.",
    );
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(page.locator(".error[role=alert]")).toContainText(
    "Use a supplied synthetic résumé",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/profile-mobile.png",
    fullPage: true,
  });
});

test("retry after a lost response reuses the completed intake operation", async ({
  page,
}) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Start sample session" }).click();
  let first = true;
  let firstProfileId = "";
  const keys: string[] = [];
  await page.route("**/api/resumes", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    const response = await route.fetch();
    if (first) {
      first = false;
      firstProfileId = (await response.json()).profileId;
      await route.abort("failed");
    } else {
      expect((await response.json()).profileId).toBe(firstProfileId);
      await route.fulfill({ response });
    }
  });
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(page.locator(".error[role=alert]")).toBeVisible();
  await page.getByRole("button", { name: "Review my experience" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm reviewed profile" }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("profile and Opportunities keep independent layouts in the shared app", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page.locator("main.profile-workspace")).toHaveCSS(
    "display",
    "block",
  );
  await page.getByRole("link", { name: /employHER/ }).click();
  await page.getByRole("link", { name: "Opportunities", exact: true }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.locator(".workspace")).toHaveCSS("display", "grid");
});
