**The discount test passes again. The rate was taken off twice.**

---

**Cause**
`applyDiscount` took the rate off the price, then off the total.

**Changes**
I removed the second step in [discount.js:7](src/discount.js:7).

**Checks**
`node test.js` passes, 4 of 4, and `node lint.js` is clean.

**Warnings**
I did not try prices with more than two decimals.

**Notes**
I kept my notes in [notes.md](notes.md).

---

**Next step**
Read the change in [discount.js:7](src/discount.js:7).
