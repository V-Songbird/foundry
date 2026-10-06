**Deploy `dep-4471` starved the gateway's connection pool at 02:14. It is still failing. Roll it back.**

In one sentence: a config change made the gateway hold one pool connection for every request, the pool only has 20, so it ran dry and requests got a 503.

You asked for six things. Here they are in your order.

**1. When it started, and the error word for word.** The first failure is at `2026-03-14T02:14:18.972Z`, at [gateway.log:616](logs/gateway.log:616):

```
2026-03-14T02:14:18.972Z ERROR access  req-07401 /v1/cart -> billing-svc 503 659ms
2026-03-14T02:14:18.972Z ERROR pool    req-07401 ERR_POOL_EXHAUSTED acquiring connection from pool (size 20, in_use 20, waiting 13)
```

**2. The pool, before and after.** "Waiting" means requests queued for a free connection.

| When | In use | Idle | Waiting | Line |
|---|---|---|---|---|
| 02:10:58, before | 10 | 10 | 0 | [gateway.log:585](logs/gateway.log:585) |
| 02:15:58, after | 20 | 0 | 12 | [gateway.log:641](logs/gateway.log:641) |
| 03:55:58, latest | 20 | 0 | 172 | [gateway.log:1963](logs/gateway.log:1963) |

The pool never gets a free connection back.

**3. The deploy that lines up.** `dep-4471` shipped to the gateway from 02:12 to 02:14, see [deploys.csv:5](deploys.csv:5). Its config landed at 02:13:41 and flipped `gateway.pool.perRequest` from false to true, see [gateway.log:612](logs/gateway.log:612). The first 503 came about 38 seconds later. I worked that gap out from the two timestamps.

The other deploys are red herrings:

| Deploy | Why it is not the cause |
|---|---|
| `dep-4468`, `dep-4469` | Hours earlier, on other services |
| `dep-4470` worker | Over an hour earlier, and the workers never failed |
| `dep-4472` billing, `dep-4473` catalog | Shipped after the failures had already begun |

**4. Workers.** Gateway only. [worker.log](logs/worker.log) shows 1080 jobs finished ok and 0 errors, right through the incident.

**5. Impact.** It runs from 02:14:18Z to the last log line at 03:59:27Z, about 1 hour 45 minutes, and it is not over. I counted 530 failed requests. That is this node only, and the log header says it is node 3 of 3. I did not look at the other two nodes.

**6. Do this now.** Roll back `dep-4471`, or set `gateway.pool.perRequest` back to `false`.

Remember three things: the cause is `dep-4471`, the workers are fine, and it is still failing.

Next: roll back `dep-4471`. Then watch `waiting` in the pool stats lines. It should fall back to 0.
