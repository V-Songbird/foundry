**The discount test passes again, because the rate is now taken off only once.**

---

`applyDiscount` took the rate off the price and then took it off the reduced total a second time. I removed that second step in [discount.js:7](src/discount.js:7), so each price now gets one discount.

`node test.js` passes, 4 of 4, and `node lint.js` reports no problems in the one source file.

I did not try prices with more than two decimals, because the test has no such case.

I kept my notes in [notes.md](notes.md).

---

**Next:** read the one-line change in [discount.js:7](src/discount.js:7) and commit it if it looks right.
