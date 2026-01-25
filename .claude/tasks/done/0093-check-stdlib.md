## Problem to solve

Now that we have Tuples and Datapaths, I'd like to make sure we have the stdlib
that allows maniputalting them easily (immutable, though).

## Idea

- Check that the stdlib contains necessary functions to manipulate complex data
  structures easly, using Datapath where they help.
- Complete stdlib with missing functions.
- Take it as an opportunity to check the whole stdlib for completeness and
  consistency.

## Still to be done

Let's also restructure the Stdlib table of content on the web page.

- Let's start with the Type Selectors.
- Then on section per datatype by alphabetic order, with all functions whose
  first argument has that datatype.
- That means splitting Datetime & Duration functions in different section.
- Possibly other sections to split.
- Introspection should simply become the Any section. I would move fetch
  to the Tuple section (or at least repeat it there ?)
