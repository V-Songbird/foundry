I started by running `node run-tests.js`. The output is long because it prints every test. There are 625 tests. I read through the failures and they were all in the order totals group. There were 3 of them.

Then I looked at `orderTotal`. It takes the discount off the price and then adds tax. It worked out the tax from the full price instead of the discounted price. One example from the suite: 33400 cents, 10% off, tax 0.2. The right total is 36072. The old code gave 36740.

I changed one line, [pricing.js:41](src/pricing.js:41). Tax now comes from the discounted amount. I did not touch the tests. I did not check anything outside this suite.

I ran `node run-tests.js` again after the change. All 625 pass now, so the suite is green.

Next: open [pricing.js:41](src/pricing.js:41), read the one-line change, and commit it if it looks right to you.
