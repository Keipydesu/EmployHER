import { expect, test } from "@playwright/test";

test("judge walkthrough stays local, traces evidence, persists progress, and resets", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Add testing as sample self-reported experience",
    })
    .check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-profile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Build my sample plan" }).click();
  await expect(
    page.getByText("You also added testing experience.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Why this step?" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Sample ML internship A:", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Make it happen" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "+ Save this step", exact: true })
    .first()
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-plan.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "See my saved steps" }).click();
  await page
    .getByRole("checkbox", {
      name: "Mark Give your model a proper report card complete",
    })
    .check();
  await expect(
    page.getByRole("heading", { name: "1 of 1 steps completed" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Demo workspace" })
    .getByRole("button", { name: "Saved steps" })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 of 1 steps completed" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-saved.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(
    page.getByRole("heading", { name: "1 of 1 steps completed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "Reset sample", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Add testing as sample self-reported experience",
    }),
  ).not.toBeChecked();
  await page
    .getByRole("navigation", { name: "Demo workspace" })
    .getByRole("button", { name: "Saved steps" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next step is yours to choose." }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test("field switching changes recommendations and enforces a three-step plan", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Build my sample plan" }).click();
  for (let index = 0; index < 3; index++)
    await page
      .getByRole("button", { name: "+ Save this step", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: "Software engineering", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make your study-group app dependable" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "+ Save this step", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText(
    "save up to three steps",
  );
  await page.getByRole("button", { name: "See my saved steps" }).click();
  await page
    .getByRole("button", {
      name: "Remove Give your model a proper report card",
    })
    .click();
  await page
    .getByRole("navigation", { name: "Demo workspace" })
    .getByRole("button", { name: "Career plan" })
    .click();
  await page
    .getByRole("button", { name: "+ Save this step", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "See my saved steps" }).click();
  await expect(
    page.getByRole("heading", { name: "0 of 3 steps completed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Make your study-group app dependable" }),
  ).toBeVisible();
});

test("mobile supports keyboard navigation, dialogs, and every view without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to demo content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Build my sample plan" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Why this step?" }).first().click();
  await expect(
    page.getByRole("button", { name: "Close step details" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Why this step?" }).first(),
  ).toBeFocused();
  for (const name of ["Saved steps", "Your story", "Career plan"]) {
    await page
      .getByRole("navigation", { name: "Demo workspace" })
      .getByRole("button", { name })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("unavailable browser storage does not prevent exploring the demo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/demo");
  await expect(
    page.getByText("Browser storage is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Build my sample plan" }).click();
  await page
    .getByRole("button", { name: "+ Save this step", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "See my saved steps" }).click();
  await expect(
    page.getByRole("heading", { name: "0 of 1 steps completed" }),
  ).toBeVisible();
});

test("homepage opens the demo on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const entry = page
    .getByRole("link", { name: "Try the demo", exact: false })
    .first();
  await expect(entry).toBeVisible();
  const bounds = await entry.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await entry.click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
});
