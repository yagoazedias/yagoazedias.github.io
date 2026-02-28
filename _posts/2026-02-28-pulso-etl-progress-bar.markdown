---
title: "Adding a Progress Bar to a Streaming ETL Pipeline"
date: 2026-02-28
tags:
  - clojure
  - etl
  - terminal-ui
permalink: /posts/2026/02/pulso-etl-progress-bar/
---

After [optimizing Pulso's ETL to 4.4 minutes](/posts/2026/02/pulso-etl-performance-optimization/), I realized I had a new problem: staring at a silent terminal for four and a half minutes wondering if anything was happening.

The pipeline had basic progress logging — a line every 100,000 records — but no sense of how far along it was or when it would finish. I wanted a real progress bar with percentages, throughput, and ETA. The catch: this is a **streaming** pipeline. It never knows the total size upfront.

## The Two-Pass Trick

A progress bar needs two numbers: how many you've done and how many there are. In a streaming XML parser, you don't get the second one for free.

The solution is a fast counting pre-pass. Before the real ETL runs, a lightweight StAX scan walks the XML and counts top-level element tags by type — no attribute parsing, no object allocation, just incrementing counters on `START_ELEMENT` events at depth 2:

```clojure
(while (.hasNext sr)
  (let [event (.next sr)]
    (case event
      1 ;; START_ELEMENT
      (do (vswap! depth inc)
          (when (= @depth 2)
            (let [tag (.getLocalName sr)]
              (.put counts tag
                    (unchecked-inc (long (.getOrDefault counts tag 0)))))))
      2 ;; END_ELEMENT
      (vswap! depth dec)
      nil)))
```

This is fast because it skips everything the real parser does — no attribute extraction, no Clojure map construction, no database writes. On a 1.5GB file with 3.4M elements, it finishes in seconds. That's the price of knowing your totals, and it's worth paying.

## The Progress UI

With totals in hand, the ETL now accepts an `:on-element` callback that fires after each element is processed. A progress atom tracks counts per type, and a daemon thread redraws the terminal at 10 FPS:

```
Pulso ETL - Processing exportar.xml
──────────────────────────────────────────────────────────────────────────
  Record          [████████████████████░░░░░░░░░░]  67.3%  2,274,649 / 3,380,043
  Workout         [██████████████████████████████] 100.0%      1,819 / 1,819
  Correlation     [██████████████████████████████] 100.0%          0 / 0
  ActivitySummary [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0.0%        0 / 1,687
──────────────────────────────────────────────────────────────────────────
  Overall: 67.3%  |  2,276,468 / 3,383,549  |  12,055/s  |  ETA 91s  |  3:08
```

The rendering is plain ANSI — cursor-up to reposition, clear-line to overwrite, Unicode block characters for the bar. No external dependencies. Console logging is suppressed while the UI is active, so the two don't fight over stdout.

A `--no-progress` flag brings back the original log output for CI and piped contexts.

## Separating Concerns

The interesting design constraint was keeping the ETL core unaware of the progress UI. The `execute!` function gained a single new option — `:on-element`, a callback — and the rest of the wiring lives outside:

```
count-elements → make-state → start-renderer → execute!(on-element) → stop-renderer
```

The counter, progress state, and renderer are all independent modules. The ETL doesn't know about any of them. It just calls a function after each element, and something upstream decides what that function does.

## Takeaway

Progress bars in streaming pipelines aren't free — you need the total count, which means reading the data twice. But if the counting pass is cheap enough (and it usually is, because counting is always cheaper than processing), the tradeoff is obvious. Four minutes of progress feedback beats four minutes of silence.
