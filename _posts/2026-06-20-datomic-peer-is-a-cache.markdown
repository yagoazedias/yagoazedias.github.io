---
title: "The Datomic Peer Is a Cache. Here's What That Means Under Load"
date: 2026-06-20
tags:
  - clojure
  - datomic
  - database
  - load-testing
permalink: /posts/2026/06/datomic-peer-is-a-cache/
---

A few days ago I was running a Datomic load test. Nothing fancy — a Clojure
application using the Datomic Peer library, backed by a PostgreSQL Transactor,
with [Locust](https://locust.io) driving HTTP requests against a Ring API. I had
just replaced the fixed step load shape with an infinite ramp: +100 users every
30 seconds, starting from 1.

After about 25 minutes, the host Windows machine hit 89% CPU and 87% memory.
The `VmmemWSL` process — the WSL2 VM running all my Docker containers — was
consuming 15.5 GB of RAM. Locust was showing ~2,500 active users, a hard plateau
at ~500 requests per second, and p50 response times that had climbed from
~10 ms to over 25,000 ms.

I hadn't changed the data schema. I hadn't changed the query logic. I had just
added more users. So why was the machine running out of memory?

## The Investigation

The first thing I did was check what was actually consuming memory. `docker stats`
showed both JVM containers near their heap ceilings, so I went deeper with
`ps aux` inside each container.

The numbers were striking:

| Container    | Real memory (RSS) | Configured heap  |
|--------------|-------------------|------------------|
| `benchmark`  | ~8.5 GB           | `-Xms2g -Xmx8g`  |
| `transactor` | ~2.6 GB           | `-Xms4g -Xmx8g`  |
| **Total JVMs** | **~11 GB**      |                  |

The `benchmark` container — the Clojure application that uses the Datomic Peer
library — had nearly filled its entire 8 GB heap. This wasn't an OOM kill; the
JVM was still running. It wasn't a memory leak; the heap was filling with live
objects that the garbage collector considered reachable and useful.

The heap was full because it was supposed to be full. I just hadn't understood
why yet.
