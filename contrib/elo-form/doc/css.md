# Styling

`elo-form.css` is one stylesheet, about 200 lines, in two parts:

1. a **token block**: every color, size, radius and spacing the form uses, each with a default;
2. the **rules**, which only ever read those tokens.

To restyle a form, set tokens. To restructure it, write rules against the class names listed
under [Structure](#structure). You should not need to edit `elo-form.css` itself.

## Setting tokens

A token is a CSS custom property named `--elo-*`. Set it on anything around the form, on the
form, or on a single field. The nearest one wins, as with any inherited property.

```css
/* For every form on the page */
:root { --elo-accent: #0a7d5a; --elo-radius: 2px; }

/* For the forms inside one container */
.checkout { --elo-gap: 0.6rem; --elo-control-bg: white; }

/* For one field, by its schema path (see options.md, "Paths") */
.elo-form [data-elo-path=".shipTo.zip"] { --elo-control-width: 7em; }

/* For one kind of field */
.elo-form .elo-kind-date { --elo-control-width-date: 100%; }
```

```html
<!-- Or inline -->
<div id="slot" style="--elo-accent: rebeccapurple"></div>
```

No selector needs `!important` and none has to out-rank the stylesheet: the stylesheet never
sets a `--elo-*` property itself, it only reads them.

Tokens set on something *inside* a field (the `<input>`, a label) have no effect; set them on
the field's root element, which is the one carrying `data-elo-path`, or higher.

### Light and dark

There is no dark-mode switch. The default colors are mixed from the text color the form
inherits (`currentColor`), so on a dark page with light text the borders, hints, accent and
error colors come out light, and on a light page dark. If your page already has a text color,
you are done.

To pin colors instead, set them, per theme if you have themes:

```css
:root { --elo-accent: #2a4fd7; --elo-danger: #b3261e; }
:root[data-theme="dark"] { --elo-accent: #9db4ff; --elo-danger: #ff9389; }
```

Setting `--elo-text` to a fixed color makes every derived default (muted, borders) follow it
rather than the inherited text color.

## Tokens

The "Default" column shows what is used when the token is not set. Where a default names
another token, setting that one changes this one too.

<!-- generated:tokens -->
### Color

| Token | Default | What it styles |
| --- | --- | --- |
| `--elo-text` | `currentColor` | Labels and typed values. Derived colors below are mixed from it. |
| `--elo-muted` | `color-mix(in srgb, --elo-text 70%, transparent)` | Hints, notes, the "optional" tag, duration unit names. |
| `--elo-accent` | `color-mix(in srgb, #3565f5 72%, --elo-text)` | Focus rings, links, "add" buttons, the chosen alternative, checkboxes. |
| `--elo-accent-tint` | `color-mix(in srgb, --elo-accent 12%, transparent)` | Fill of the chosen alternative, hovered "add" buttons and drop zone. |
| `--elo-danger` | `color-mix(in srgb, #e0352b 75%, --elo-text)` | Error messages and the border of whatever is invalid. |
| `--elo-control-border` | `color-mix(in srgb, --elo-text 48%, transparent)` | Border of inputs, selects, alternatives, units, drop zone. |
| `--elo-control-bg` | `transparent` | Fill of inputs and selects. |
| `--elo-control-text` | `inherit` | Text typed into inputs and selects. |
| `--elo-group-border` | `color-mix(in srgb, --elo-text 20%, transparent)` | Border of groups, lists and icon buttons. |
| `--elo-group-bg` | `transparent` | Fill of groups and lists. |
| `--elo-affix-bg` | `color-mix(in srgb, --elo-text 7%, transparent)` | Fill of the unit beside an input. |
| `--elo-affix-text` | `--elo-muted` | Text of the unit beside an input. |

### Shape

| Token | Default | What it styles |
| --- | --- | --- |
| `--elo-radius` | `6px` | Corner radius of everything, unless set per part below. |
| `--elo-control-radius` | `--elo-radius` | Corners of inputs, selects, buttons, drop zone. |
| `--elo-group-radius` | `--elo-radius` | Corners of groups and lists. |
| `--elo-choice-radius` | `999px` | Corners of the alternatives of a choice (pills by default). |
| `--elo-border-width` | `1px` | Thickness of every border. |
| `--elo-focus-ring` | `2px solid --elo-accent` | Outline of the focused control. |
| `--elo-focus-offset` | `1px` | Distance between a control and its focus ring. |

### Space

| Token | Default | What it styles |
| --- | --- | --- |
| `--elo-gap` | `1rem` | Between one field and the next. |
| `--elo-gap-inner` | `0.3rem` | Between a label, its control and its hint. |
| `--elo-gap-items` | `0.6rem` | Between list items, dictionary rows, and a choice and its content. |
| `--elo-control-padding` | `0.45em 0.6em` | Inside inputs and selects. |
| `--elo-group-padding` | `0.7rem 0.9rem 0.9rem` | Inside groups and lists. |

### Size

| Token | Default | What it styles |
| --- | --- | --- |
| `--elo-control-width` | `28em` | Widest a text input gets. |
| `--elo-control-width-number` | `11em` | Widest a number input gets, unit included. |
| `--elo-control-width-date` | `12em` | Widest a date picker gets. |
| `--elo-control-width-datetime` | `17em` | Widest a date-and-time picker gets. |
| `--elo-control-width-textarea` | `40em` | Widest a multi-line text gets. |
| `--elo-compact-min` | `8.5rem` | Narrowest a field gets before a side-by-side list row wraps. |

### Type

| Token | Default | What it styles |
| --- | --- | --- |
| `--elo-font` | `inherit` | Font family of the whole form. |
| `--elo-font-size` | `inherit` | Base font size; the sizes below are relative to it. |
| `--elo-line-height` | `1.45` | Line height of the whole form. |
| `--elo-font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Font of pasted JSON. |
| `--elo-label-size` | `0.92em` | Size of labels, alternatives and buttons. |
| `--elo-label-weight` | `600` | Weight of labels. |
| `--elo-small-size` | `0.86em` | Size of hints, notes, errors and the "optional" tag. |
<!-- /generated:tokens -->

## Structure

Class names and `data-elo-*` attributes are the stable hooks. Element types (`div`, `fieldset`)
are as shown but prefer the classes.

### A field

One label, one control, then the texts under it. Used for `String`, `Int`, `Float`, `Bool`,
`Date`, `Datetime`, `Null`, and the JSON file.

```
div.elo-field.elo-kind-float [data-elo-path=".price"]     (.elo-invalid when it has a problem)
├─ label.elo-label
│  ├─ span.elo-label-text [data-elo-from]                 "Price"
│  └─ span.elo-optional                                    "optional"   (only if it may be left empty)
├─ input.elo-input.elo-input-number                        the control (see below)
├─ p.elo-hint                                              what the constraints ask; hidden while an error shows
├─ p.elo-note   [hidden]                                   information, e.g. which alternative Elo will pick
└─ p.elo-error  [hidden]                                   the problem, when there is one
```

The control is one of:

| Kind | Control |
| --- | --- |
| `String` | `input.elo-input`, `textarea.elo-input`, or `select.elo-input` when the constraint lists the values |
| `Int`, `Float` | `input.elo-input.elo-input-number`, or `select.elo-input` |
| `Date` | `input.elo-input.elo-input-date` |
| `Datetime` | `input.elo-input.elo-input-datetime` |
| `Bool` | `span.elo-check-control > input.elo-checkbox`, and the field also has `.elo-inline` (checkbox before label); `select.elo-input` when it may be left empty |
| `Null` | `p.elo-static` |
| JSON file | `div.elo-json-box` (see below) |

With a unit, the control is wrapped:

```
div.elo-affixed.elo-affixed-after        (.elo-affixed-before for units in front; .elo-affixed-narrow around numbers)
├─ input.elo-input.elo-input-number
└─ span.elo-affix                         "€"
```

In a list item or a choice the field has no `label`; the control carries an `aria-label` instead.

### A group

A titled box around several things. Used for tuples, lists, choices, durations, `.` and `Data`.

```
fieldset.elo-group.elo-kind-tuple [data-elo-path=".shipTo"]   (.elo-invalid when it has a problem of its own)
├─ legend.elo-label
│  └─ span.elo-label-text [data-elo-from]                      "Ship to"
├─ p.elo-hint
├─ …body, by kind (below)…
├─ p.elo-note  [hidden]
└─ p.elo-error [hidden]
```

Where the surroundings already name it (the root without a `title`, an alternative of a choice)
the group is a frameless `div.elo-group.elo-bare` with no legend.

An optional or nullable tuple has a switch in its legend:
`legend.elo-label > label.elo-check > input.elo-checkbox + span.elo-label-text`.

Bodies:

```
tuple       div.elo-fields                       one child per attribute, in schema order
            └─ fieldset.elo-group.elo-extras     only for { …, ...: T }
               └─ div.elo-extras-body
                  ├─ div.elo-rows > div.elo-row  each row: input.elo-key, div.elo-row-value, button.elo-icon
                  └─ button.elo-add

list        div.elo-list-body
            ├─ p.elo-static.elo-empty            "None yet." (hidden once there are items)
            ├─ ol.elo-items > li.elo-item
            │  ├─ div.elo-item-body              the item's field or group
            │  └─ div.elo-item-actions           three button.elo-icon: up, down, remove
            └─ button.elo-add                    "+ Add line"

choice      div.elo-union-body                   (unions, `.` and Data)
            ├─ div.elo-choices > label.elo-choice > input[type=radio] + span [data-elo-from]
            └─ div.elo-choice-body               the chosen alternative's field or group

duration    div.elo-duration-parts
            ├─ label.elo-duration-part > input.elo-input.elo-duration-input + span   ×7, some [hidden]
            └─ button.elo-link                   "More units"

JSON file   div.elo-json-box
            ├─ label.elo-drop                    (.elo-over while a file is dragged over it)
            │  ├─ input.elo-file
            │  ├─ span.elo-drop-main             "Choose a JSON file"
            │  └─ span.elo-drop-more             "or drop it here"
            ├─ div.elo-json-state > span.elo-json-status + button.elo-link
            └─ details.elo-json-paste > summary + textarea.elo-input.elo-paste
```

A tuple that is a list row made only of a few one-box fields also has `.elo-compact`: its
fields sit side by side.

### The form

```
div.elo-form
├─ (the root field or group)
├─ p.elo-error.elo-banner [hidden]      a problem that belongs to no field (rare)
└─ input[type=hidden]                   only with the `name` option
```

### Classes by purpose

| Class | On | Meaning |
| --- | --- | --- |
| `elo-kind-<kind>` | every field and group | The Elo kind: `string`, `int`, `float`, `bool`, `date`, `datetime`, `duration`, `null`, `tuple`, `array`, `union`, `any`, `data`, `json` |
| `elo-invalid` | field or group | It has a problem that is currently shown |
| `elo-bare` | group | Frameless, no legend |
| `elo-inline` | field | Control before label (checkbox) |
| `elo-compact` | tuple group | Fields side by side |
| `elo-extras` | group | The "other fields" part of an open tuple |
| `elo-input` | every text-like control | Inputs, selects, text areas |
| `elo-add`, `elo-icon`, `elo-link` | buttons | Add; up / down / remove; text links ("More units", "Remove") |
| `elo-static` | `p` | Text that is not a control ("None yet.") |

### Attributes

| Attribute | On | Value |
| --- | --- | --- |
| `data-elo-path` | every field and group | Its schema path: `.lines.*.qty` |
| `data-elo-from` | label texts and alternatives | Where the text came from: `options.labels.qty`, `attribute qty`, `type Line`, `messages.kinds.date` |
| `data-elo-id` | every field and group | Internal id; do not rely on its value |
| `hidden` | anything | Not shown; the stylesheet forces `display: none` for it inside a form |
| `aria-invalid="true"` | controls | Set with `.elo-invalid` |

## Recipes

Brand color, squarer, tighter:

```css
:root { --elo-accent: #0a7d5a; --elo-radius: 2px; --elo-gap: 0.75rem; --elo-control-padding: 0.3em 0.5em; }
```

Filled inputs on a tinted panel:

```css
.panel { background: #f3f4f7; --elo-control-bg: #fff; --elo-group-bg: #fff; --elo-group-border: transparent; }
```

Full-width inputs:

```css
.elo-form { --elo-control-width: 100%; --elo-control-width-number: 100%; --elo-control-width-date: 100%;
            --elo-control-width-datetime: 100%; --elo-control-width-textarea: 100%; }
```

Underlined inputs (rules, since they change which borders exist):

```css
.elo-form .elo-input { border-width: 0 0 var(--elo-border-width, 1px); border-radius: 0; padding-inline: 0; }
.elo-form .elo-affix { border-width: 0 0 var(--elo-border-width, 1px); border-radius: 0; background: none; }
```

Labels beside controls on wide screens. The selector takes the fields of a tuple (children of
`.elo-fields`) and leaves alone side-by-side list rows (`.elo-compact`), checkboxes
(`.elo-inline`) and unlabelled list items:

```css
@media (min-width: 700px) {
  .elo-form :not(.elo-compact) > .elo-fields > .elo-field:not(.elo-inline) {
    grid-template-columns: 12rem minmax(0, 1fr); column-gap: 1rem; align-items: baseline;
  }
  .elo-form :not(.elo-compact) > .elo-fields > .elo-field:not(.elo-inline) > :not(.elo-label) { grid-column: 2; }
}
```

Hide the "optional" tags, mark required fields instead:

```css
.elo-form .elo-optional { display: none; }
.elo-form .elo-field > .elo-label:not(:has(.elo-optional)) .elo-label-text::after { content: " *"; color: var(--elo-danger, crimson); }
```

One field wider, one unit quieter:

```css
.elo-form [data-elo-path=".notes"] { --elo-control-width-textarea: 100%; }
.elo-form [data-elo-path=".lines.*.unitPrice"] { --elo-affix-bg: transparent; }
```

Square alternatives instead of pills:

```css
.elo-form { --elo-choice-radius: var(--elo-radius, 6px); }
```

## Changing the stylesheet itself

If you do edit `src/elo-form.css`:

- Add a token as one line in the block, in this exact form, under the right `@group`:
  `--_elo-name: var(--elo-name, default); /* What it styles. */`
- Rules read `var(--_elo-name)`, never `var(--elo-name)` and never a literal color.
- Run `npm run docs` to refresh the table above. `npm test` fails if a token is undocumented,
  unused, or if a rule bypasses the tokens.
