import { expect, type Page } from "@playwright/test";

// Demo identities map — keep in sync with prisma/seed.ts.  Names are what
// the role-switcher dropdown items render in their <DropdownMenuItem>.
export const DEMO_USERS = {
  employee: "Riya Sharma",
  manager: "Karthik Iyer",
  admin: "Priya Nair",
} as const;

export type DemoRole = keyof typeof DEMO_USERS;

// setRole opens the role-switcher dropdown and clicks the identity that
// matches the requested role.  It then waits until the trigger button
// shows the new name — that's the visible signal the cookie roundtrip
// and revalidation have completed.
export async function setRole(page: Page, role: DemoRole): Promise<void> {
  const name = DEMO_USERS[role];
  const trigger = page.getByRole("button", {
    name: /switch demo identity/i,
  });

  await trigger.click();
  await page
    .getByRole("menuitem")
    .filter({ hasText: name })
    .first()
    .click();

  // The cookie write + revalidate cycle finishes when the trigger now
  // shows the new identity's name.  This avoids brittle networkidle waits.
  await expect(trigger).toContainText(name);
}
