import { test, expect } from "@playwright/test";
import { signIn } from "./session";
import { careerFixture } from "./career-fixture";

test("career UI explains provider failure, saves a sourced step and records completion without new evidence", async ({
  page,
  context,
}) => {
  await signIn(context, "auth0|career-ui-student");
  const fixture = await careerFixture();
  let failAnalysis = true;
  let failInitialLoad = true;
  const commands: Record<string, unknown>[] = [];
  await page.route("**/api/me/memory", (route) =>
    route.fulfill({
      json: { configured: false, enabled: false, status: "disabled" },
    }),
  );
  await page.route("**/api/career**", async (route) => {
    const request = route.request();
    if (request.method() === "GET" && failInitialLoad) {
      await route.fulfill({
        status: 503,
        json: { error: { message: "Synthetic context unavailable." } },
      });
      return;
    }
    if (request.url().endsWith("/analyze")) {
      if (failAnalysis) {
        failAnalysis = false;
        await route.fulfill({
          status: 503,
          json: {
            error: { message: "Synthetic provider unavailable. Please retry." },
          },
        });
        return;
      }
      fixture.analyze();
    } else if (request.method() === "POST") {
      const body = request.postDataJSON();
      expect(body.profileId).toBe(fixture.profileId);
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      commands.push(body.command);
      fixture.command(body.command);
    }
    await route.fulfill({ json: await fixture.view() });
  });
  await page.goto(`/career?profileId=${fixture.profileId}&profileVersion=1`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Synthetic context unavailable",
  );
  failInitialLoad = false;
  await page.getByRole("button", { name: "Reload career plan" }).click();
  await expect(page.getByLabel("Field to explore")).toHaveValue("software");
  await page
    .getByRole("navigation", { name: "Career plan sections" })
    .getByRole("link", { name: "Saved steps", exact: true })
    .click();
  await expect(page).toHaveURL(/#saved-steps$/);
  await page
    .getByRole("button", { name: "Find my next steps with Gemini" })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Synthetic provider unavailable",
  );
  await expect(
    page.getByRole("heading", { name: "Context from this field" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Find my next steps with Gemini" })
    .click();
  await expect(
    page.getByText(
      "This is a possible direction to explore, not a claim that you lack the skill.",
    ),
  ).toBeVisible();
  await page.getByText("Why this suggestion?", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View source", exact: true }),
  ).toHaveAttribute("href", /^https:\/\//);
  await page.getByRole("button", { name: "Save this next step" }).click();
  expect(commands[0]).toMatchObject({
    kind: "select-recommendation",
    contextHash: fixture.contextHash,
    index: 0,
    expectedVersion: 0,
  });
  await expect(
    page.getByRole("button", { name: "Save this next step" }),
  ).toBeDisabled();
  await page.reload();
  const saved = page.getByRole("region", { name: "Saved next steps" });
  await expect(
    saved.getByRole("heading", { name: "Build a small tested project" }),
  ).toBeVisible();
  const evidenceBefore = (await fixture.view()).profile.evidence;
  await saved.getByRole("button", { name: "Mark complete" }).click();
  await expect(saved.getByText("Completed", { exact: true })).toBeVisible();
  expect((await fixture.view()).profile.evidence).toEqual(evidenceBefore);
  await page.screenshot({
    path: "test-results/authenticated-career.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/authenticated-career-mobile.png",
    fullPage: true,
  });
  await saved.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    saved.getByText("Save a recommendation above to start your plan."),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Women-focused mentorship and organizations",
    })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Women-focused mentorship and organizations",
    }),
  ).toBeChecked();
  expect(commands.at(-1)).toMatchObject({
    kind: "preferences",
    preferences: { inclusion: ["women"] },
  });
  await expect(
    page.getByRole("button", { name: "Find my next steps with Gemini" }),
  ).toBeVisible();
  await page.getByLabel("Field to explore").selectOption("ml");
  await expect(page.getByLabel("Field to explore")).toHaveValue("ml");
  const checkpoint = (await fixture.view()).guidance.checkpoints.find(
    (c) => c.state === "needs_clarification",
  )!;
  expect(checkpoint).toBeTruthy();
  const evidenceCount = await page
    .getByRole("progressbar", { name: "Reviewed skill evidence coverage" })
    .getAttribute("value");
  await page
    .getByRole("button", {
      name: `Confirm I want to learn ${checkpoint.skill}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/you chose this as a learning need/),
  ).toBeVisible();
  expect(commands.at(-1)).toMatchObject({
    kind: "confirm-gap",
    skill: checkpoint.skill,
  });
  await expect(
    page.getByRole("progressbar", { name: "Reviewed skill evidence coverage" }),
  ).toHaveAttribute("value", evidenceCount!);
  await page.screenshot({
    path: "test-results/authenticated-learning-mobile.png",
    fullPage: true,
  });
});
