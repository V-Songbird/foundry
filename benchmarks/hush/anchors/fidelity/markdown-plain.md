**The discount test passes again. The rate was taken off twice.**

`applyDiscount` took the rate off the price, then off the total. I removed the second step at `src/discount.js:7`.

`node test.js` passes, 4 of 4, and `node lint.js` is clean.

I did not try prices with more than two decimals.

I kept my notes in `notes.md`.

**Next:** read the change at `src/discount.js:7`.
