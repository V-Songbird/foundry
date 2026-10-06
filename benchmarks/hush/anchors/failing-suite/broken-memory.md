## ✅ Result

**The pricing suite is green again. One line was charging tax on the wrong amount.**

## 🔎 Details

- Only 3 of the 625 tests were failing
- and all 3 were about order totals
- **The rest** of the wall of text was **passing tests**

- `orderTotal` takes the discount off the price and then adds tax
- because it worked out the tax from the **full price**
- so every discounted order was taxed a little too much

| Thing | Note |
|---|---|
| Example | 33400 cents, 10% off, tax 0.2 |
| Right total | 36072 |
| Fix | one line |
| Tests | I did not touch them |

I ran `node run-tests.js` again after the change. All 625 pass now. I did not check anything outside this suite.

Next: open the pricing file, read the one-line change, and commit it if it looks right to you.

Files: src/pricing.js (line 41)
