# A catalogue of formulas

Fourteen small, real formulas, each as a **formula bundle**: a directory
holding `types.elo` (`Input` and `Output`), `formula.elo`, `fields.elo` (the
form), `cases.elo` and `bundle.json`. The format is [`BUNDLE.md`](BUNDLE.md);
this is what is in the catalogue.

| Formula | Input | Answers |
| --- | --- | --- |
| [`leap-year`](leap-year) | a year | whether it is a leap year |
| [`vat-number-be`](vat-number-be) | a VAT number, however it is written | valid, and the number formatted |
| [`iban`](iban) | an IBAN | valid, the country, the number in groups of four |
| [`card-number`](card-number) | a payment card number | passes Luhn, the brand, the masked number |
| [`order-pricing`](order-pricing) | price, quantity, tier, VAT rate, coupon | subtotal, discount, VAT, total |
| [`income-tax`](income-tax) | a taxable income | tax, net, marginal and effective rate |
| [`loan-payment`](loan-payment) | principal, rate, years | monthly payment, total interest |
| [`bmi`](bmi) | weight and height | the index and its category |
| [`age`](age) | a birth date and a day | age in whole years, whether of age |
| [`payment-due-date`](payment-due-date) | invoice date, payment terms | due date, days left, overdue |
| [`shipping-cost`](shipping-cost) | weight, dimensions, zone, express | billable weight, cost, delivery estimate |
| [`password-strength`](password-strength) | a password | score, level, and which rules it fails |
| [`subscription-proration`](subscription-proration) | monthly price, start date | days billed, amount, next renewal |
| [`order-lines`](order-lines) | a **table** of order lines | one priced row per line |

## Looking at one

```bash
npm run build

# Every bundle, with its case count
contrib/formula-service/bin/elo-formulas

# One bundle: its documentation, its form, its cases and their results
contrib/formula-service/bin/elo-formulas order-pricing
```

```
# What does this order cost?   (order-pricing 1.0.0)
tags: pricing, money
…
## The form
  Unit price      unitPrice   Float   number; required; refused by: positive
  Quantity        quantity    Int     number; required; refused by: atLeastOne
  Customer tier   tier        String  select; required; options: standard | silver | gold; refused by: known
  VAT rate        vatRate     Float   number; required; refused by: aRate
  Coupon (%)      couponPercent Float number; optional; refused by: aPercentage

## The cases
  ✓ gold customer, volume and loyalty
      in   {"unitPrice":19.99,"quantity":10,"tier":"gold","vatRate":0.21}
      out  {subtotal: 199.9, discountRate: 12, discount: 23.99, net: 175.91, vat: 36.94, total: 212.85}
```

The form comes from `fields.elo`, which is **generated from `Input`** and then
checked against it on every test run — so a label, a widget and a dropdown's
options are written by hand, and the types, the required flags and the
constraint names cannot drift:

```bash
# after changing Input: refresh in place, keeping every label already written
contrib/formula-service/bin/elo-formulas --fields order-pricing
```

## Running one on your own data

A bundle is applied by a program that imports its two halves, which is also how
a web service wraps it:

```elo
import { Input, Output } from './types'
import { formula } from './formula'

formula(_ |> Input) |> Output
```

It is generated rather than stored, for the same reason the case runner is —
so ask for it, next to the bundle it applies to:

```bash
contrib/formula-service/bin/elo-formulas --service > contrib/formula-service/formulas/iban/service.elo
echo '{"iban": "BE68 5390 0754 7034"}' | ./bin/elo contrib/formula-service/formulas/iban/service.elo --stdin
# {"valid":true,"country":"BE","formatted":"BE68 5390 0754 7034"}
```

`eloc contrib/formula-service/formulas/iban/service.elo -t ruby -p` compiles the
same thing to Ruby, Python or JavaScript as one self-contained expression, with
nothing to install beside it — and so does
`GET /iban@1.0.0` with `Accept: text/x-ruby`, which is
[the service](..) that wraps this catalogue.

## What checks them

- `test/acceptance/test-formulas.sh` generates the case runner into each
  bundle, type-checks it, and runs every case on **JavaScript, Ruby and
  Python**. A case that answers differently on one target fails the suite.
- `test/integration/formula-bundle.integration.test.ts` holds every bundle to
  the format: the doc comment, the declared `Input` and `Output`, the exported
  `formula`, the shape of the cases, and a `fields.elo` that still agrees with
  `Input` — down to each constraint's name, and to every option of a choice
  being a value its type accepts.

Writing the first thirteen found four portability bugs — see the `0227`–`0231`
tasks. A program is a different test from an expression.

## The one whose input is a table

`order-lines` is the odd one out, on purpose: its `Input` is `[Line]` rather
than a record, so it is **one call whose argument is a list** — not a batch of
calls. That is the shape a tabular format means something for, which is why it
is also the bundle the service's `text/csv` support is specified against: a CSV
body is one input that happens to be a table, and `|> Input` validates it like
any other value.

Note what its `fields.elo` then is: the fields of a *row*, which is what a
table's **column labels** are. There is no form for a table, and a page that
knows this offers a way to send one instead.

## The two limits worth knowing

**No SQL.** A formula is a lambda and the types are type definitions, and that
target takes neither. An expression written inline over `_`, with the host
validating the input, is what compiles to all four.

**`--strict` reports the formula body.** A `let`-bound function is checked
once, not per call site, so its parameter is `Any` and `--strict` says so.
`--typecheck` is clean, which is the part that catches real mistakes.
