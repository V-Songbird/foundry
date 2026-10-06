**The pricing suite is green again. One line was charging tax on the wrong amount.**

Only 3 of the 625 test cases were failing, all within the order-totals describe block. The remaining stdout was passing assertions.

The defect was a tax-base miscalculation. `orderTotal` applies the rebate to the gross and subsequently accrues the levy, but the levy was being derived from the pre-rebate gross rather than the post-rebate net, resulting in systematic over-taxation of every marked-down order.

A representative fixture: 33400 cents, 10% markdown, 0.2 rate. Expected 36072, actual 36740.

Remediation is a one-line diff at [pricing.js:41](src/pricing.js:41), rebasing the levy computation onto the net amount. The spec files were not modified.

Post-patch, `node run-tests.js` was re-executed, yielding 625 passing. Nothing beyond this harness was validated.

Next: open [pricing.js:41](src/pricing.js:41), read the one-line change, and commit it if it looks right to you.
