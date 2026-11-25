import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/ui/icon-set';
import { Notice, type NoticeAction } from '@/ui/notice';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// The one place a failure is turned into words on a screen. It takes
// whatever was thrown, says what happened and what to do next, and sorts the
// failure into amber or red:
//
//   amber (warn)  not yet: offline, took too long, could not be checked, no
//                 questions left. Trying again later can work.
//   red (bad)     a failure or a refusal. Trying the same thing again will
//                 not help.
//
// What a person never sees: a stack, a raw code as the message, or a line
// written for the people who build the app. A code, when the failure has
// one, goes in one small faint line at the foot, for whoever is asked to
// help.

// offline     the phone could not reach the network
// timeout     it took too long, or the other side was busy
// unverified  a number could not be checked on the phone
// quota       no questions left for now
// failed      everything else: a failure, or a refusal
export type ErrorNoteKind = 'offline' | 'timeout' | 'unverified' | 'quota' | 'failed';
export type ErrorNoteTone = 'warn' | 'bad';

// What readError makes of a thrown value.
export type ErrorReading = {
  kind: ErrorNoteKind;
  // warn for the four "not yet" kinds, bad for a failure.
  tone: ErrorNoteTone;
  // Words fit to show a person, when the value carried any.
  message: string | undefined;
  // Its code, for the small faint line. Never shown as the message.
  code: string | undefined;
};

// Longer than this is a dump, not a sentence for a person.
const LONGEST_MESSAGE = 280;
const LONGEST_CODE = 64;
// A failure is often wrapped: `{ error: { code } }` from a server, an Error
// with a `cause`. The wrapping is opened this many times and no further, so a
// value that holds itself cannot keep the note busy.
const DEEPEST = 2;

// A code, a translation key or a file name rather than a sentence: Latin
// letters, digits and joining marks with no space between them. A sentence
// in a script without spaces (Japanese, Chinese) is not caught by it.
const CODE_LIKE = /^[\w.:/#-]+$/;

type KindTable = readonly (readonly [ErrorNoteKind, readonly string[]])[];

// Parts of a code that mean "not yet". Read in this order, so a
// 'network_timeout' is a timeout. Kept narrow on purpose: a code this list
// does not know is a failure, and the caller can always pass `tone`.
const CODE_PARTS: KindTable = [
  ['timeout', ['timeout', 'timed_out', 'timedout', 'busy', 'overloaded', 'service_unavailable', 'try_later']],
  [
    'offline',
    ['offline', 'network', 'internet', 'no_connection', 'disconnected', 'unreachable', 'econn', 'enotfound'],
  ],
  ['quota', ['quota', 'rate_limit', 'ratelimit', 'device_limit', 'daily_limit', 'too_many_requests']],
  [
    'unverified',
    ['unverified', 'not_verified', 'could_not_verify', 'unchecked', 'not_checked', 'unmatched', 'not_matched'],
  ],
];

// What the phone and the browser themselves say when a request cannot leave
// or does not come back. Used only to sort the failure, never shown.
const RUNTIME_WORDS: KindTable = [
  ['timeout', ['timed out', 'timeout']],
  ['offline', ['network request failed', 'failed to fetch', 'load failed', 'networkerror', 'network error', 'offline']],
];

// Whole sentences the phone and the browser write themselves, as each one
// starts. They are in no language the person chose, so a message that is one
// of them is never shown, even when it arrives as a plain string. A sentence
// the app wrote ("You are offline. Connect and try again.") is not one of
// them and is shown.
const PLATFORM_SENTENCES: readonly string[] = [
  'network request failed',
  'network request timed out',
  'failed to fetch',
  'load failed',
  'networkerror when attempting',
  'the internet connection appears to be offline',
  'the request timed out',
];

function kindIn(table: KindTable, text: string): ErrorNoteKind | undefined {
  for (const [kind, parts] of table) {
    if (parts.some((part) => text.includes(part))) return kind;
  }
  return undefined;
}

function fromPlatform(text: string | undefined): boolean {
  if (text === undefined) return false;
  const start = text.trim().toLowerCase();
  return PLATFORM_SENTENCES.some((opening) => start.startsWith(opening));
}

// Codes are written many ways: 'NETWORK_TIMEOUT', 'network-timeout' and
// 'networkTimeout' are all read as 'network_timeout'.
function kindOfCode(code: string): ErrorNoteKind | undefined {
  const flat = code
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  return kindIn(CODE_PARTS, flat);
}

// The answer of a server, by its number: asked too often, or too slow or too
// busy to answer.
function kindOfStatus(status: unknown): ErrorNoteKind | undefined {
  if (status === 429) return 'quota';
  if (status === 408 || status === 502 || status === 503 || status === 504) return 'timeout';
  return undefined;
}

function field(value: object, name: string): unknown {
  return (value as Record<string, unknown>)[name];
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function codeOf(value: object): string | undefined {
  const code = field(value, 'code');
  const text =
    typeof code === 'number' && Number.isFinite(code) ? String(code) : typeof code === 'string' ? code.trim() : '';
  return text === '' || text.length > LONGEST_CODE ? undefined : text;
}

function isError(value: object): boolean {
  return value instanceof Error || Object.prototype.toString.call(value) === '[object Error]';
}

// The first line of a message, when it reads as words for a person. Only
// the first line: what follows it in a thrown value is usually a stack.
function sentence(text: string | undefined, code: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const line = (text.split('\n', 1)[0] ?? '').trim();
  if (line === '' || line.length > LONGEST_MESSAGE) return undefined;
  if (line === code || CODE_LIKE.test(line)) return undefined;
  return line;
}

function reading(
  kind: ErrorNoteKind | undefined,
  message: string | undefined,
  code: string | undefined,
): ErrorReading {
  const sorted = kind ?? 'failed';
  return { kind: sorted, tone: sorted === 'failed' ? 'bad' : 'warn', message, code };
}

// What a failure is wrapped round, when it is something that can be read.
function wrapped(value: object): unknown {
  const inner = field(value, 'cause') ?? field(value, 'error');
  if (typeof inner === 'string') return inner.trim() === '' ? undefined : inner;
  return typeof inner === 'object' && inner !== null ? inner : undefined;
}

function read(value: unknown, depth: number): ErrorReading {
  if (typeof value === 'string') {
    const text = value.trim();
    // A bare code ('offline'): the failure is sorted by it, and it is never
    // shown as the message.
    if (text !== '' && text.length <= LONGEST_CODE && CODE_LIKE.test(text)) {
      return reading(kindOfCode(text), undefined, text);
    }
    // The phone's own sentences sort the failure and stay unseen; any other
    // sentence was written by the app for the person.
    return reading(
      kindIn(RUNTIME_WORDS, text.toLowerCase()),
      fromPlatform(text) ? undefined : sentence(text, undefined),
      undefined,
    );
  }
  // A number, a boolean, a function: a failure with nothing to read.
  if (typeof value !== 'object' || value === null) return reading(undefined, undefined, undefined);

  const code = codeOf(value);
  const name = textOf(field(value, 'name'));
  const words = textOf(field(value, 'message'));
  const kind =
    (code === undefined ? undefined : kindOfCode(code)) ??
    // Some failures carry the server's number as their code.
    kindOfStatus(field(value, 'status') ?? field(value, 'statusCode') ?? field(value, 'code')) ??
    // 'TimeoutError', 'NetworkError'.
    (name === undefined ? undefined : kindOfCode(name)) ??
    (words === undefined ? undefined : kindIn(RUNTIME_WORDS, words.toLowerCase()));

  // An Error's own message is written for the people who build the app, and
  // can hold a path or a query. It is never shown, and neither are the
  // phone's own sentences. A plain object the app made may carry words meant
  // for the person.
  const message = isError(value) || fromPlatform(words) ? undefined : sentence(words, code);

  // Nothing here says "not yet": what it is wrapped round may. The outer
  // words and code are kept when there are any.
  if (kind === undefined && depth < DEEPEST) {
    const inner = wrapped(value);
    if (inner !== undefined) {
      const below = read(inner, depth + 1);
      return reading(
        below.kind === 'failed' ? undefined : below.kind,
        message ?? below.message,
        code ?? below.code,
      );
    }
  }
  return reading(kind, message, code);
}

// Reads anything that was thrown: an Error, a string, an object with `code`
// and `message`, a failure wrapped in another, or something else entirely.
// It never throws itself.
//   const { kind } = readError(failure);
//   const title = t(TITLE_FOR[kind]);
// A screen can use the kind to choose its own words; ErrorNote uses the same
// reading for its colour and its icon.
export function readError(value: unknown): ErrorReading {
  try {
    return read(value, 0);
  } catch {
    // A value that throws when it is looked at is still a failure worth a note.
    return reading(undefined, undefined, undefined);
  }
}

export type ErrorNoteProps = {
  // Whatever was thrown or handed back as a failure. null, undefined, false
  // or an empty string draws nothing, so the note can stay in the tree:
  //   <ErrorNote error={failure} />
  error: unknown;
  // What happened, in the app's language. Without it the note shows the
  // failure's own words when it has words meant for a person (a string, or
  // the `message` of a plain object), and otherwise the library's own
  // "Something went wrong". The message of an Error is never shown: turn its
  // code into words and pass them here.
  title?: string;
  // What to do next, in a line of words.
  children?: ReactNode;
  // Amber or red. Default: read from the failure (see the top of this file).
  tone?: ErrorNoteTone;
  // Shows the retry button, labelled by the library ("Try again").
  onRetry?: () => void;
  // The retry is running: the button keeps its place and cannot be pressed
  // again.
  retrying?: boolean;
  // Another way on ("Choose another file"). It stands beside the retry
  // button, or alone.
  action?: NoticeAction;
  // The code for the small faint line. Default: the failure's own `code`.
  // Pass null to leave the line out.
  code?: string | null;
  // A screen reader is told the note's words when it arrives. Default true:
  // a failure appears in answer to something. Pass false for a note that is
  // already there when the screen opens.
  live?: boolean;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// A failure, said plainly, next to what failed:
//   <ErrorNote error={failure} title={t('ask.error.offline')} onRetry={ask}>
//     {t('ask.error.offlineNext')}
//   </ErrorNote>
//
// It has no haptic of its own. Whoever learns of the failure fires
// haptics.error() once, at that moment, together with this note.
//
// Needs AppStateProvider above it.
export function ErrorNote({
  error,
  title,
  children,
  tone,
  onRetry,
  retrying = false,
  action,
  code,
  live = true,
  style,
  testID,
}: ErrorNoteProps) {
  const strings = useUIStrings();
  if (error === undefined || error === null || error === false || error === '') return null;

  const found = readError(error);
  const shade = tone ?? found.tone;
  const icon: IconName = found.kind === 'offline' ? 'offline' : shade === 'warn' ? 'warning' : 'error';
  const shownCode = code === undefined ? found.code : code === null || code === '' ? undefined : code;
  const retry: NoticeAction | undefined =
    onRetry === undefined ? undefined : { label: strings.retry, onPress: onRetry, busy: retrying };

  return (
    <Notice
      tone={shade}
      icon={icon}
      title={title ?? found.message ?? strings.errorTitle}
      action={retry ?? action}
      secondAction={retry === undefined ? undefined : action}
      live={live}
      style={style}
      testID={testID}>
      {typeof children === 'string' || typeof children === 'number' ? <Txt variant="small">{children}</Txt> : children}
      {shownCode === undefined ? null : (
        <Txt variant="small" tone="faint" selectable>
          {shownCode}
        </Txt>
      )}
    </Notice>
  );
}
