import { test } from "@playwright/test";

// Implemented in H7 once /employee/goal-sheet ships.
test.skip("employee creates and submits a goal sheet", async () => {
  // Plan:
  //   1. setRole(page, 'employee')
  //   2. goto /employee/goal-sheet
  //   3. fill three goals across two thrust areas, weightages summing to 100
  //   4. assert sum-100 banner is green and submit button is enabled
  //   5. click submit → confirm dialog → confirm
  //   6. expect redirect or banner showing sheet is SUBMITTED
});
