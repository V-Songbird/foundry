**The pricing suite is green again. One line was charging tax on the wrong amount.**

Of the 625 tests only 3 were failing, all of them order totals, which, given that `orderTotal` takes the discount off the price and then adds tax but worked the tax out from the full price rather than the discounted one, meant that every discounted order, unless its discount was zero or its tax rate was zero, in which case the two amounts match, was taxed slightly too much, for instance 33400 cents at 10% off with tax 0.2 giving 36740 where 36072 is right.

The fix, which is one line at [pricing.js:41](src/pricing.js:41) and which makes the tax come from the discounted amount, left the tests untouched, and after it, when I ran `node run-tests.js` again, all 625 passed, although I did not check anything outside this suite.

Next: open [pricing.js:41](src/pricing.js:41), read the one-line change, and commit it if it looks right to you.
