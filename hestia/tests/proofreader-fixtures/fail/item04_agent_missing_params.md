---
name: review-pr
description: Reviews a pull request by dispatching a code-review subagent.
---

# Review PR

Dispatch a code-review subagent to analyze the diff:

```
Agent({
  prompt: "Review the current git diff for correctness and style issues. Report findings as a bulleted list."
})
```

Wait for the subagent to finish, then present its findings to the user.
