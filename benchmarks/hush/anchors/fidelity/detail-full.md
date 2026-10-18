**The discount test passes again. The rate was taken off twice.**

---

`applyDiscount` took the rate off the price, then off the total. So a 10% discount on 100 returned 81, not 90. I removed the second step in [discount.js:7](src/discount.js:7).

The two failing cases settled it. Both had a rate between 0% and 100%. A double discount changes only those prices. At 0% and 100% it gives the same result as one discount.

I ruled out rounding first. The rounding step sits on the last line and runs once. It cannot turn 90 into 81.

I also ruled out the test data. Each expected price matches a single discount by hand. For 80 at 25%, one discount gives 60.

`node test.js` passes, 4 of 4, and `node lint.js` is clean.

I did not try prices with more than two decimals. The test has no such case.

I kept my notes in [notes.md](notes.md).

---

**Next:** read the change in [discount.js:7](src/discount.js:7).
