import { test } from "@playwright/test";

// Implemented in H8 once /manager/approvals ships.
test.skip("manager approves a submitted goal sheet", async () => {
  // Plan:
  //   1. setRole(page, 'manager')
  //   2. goto /manager/approvals
  //   3. open Aditya's submitted sheet (seeded SUBMITTED)
  //   4. inline-edit a weightage, assert sum-100 still passes
  //   5. click "Approve" → confirm dialog → confirm
  //   6. expect sheet status to flip to LOCKED, employee to see locked state
});
