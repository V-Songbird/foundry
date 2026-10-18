**The discount test passes again. The rate was taken off twice.**

---

`applyDiscount` applied a *compound discount*. A compound discount takes the rate off an already reduced price. I removed the second step in [discount.js:7](src/discount.js:7).

`node test.js` passes, 4 of 4, and `node lint.js` is clean.

I did not try prices with more than two decimals.

I kept my notes in [notes.md](notes.md).

---

**Next:** read the change in [discount.js:7](src/discount.js:7).
