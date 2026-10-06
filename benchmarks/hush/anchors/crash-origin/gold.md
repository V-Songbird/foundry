**The real cause is [refresh.js:15](src/auth/refresh.js:15). It returns nothing when a refresh token has been revoked, and the crash happens two steps later.**

Nothing was changed. You asked where to look and why.

Here is the chain, in the order it happens:

1. The auth provider rejects the refresh. [crash.txt:4](logs/crash.txt:4) shows the reply: `invalid_grant`, which means the refresh token was revoked.
2. `refreshToken` catches that error. It only knows how to retry two codes, `token_expired` and `clock_skew`. For any other code it does `return undefined`, at [refresh.js:15](src/auth/refresh.js:15).
3. `resumeSession` does not check what came back. It passes that `undefined` straight to `decode`, at [session.js:8](src/session.js:8).
4. `decode` calls `.split` on it, at [tokens.js:6](src/auth/tokens.js:6). That is the error you saw:

```
TypeError: Cannot read properties of undefined (reading 'split')
```

So the stack trace is honest about where it broke, and wrong about where it started. `tokens.js` only fails because `refresh.js` handed it nothing.

One thing worth knowing: leaving `invalid_grant` out of the retry list is on purpose. The comment at [refresh.js:4](src/auth/refresh.js:4) says a revoked token cannot be retried and the user has to sign in again. The bug is only that the code goes quiet instead of saying so.

I read the code and the crash log. I did not run anything.

Next: open [refresh.js:15](src/auth/refresh.js:15). Make that line throw, or return a clear "sign in again" result, instead of `undefined`.
