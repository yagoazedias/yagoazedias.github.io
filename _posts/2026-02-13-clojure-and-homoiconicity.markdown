---
layout: post
title:  "Clojure and Homoiconicity: When Code Is Data"
date:   2026-02-13 12:00:00 -0300
categories: programming languages
---

If you've spent enough time around Lisps, you've probably heard the phrase *"code is data"*. It sounds like a platitude until you actually experience it. Clojure, a modern Lisp hosted on the JVM, makes this idea tangible through a property called **homoiconicity** — and once you internalize it, it changes how you think about programming languages in general.

## What Homoiconicity Actually Means

A language is homoiconic when its programs are represented using the language's own data structures. In Clojure, source code is made of lists, vectors, maps, and symbols — the same things you manipulate at runtime.

Consider a simple function call:

{% highlight clojure %}
(+ 1 2 3)
{% endhighlight %}

This is both an expression that evaluates to `6` *and* a list containing four elements: the symbol `+` and the integers `1`, `2`, `3`. You can verify this yourself:

{% highlight clojure %}
(def expr '(+ 1 2 3))

(type expr)    ;=> clojure.lang.PersistentList
(first expr)   ;=> +
(rest expr)    ;=> (1 2 3)
(count expr)   ;=> 4
{% endhighlight %}

The `quote` form (`'`) prevents evaluation, giving you the raw data structure. There's no separate AST representation hidden behind a parser — what you write *is* the tree.

## Why This Matters: Macros

Homoiconicity makes Clojure's macro system remarkably straightforward. A macro is just a function that receives code as data, transforms it, and returns new code as data. The compiler evaluates the macro at compile time and replaces the call site with the result.

{% highlight clojure %}
(defmacro unless [condition & body]
  `(if (not ~condition)
     (do ~@body)))

(unless false
  (println "this runs"))
{% endhighlight %}

The backtick (`` ` ``) is syntax-quote, `~` unquotes a value, and `~@` splices a sequence. But underneath the syntactic sugar, you're simply building a list. The equivalent without syntax-quote would be:

{% highlight clojure %}
(defmacro unless [condition & body]
  (list 'if (list 'not condition)
    (cons 'do body)))
{% endhighlight %}

No string templates, no special AST builder API — you construct code with the same `list` and `cons` you use for everyday data manipulation.

## The Reader: Where It All Starts

Clojure's evaluation model has two distinct phases that make homoiconicity work cleanly:

1. **Reading** — The reader converts text into Clojure data structures
2. **Evaluation** — The evaluator walks those data structures and produces results

This separation is powerful. You can hook into the reader to parse custom literals, or you can skip the reader entirely and construct data structures programmatically. Either way, the evaluator sees the same thing.

{% highlight clojure %}
;; These are equivalent:
(eval '(+ 1 2))
(eval (list '+ 1 2))
{% endhighlight %}

## A Practical Example: Domain-Specific Queries

Suppose you want a small DSL for filtering users:

{% highlight clojure %}
(defmacro where [field op value]
  `(fn [record#]
     (~op (~field record#) ~value)))

(def users [{:name "Alice" :age 30}
            {:name "Bob"   :age 25}
            {:name "Carol" :age 35}])

(filter (where :age > 28) users)
;=> ({:name "Alice", :age 30} {:name "Carol", :age 35})
{% endhighlight %}

The `where` macro rewrites `(where :age > 28)` into an anonymous function at compile time. No runtime overhead, no interpreter, no query parser. The DSL compiles down to the same bytecode you'd write by hand.

## The Trade-Off

Homoiconicity is not free. Lisp syntax is polarizing precisely because the uniform structure that enables macros also means you lose the visual variety most languages provide. There are no special forms for `for` loops, `switch` statements, or operator precedence — everything is a parenthesized list.

But that uniformity is the point. When every construct has the same shape, every construct is equally easy to generate, analyze, and transform programmatically. Editor support (like paredit or parinfer) exploits this structural regularity to make navigation and refactoring operate on *expressions* rather than *text*.

## Closing Thoughts

Homoiconicity isn't just a theoretical curiosity. It's the reason Clojure programmers can build `core.async` (Go-style channels), `clojure.spec` (runtime contracts), and `hiccup` (HTML generation) as libraries rather than language features. When code is data, extending the language is just another Tuesday.

If you want to explore further, try Rich Hickey's original talks on Clojure's design — particularly [Simple Made Easy][simple-made-easy] and [Are We There Yet?][are-we-there-yet]. They contextualize why homoiconicity matters within a broader philosophy of simplicity and immutability.

[simple-made-easy]: https://www.infoq.com/presentations/Simple-Made-Easy/
[are-we-there-yet]: https://www.infoq.com/presentations/Are-We-There-Yet-Rich-Hickey/
