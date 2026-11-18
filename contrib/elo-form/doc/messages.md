# Messages

Every text a form shows that does not come from the schema or from `labels` / `title` / `units`.
Override any of them with the `messages` option, a partial object merged over the defaults at
any depth:

```js
eloForm(schema, {
  messages: {
    optional: 'facultatif',
    add: 'Ajouter {item}',
    kinds: { string: 'Texte', date: 'Date' },
    phrases: { cmp: { number: { '>=': 'être au moins {x}' } }, and: ' et ', locale: 'fr' },
  },
});
```

`phrases.locale` is the language the texts are written in. Dates and durations that appear inside
a sentence ("Must be at most 30 days.") are written in it, whatever the browser is set to, so a
translation should set it.

`defaultMessages` is exported, so a full translation can start from a copy:
`import { defaultMessages } from '@enspirit/elo-form'`.

## Placeholders

Texts may contain placeholders in braces, replaced when shown. A placeholder a text does not
use can simply be left out.

| Placeholder | In | Replaced by |
| --- | --- | --- |
| `{item}` | `add`, `remove`, `moveUp`, `moveDown`, `each` | the list's item name: "line", "line 2" |
| `{hint}` | `each` | the sentence every item must satisfy |
| `{phrase}` | `must` | a phrase from `phrases`, e.g. "be at least 18" |
| `{source}` | `mustSatisfy` | the constraint as Elo source, when it cannot be put in words |
| `{path}` | `at` | where in an uploaded file: `0.qty` |
| `{key}` | `keyTwice`, `keyTaken` | the field name typed |
| `{detail}` | `jsonBad`, `formError` | the underlying error text |
| `{name}`, `{summary}` | `jsonLoaded`, `jsonCurrent` | the file name; a summary from `jsonSummary` |
| `{n}`, `{s}` | `jsonSummary.*`, `phrases.length.*` | a count; `s` when the count is not 1 |
| `{label}` | `readAs`, `phrases.label` | an alternative's name; a constraint's one-word label |
| `{what}` | `listOf` | the name of a list's item type |
| `{x}` | `phrases.cmp.*` | the bound, with its unit if the field has one: "100%", "today" |
| `{list}` | `phrases.oneOf` | the allowed values, comma-separated |

## How constraint sentences are built

A hint or error about a constraint is `must` with a phrase in it: "Must" + "be at least 18" + ".".
The phrase comes from, in order:

1. the constraint's label, if it contains a space: shown as written, capitalized, with no `must`;
2. the condition, if it can be read: `phrases.cmp.<family>.<operator>` for comparisons of the
   value (`family` is `number`, `date`, `datetime`, `duration` or `text`), `phrases.length.string`
   or `.array` for comparisons of `length(…)`, `phrases.notEmpty`, `phrases.oneOf`; several
   conditions joined by `and` are joined with `phrases.and`;
3. a one-word label, through `phrases.label`: `positive` gives "be positive";
4. otherwise `mustSatisfy` with the Elo source, or `rejected` if even that cannot be printed.

Phrases start with a verb ("be", "have", "come") because `must` supplies the subject. When
joining, a repeated leading word is dropped: "be at least 1 and at most 10".

## Reference

`␣` marks a leading or trailing space that matters.

<!-- generated:messages -->
| Key | Default text |
| --- | --- |
| `optional` | optional |
| `value` | Value |
| `required` | This field is required. |
| `notInt` | Enter a whole number, like 42. |
| `notFloat` | Enter a number, like 3.5. |
| `notDate` | Enter a complete date. |
| `notDatetime` | Enter a complete date and time. |
| `notDuration` | Use whole numbers, zero or more. |
| `must` | Must {phrase}. |
| `mustSatisfy` | Must satisfy: {source} |
| `rejected` | This value is not accepted. |
| `at` | In {path}: |
| `choose` | Choose… |
| `yes` | Yes |
| `no` | No |
| `unspecified` | Not specified |
| `none` | None |
| `alwaysEmpty` | Nothing to fill in here. |
| `noDetails` | Nothing to fill in here. |
| `item` | item |
| `add` | Add {item} |
| `remove` | Remove {item} |
| `moveUp` | Move {item} up |
| `moveDown` | Move {item} down |
| `noItems` | None yet. |
| `each` | Each {item}: {hint} |
| `otherFields` | Other fields |
| `field` | field |
| `fieldName` | Name |
| `addField` | Add a field |
| `keyMissing` | Give every field a name. |
| `keyTwice` | The name “{key}” is used twice. |
| `keyTaken` | “{key}” is already a field above. |
| `moreUnits` | More units |
| `fewerUnits` | Fewer units |
| `units.years` | years |
| `units.months` | months |
| `units.weeks` | weeks |
| `units.days` | days |
| `units.hours` | hours |
| `units.minutes` | minutes |
| `units.seconds` | seconds |
| `jsonChoose` | Choose a JSON file |
| `jsonDrop` | or drop it here |
| `jsonPaste` | Paste JSON instead |
| `jsonRequired` | Choose a JSON file. |
| `jsonBad` | This is not valid JSON: {detail} |
| `jsonLoaded` | {name}: {summary} |
| `jsonCurrent` | Current value: {summary} |
| `jsonSummary.list` | a list of {n} item{s} |
| `jsonSummary.fields` | {n} field{s} |
| `jsonSummary.text` | a text |
| `jsonSummary.number` | a number |
| `jsonSummary.bool` | yes/no |
| `jsonSummary.empty` | empty |
| `readAs` | This will be read as “{label}”, which the schema tries first. |
| `textOrNumber` | Text or a number. |
| `unchecked` | This page does not allow the schema’s rules to run, so they are not checked here. |
| `formError` | This cannot be accepted yet. {detail} |
| `kinds.string` | Text |
| `kinds.int` | Whole number |
| `kinds.float` | Number |
| `kinds.bool` | Yes / No |
| `kinds.null` | Nothing |
| `kinds.date` | Date |
| `kinds.datetime` | Date and time |
| `kinds.duration` | Duration |
| `kinds.any` | Anything |
| `kinds.data` | Data |
| `kinds.tuple` | Details |
| `kinds.array` | List |
| `kinds.union` | Choice |
| `kinds.json` | JSON file |
| `listOf` | {what} list |
| `or` | ␣or␣ |
| `phrases.cmp.number.>` | be greater than {x} |
| `phrases.cmp.number.>=` | be at least {x} |
| `phrases.cmp.number.<` | be less than {x} |
| `phrases.cmp.number.<=` | be at most {x} |
| `phrases.cmp.number.==` | be {x} |
| `phrases.cmp.number.!=` | not be {x} |
| `phrases.cmp.date.>` | be after {x} |
| `phrases.cmp.date.>=` | be {x} or later |
| `phrases.cmp.date.<` | be before {x} |
| `phrases.cmp.date.<=` | be {x} or earlier |
| `phrases.cmp.date.==` | be {x} |
| `phrases.cmp.date.!=` | not be {x} |
| `phrases.cmp.datetime.>` | be after {x} |
| `phrases.cmp.datetime.>=` | be {x} or later |
| `phrases.cmp.datetime.<` | be before {x} |
| `phrases.cmp.datetime.<=` | be {x} or earlier |
| `phrases.cmp.datetime.==` | be {x} |
| `phrases.cmp.datetime.!=` | not be {x} |
| `phrases.cmp.duration.>` | be longer than {x} |
| `phrases.cmp.duration.>=` | be at least {x} |
| `phrases.cmp.duration.<` | be shorter than {x} |
| `phrases.cmp.duration.<=` | be at most {x} |
| `phrases.cmp.duration.==` | be {x} |
| `phrases.cmp.duration.!=` | not be {x} |
| `phrases.cmp.text.>` | come after {x} |
| `phrases.cmp.text.>=` | be {x} or after |
| `phrases.cmp.text.<` | come before {x} |
| `phrases.cmp.text.<=` | be {x} or before |
| `phrases.cmp.text.==` | be {x} |
| `phrases.cmp.text.!=` | not be {x} |
| `phrases.length.string.>` | be longer than {n} character{s} |
| `phrases.length.string.>=` | be at least {n} character{s} long |
| `phrases.length.string.<` | be shorter than {n} character{s} |
| `phrases.length.string.<=` | be at most {n} character{s} long |
| `phrases.length.string.==` | be exactly {n} character{s} long |
| `phrases.length.string.!=` | not be {n} character{s} long |
| `phrases.length.array.>` | have more than {n} item{s} |
| `phrases.length.array.>=` | have at least {n} item{s} |
| `phrases.length.array.<` | have fewer than {n} item{s} |
| `phrases.length.array.<=` | have at most {n} item{s} |
| `phrases.length.array.==` | have exactly {n} item{s} |
| `phrases.length.array.!=` | not have {n} item{s} |
| `phrases.notEmpty` | be filled in |
| `phrases.oneOf` | be one of: {list} |
| `phrases.label` | be {label} |
| `phrases.and` | ␣and␣ |
| `phrases.today` | today |
| `phrases.now` | now |
| `phrases.locale` | en |
<!-- /generated:messages -->
