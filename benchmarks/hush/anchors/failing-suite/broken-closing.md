**The pricing suite is green again. One line was charging tax on the wrong amount.**

Only 3 of the 625 tests were failing, and all 3 were about order totals. The rest of the wall of text was passing tests.

Here is what was wrong. `orderTotal` takes the discount off the price and then adds tax. It worked out the tax from the full price instead of the discounted price. So every discounted order was taxed a little too much.

One example from the suite: 33400 cents, 10% off, tax 0.2. The right total is 36072. The old code gave 36740.

The fix is one line, [pricing.js:41](src/pricing.js:41). Tax now comes from the discounted amount. I did not touch the tests.

I ran `node run-tests.js` again after the change. All 625 pass now. I did not check anything outside this suite.

Let me know if you would like me to look at anything else!
