import { test, expect } from "@playwright/test";
import { signIn } from "./session";
import { syntheticPdf } from "../../src/profile/demo-pdf";
import { resumeFixtures } from "../../src/profile/fixtures";

test("personal upload starts with PDF and requires a file and processing consent", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.PERSONAL_RESUME_ENABLED !== "true",
    "Requires explicit local personal-upload mode; uses synthetic data only.",
  );
  await signIn(context, "auth0|browser-upload-student");
  await page.goto("/onboarding");
  await page
    .getByRole("checkbox", { name: "Software Engineering", exact: true })
    .check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const submit = page.getByRole("button", { name: "Review my experience" });
  await expect(
    page.getByRole("button", { name: "Upload PDF", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Choose your text-based résumé PDF").setInputFiles({
    name: "synthetic-resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(syntheticPdf(resumeFixtures[0].text)),
  });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox", { name: /I agree to send/ }).check();
  await expect(submit).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/resume-personal-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/resume-personal-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Résumé text/ })).toBeEmpty();
  await expect(submit).toBeDisabled();
  await page
    .getByRole("button", { name: "Sample résumé", exact: true })
    .click();
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Résumé text/ })).toHaveValue(
    resumeFixtures[0].text,
  );
});
