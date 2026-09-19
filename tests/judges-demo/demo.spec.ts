import { expect, test } from "@playwright/test";

test("judge walkthrough stays local, traces evidence, persists progress, and connects with peers", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Julia Thomas", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Your experience, in focus.")).toBeVisible();
  expect(await page.locator(".jd-paper").innerText()).not.toMatch(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/i,
  );
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "I have a shareable demo (self-reported)",
    })
    .check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-profile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Build my plan" }).click();
  await expect(
    page.getByText("You have a shareable demo.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open the work plan" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("ML research role:", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Make it happen" }),
  ).toBeVisible();
  await expect(
    dialog.getByText("split-manifest.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "You’re done when" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "scikit-learn: cross-validation" }),
  ).toHaveAttribute(
    "href",
    "https://scikit-learn.org/stable/modules/cross_validation.html",
  );
  await dialog.getByRole("checkbox").first().check();
  await expect(
    dialog.getByText("1 of 5 tasks checked", { exact: false }),
  ).toBeVisible();
  await dialog.screenshot({
    path: "docs/screenshots/judges-demo-work-plan.png",
  });
  await dialog
    .getByRole("heading", { name: "You’re done when" })
    .scrollIntoViewIfNeeded();
  await dialog.screenshot({
    path: "docs/screenshots/judges-demo-deliverables.png",
  });
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
      name: "Mark Package a reproducible sensor-fault benchmark complete",
    })
    .check();
  await expect(
    page.getByRole("heading", { name: "1 of 1 steps completed" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Workspace" })
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
  await page.getByRole("button", { name: "Open step-by-step guide" }).click();
  await expect(dialog.getByRole("checkbox").first()).toBeChecked();
  await page.keyboard.press("Escape");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my detailed plan" }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("employher-next-steps.txt");
  const stream = await download.createReadStream();
  let contents = "";
  for await (const chunk of stream!) contents += chunk.toString();
  expect(contents).toContain("[x] Create split-manifest.csv");
  expect(contents).toContain("DONE WHEN:");
  expect(contents).toContain(
    "https://scikit-learn.org/stable/modules/cross_validation.html",
  );
  await expect(page.getByRole("button", { name: "Reset demo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Meet similar peers" }).click();
  await expect(page.getByRole("heading", { name: "Priya Shah" })).toBeVisible();
  await page
    .getByRole("button", { name: "Software engineering", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Amara Lewis" }),
  ).toBeVisible();
  await expect(page.getByText("amara.lewis@example.com")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/workspace-connect-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/workspace-connect-mobile.png",
    fullPage: true,
  });
  expect(apiRequests).toEqual([]);
});

test("field switching changes recommendations and enforces a three-step plan", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Build my plan" }).click();
  for (let index = 0; index < 3; index++)
    await page
      .getByRole("button", { name: "+ Save this step", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: "Software engineering", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Prove your background jobs handle failure",
    }),
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
      name: "Remove Package a reproducible sensor-fault benchmark",
    })
    .click();
  await page
    .getByRole("navigation", { name: "Workspace" })
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
    page.getByRole("heading", {
      name: "Prove your background jobs handle failure",
    }),
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
    page.getByRole("link", { name: "Skip to workspace content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Build my plan" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/judges-demo-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open the work plan" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Close step details" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open the work plan" }).first(),
  ).toBeFocused();
  for (const name of ["Saved steps", "Your story", "Career plan"]) {
    await page
      .getByRole("navigation", { name: "Workspace" })
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
  await page.getByRole("button", { name: "Build my plan" }).click();
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
    .getByRole("link", { name: "Open my workspace", exact: false })
    .first();
  await expect(entry).toBeVisible();
  const bounds = await entry.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "docs/screenshots/home-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await entry.click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
});
