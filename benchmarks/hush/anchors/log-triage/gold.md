**Redis went away at 02:14, and everything after that was a chain reaction that took the service down at 02:31.**

In one sentence: without its cache, every request hit the data store directly, the store could not keep up, the backlog grew, and the supervisor finally killed the api.

The chain, in order. Every line is in [app.log](logs/app.log).

| Time | What happened | Line |
|---|---|---|
| 02:14:07 | Redis refuses connections. This is the first error in the log | [app.log:182](logs/app.log:182) |
| 02:14:07 | The api falls back to reading the store directly | [app.log:183](logs/app.log:183) |
| 02:14:10 | First timeout, marked "store overloaded" | [app.log:185](logs/app.log:185) |
| 02:14:12 | The request queue starts to grow: 52 of a 500 cap | [app.log:186](logs/app.log:186) |
| 02:31:24 | The queue is past its cap: 568 | [app.log:714](logs/app.log:714) |
| 02:31:44 | `worker-2` runs out of memory from the backlog | [app.log:717](logs/app.log:717) |
| 02:31:52 | The supervisor kills the api. Service down | [app.log:719](logs/app.log:719) |

The first error, word for word:

```
redis connection lost: connect ECONNREFUSED 10.0.0.12:6379
```

"Connection refused" means the machine answered but nothing was listening on the Redis port. Before 02:14 the log is healthy, all 200 responses. So the timeouts and the memory crash are symptoms. Redis is the cause.

What I cannot tell you from this log: why Redis stopped. The log only shows the api's side of it.

Next: find out what happened to Redis at `10.0.0.12:6379` just before 02:14:07. Bring it back before you restart the api, or the same chain will start again.
