**The discount test passes again. The rate was taken off twice.**

**Next:** read the change in [discount.js:7](src/discount.js:7).

---

`applyDiscount` took the rate off the price, then off the total. I removed the second step there.

`node test.js` passes, 4 of 4, and `node lint.js` is clean.

I did not try prices with more than two decimals.

I kept my notes in [notes.md](notes.md).
