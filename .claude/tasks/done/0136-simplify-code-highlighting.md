## Problem to solve

The web implementation has too many different logics for code highlighting :

* various `<pre class="">` and `<code class="...">`
* highlightAll
* highlightAllJS
* highlightCodeBlocks

## Idea

Let's simplify that.

- We should always use something like `<pre class="language-xxx"><code></code></pre>`
- We would also support `<code class="language-xxx">` if `<pre>` cannot be used in
  some components
- We would have only one js logic to highlight all `.language-xxx`, and nothing else.

Refactor.
