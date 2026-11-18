/**
 * Every word a form shows that does not come from the schema.
 *
 * Pass `messages` to `eloForm` to override any of them — a translation is a
 * copy of this object in another language.
 */
import type { Kind, Phrases } from './schema.js';

export interface Messages {
  /** Tag after the label of a field that may be left empty. */
  optional: string;
  /** Label of a form whose type has no name. */
  value: string;
  required: string;
  notInt: string;
  notFloat: string;
  notDate: string;
  notDatetime: string;
  notDuration: string;
  /** `{phrase}` is e.g. "be greater than 0". */
  must: string;
  /** `{source}` is the constraint as written in Elo. */
  mustSatisfy: string;
  rejected: string;
  /** Prefix for a problem inside an uploaded file. `{path}` is e.g. "lines.0.qty". */
  at: string;
  choose: string;
  yes: string;
  no: string;
  unspecified: string;
  none: string;
  alwaysEmpty: string;
  noDetails: string;
  item: string;
  add: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  noItems: string;
  /** A rule every item of a list must follow. `{hint}` is a full sentence. */
  each: string;
  otherFields: string;
  field: string;
  fieldName: string;
  addField: string;
  keyMissing: string;
  keyTwice: string;
  keyTaken: string;
  moreUnits: string;
  fewerUnits: string;
  units: Record<'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds', string>;
  jsonChoose: string;
  jsonDrop: string;
  jsonPaste: string;
  jsonRequired: string;
  jsonBad: string;
  jsonLoaded: string;
  jsonCurrent: string;
  jsonSummary: { list: string; fields: string; text: string; number: string; bool: string; empty: string };
  /** Shown when a later alternative was chosen but an earlier one accepts the value. */
  readAs: string;
  textOrNumber: string;
  unchecked: string;
  formError: string;
  kinds: Record<Kind, string>;
  listOf: string;
  or: string;
  phrases: Phrases;
}

export const defaultMessages: Messages = {
  optional: 'optional',
  value: 'Value',
  required: 'This field is required.',
  notInt: 'Enter a whole number, like 42.',
  notFloat: 'Enter a number, like 3.5.',
  notDate: 'Enter a complete date.',
  notDatetime: 'Enter a complete date and time.',
  notDuration: 'Use whole numbers, zero or more.',
  must: 'Must {phrase}.',
  mustSatisfy: 'Must satisfy: {source}',
  rejected: 'This value is not accepted.',
  at: 'In {path}:',
  choose: 'Choose…',
  yes: 'Yes',
  no: 'No',
  unspecified: 'Not specified',
  none: 'None',
  alwaysEmpty: 'Nothing to fill in here.',
  noDetails: 'Nothing to fill in here.',
  item: 'item',
  add: 'Add {item}',
  remove: 'Remove {item}',
  moveUp: 'Move {item} up',
  moveDown: 'Move {item} down',
  noItems: 'None yet.',
  each: 'Each {item}: {hint}',
  otherFields: 'Other fields',
  field: 'field',
  fieldName: 'Name',
  addField: 'Add a field',
  keyMissing: 'Give every field a name.',
  keyTwice: 'The name “{key}” is used twice.',
  keyTaken: '“{key}” is already a field above.',
  moreUnits: 'More units',
  fewerUnits: 'Fewer units',
  units: { years: 'years', months: 'months', weeks: 'weeks', days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds' },
  jsonChoose: 'Choose a JSON file',
  jsonDrop: 'or drop it here',
  jsonPaste: 'Paste JSON instead',
  jsonRequired: 'Choose a JSON file.',
  jsonBad: 'This is not valid JSON: {detail}',
  jsonLoaded: '{name}: {summary}',
  jsonCurrent: 'Current value: {summary}',
  jsonSummary: {
    list: 'a list of {n} item{s}', fields: '{n} field{s}', text: 'a text', number: 'a number', bool: 'yes/no', empty: 'empty',
  },
  readAs: 'This will be read as “{label}”, which the schema tries first.',
  textOrNumber: 'Text or a number.',
  unchecked: 'This page does not allow the schema’s rules to run, so they are not checked here.',
  formError: 'This cannot be accepted yet. {detail}',
  kinds: {
    string: 'Text', int: 'Whole number', float: 'Number', bool: 'Yes / No', null: 'Nothing', date: 'Date',
    datetime: 'Date and time', duration: 'Duration', any: 'Anything', data: 'Data', tuple: 'Details',
    array: 'List', union: 'Choice', json: 'JSON file',
  },
  listOf: '{what} list',
  or: ' or ',
  phrases: {
    cmp: {
      number: {
        '>': 'be greater than {x}', '>=': 'be at least {x}', '<': 'be less than {x}', '<=': 'be at most {x}',
        '==': 'be {x}', '!=': 'not be {x}',
      },
      date: {
        '>': 'be after {x}', '>=': 'be {x} or later', '<': 'be before {x}', '<=': 'be {x} or earlier',
        '==': 'be {x}', '!=': 'not be {x}',
      },
      datetime: {
        '>': 'be after {x}', '>=': 'be {x} or later', '<': 'be before {x}', '<=': 'be {x} or earlier',
        '==': 'be {x}', '!=': 'not be {x}',
      },
      duration: {
        '>': 'be longer than {x}', '>=': 'be at least {x}', '<': 'be shorter than {x}', '<=': 'be at most {x}',
        '==': 'be {x}', '!=': 'not be {x}',
      },
      text: {
        '>': 'come after {x}', '>=': 'be {x} or after', '<': 'come before {x}', '<=': 'be {x} or before',
        '==': 'be {x}', '!=': 'not be {x}',
      },
    },
    length: {
      string: {
        '>': 'be longer than {n} character{s}', '>=': 'be at least {n} character{s} long',
        '<': 'be shorter than {n} character{s}', '<=': 'be at most {n} character{s} long',
        '==': 'be exactly {n} character{s} long', '!=': 'not be {n} character{s} long',
      },
      array: {
        '>': 'have more than {n} item{s}', '>=': 'have at least {n} item{s}',
        '<': 'have fewer than {n} item{s}', '<=': 'have at most {n} item{s}',
        '==': 'have exactly {n} item{s}', '!=': 'not have {n} item{s}',
      },
    },
    notEmpty: 'be filled in',
    oneOf: 'be one of: {list}',
    label: 'be {label}',
    and: ' and ',
    today: 'today',
    now: 'now',
    locale: 'en',
  },
};

/** `defaults` with `over` laid on top, to any depth. */
export function mergeMessages<T>(defaults: T, over: unknown): T {
  if (!over || typeof over !== 'object' || typeof defaults !== 'object' || !defaults) {
    return (over === undefined ? defaults : over) as T;
  }
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    // Translations are often parsed JSON, where `__proto__` is a key like any other: it is not a message.
    if (k !== '__proto__') out[k] = mergeMessages(out[k], v);
  }
  return out as T;
}
