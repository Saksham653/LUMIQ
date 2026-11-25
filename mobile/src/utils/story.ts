import { extractNumbers, verifyNumbers } from '@core/ai/numberCheck.js';
import { aggregationRule } from '@core/data/columnTypes.js';
import { numericColumns } from '@core/data/dataset.js';
import { computeInsights, detectTimeColumn } from '@core/engine/insights.js';
import { runPlan } from '@core/engine/runPlan.js';
import { isBlank, isNumber } from '@core/lib/stats.js';

import type { ColumnType, Dataset } from '@/data/types';
import { inSentence, type Language } from '@/i18n';
import { CHECKS, checkFile, type Deduction } from '@/utils/file-check';
import { prettyColumn, type NumberFormat, type Numbers } from '@/utils/format';
import { computeKpis } from '@/utils/kpis';

// The Story of your file, as data: up to five cards built only from what the
// app already works out (the totals of Insights, the shared engine's findings,
// the File check score). Nothing here is a new calculation, nothing uses AI
// and nothing leaves the phone.
//
// Every card passes the same gate as an answer in Ask before it may be shown:
// its sentence is read back with verifyNumbers and every number in it must
// match one of the card's own figures. A card with one number that does not
// match is dropped, never shown. A thin file gives fewer cards; none is padded.
//
// This file imports no React and no React Native, so tests can reach it.

export type StoryKind = 'cover' | 'big' | 'standout' | 'health' | 'next';

// One number a card may say: the value the phone holds and how the card
// writes it. `fromFile` marks a number that is part of a name in the file (a
// period such as 2024-Q1, a group, a column), not a calculation.
export type StoryFigure = { value: number; text: string; fromFile?: boolean };

// A figure split for a big numeral: sign, digits, unit.
export type StoryNumeral = { prefix: string; number: string; suffix: string; rtl: boolean };

export type StoryCard = {
  id: string;
  kind: StoryKind;
  title: string;
  // The one sentence of the card. Every number in it is one of `figures`.
  sentence: string;
  figures: StoryFigure[];
  // The card's main figure, when it has one, for the big numeral.
  numeral?: StoryNumeral;
  // Values for a small picture, and which of them is the one the sentence
  // names.
  series?: number[];
  peakIndex?: number;
  // How many numbers the phone worked out are in the sentence. All of them
  // matched, or the card would not exist. Numbers inside names from the file
  // (the 2024 of "2024-Q1") are checked too but not counted here.
  checked: number;
};

// The words buildStory asks for. They live beside the screen
// (src/screens/story/strings.ts), in English and Hindi.
export type StoryWord =
  | 'unit.rows'
  | 'unit.rowOne'
  | 'unit.cols'
  | 'unit.colOne'
  | 'unit.rowsOver'
  | 'unit.rowOneOver'
  | 'cover.size'
  | 'cover.period'
  | 'big.title'
  | 'big.sum'
  | 'big.avg'
  | 'big.named'
  | 'big.howSum'
  | 'big.howSumSome'
  | 'big.howAvg'
  | 'big.howAvgSome'
  | 'standout.title'
  | 'standout.period'
  | 'standout.top'
  | 'standout.trendUp'
  | 'standout.trendDown'
  | 'standout.unusualHigh'
  | 'standout.unusualLow'
  | 'standout.highest'
  | 'standout.highestPlain'
  | 'health.title'
  | 'health.score'
  | 'health.clean'
  | 'health.empty'
  | 'health.repeats'
  | 'health.mixed'
  | 'health.unusual'
  | 'health.unusualOne'
  | 'next.title'
  | 'next.sentence';

export type StoryTools = {
  t: (key: StoryWord, params?: Record<string, string | number>) => string;
  // The app's number formatting (useNumbers). Its `format` is also how the
  // check reads the numbers back.
  numbers: Numbers;
  language: Language;
};

// A sentence in two forms: as the card shows it, and with every name from
// the file hidden, so that the numbers the phone worked out can be checked
// and counted apart from digits that happen to be in a name.
type Said = { text: string; bare: string };
type Draft = Omit<StoryCard, 'checked'> & { bare: string };
type Checked = { checked: number; unverified: number };
type Found = { raw: string; value: number };
type TimeColumn = { column: string; keyOf: (value: unknown) => number };
type RawInsight = { type: 'top' | 'trend_up' | 'trend_down' | 'unusual'; facts?: Record<string, unknown> };
type Point = { label: string; value: number };
type Picture = { series?: number[]; peakIndex?: number };

// The File check starts every file at this score.
const FULL_SCORE = 100;
// "Highest and lowest period" needs at least this many periods.
const PERIOD_MIN_POINTS = 3;
// "The highest value" is only worth a card with at least this many values.
const HIGHEST_MIN_VALUES = 3;
// More bars than this cannot be told apart in a small picture.
const PICTURE_MAX_BARS = 31;
// What stands in for a name in the bare form of a sentence. Not a digit, a
// letter or a sign, so it can never become part of a number.
const NAME_MARK = '\u2022';

const PERCENT: ColumnType = { type: 'percent' };

// Column names that already say what they are ("Total sales", "Avg price").
const SAYS_TOTAL = /^(total|sum)\b/i;
const SAYS_AVERAGE = /^(avg|average|mean)\b/i;

// Number columns that count or label rows and are never worth a total:
// serial numbers, ids, codes, years, phone numbers.
const NOT_A_MEASURE =
  /^(#|no\.?|s\.?\s*no\.?|sl\.?\s*no\.?|sr\.?\s*no\.?)$|(^|[\s_-])(id|serial|index|code|zip|pin|pincode|postcode|phone|mobile|year|yr)($|[\s_-])/i;
// Names that say "this is the amount", strongest first.
const AMOUNT_FIRST = /revenue|sales|amount|total|turnover|income|profit|spend|expense|paid|salary|gmv|earning|budget/i;
const AMOUNT_NEXT = /value|price|cost|fee/i;

const figure = (value: number, text: string): StoryFigure => ({ value, text });

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

// One sentence from the screen's words. `values` are numbers already
// formatted by the app; `names` are taken from the file as they are (a
// column, a group, a period).
function say(
  tools: StoryTools,
  key: StoryWord,
  values: Record<string, string> = {},
  names: Record<string, string> = {},
): Said {
  const hidden: Record<string, string> = {};
  for (const name of Object.keys(names)) hidden[name] = NAME_MARK;
  return { text: tools.t(key, { ...values, ...names }), bare: tools.t(key, { ...values, ...hidden }) };
}

function join(parts: Said[]): { sentence: string; bare: string } {
  return { sentence: parts.map((part) => part.text).join(' '), bare: parts.map((part) => part.bare).join(' ') };
}

// Numbers that are part of names taken from the file ("2024-Q1", "Plan 2",
// "Sales 2024"). Ask counts numbers inside text cells the same way
// (collectCandidates).
function nameFigures(names: string[], format: NumberFormat): StoryFigure[] {
  const figures: StoryFigure[] = [];
  for (const name of names) {
    for (const found of extractNumbers(name, format) as Found[]) {
      figures.push({ value: found.value, text: found.raw, fromFile: true });
    }
  }
  return figures;
}

// A card that cannot be built is simply left out.
function attempt<T>(build: () => T | null): T | null {
  try {
    return build();
  } catch {
    return null;
  }
}

// Number columns that measure something: not a serial number, an id, a year.
function measureColumns(dataset: Dataset): string[] {
  return (numericColumns(dataset) as string[]).filter((column) => !NOT_A_MEASURE.test(column.trim()));
}

// The file's main number column: an amount to add up when there is one (a
// name that says amount, money first), otherwise the first column that is a
// measure at all. Choosing a column is not a calculation.
export function mainNumberColumn(dataset: Dataset): string | null {
  const measures = measureColumns(dataset);
  if (measures.length === 0) return null;
  const summed = measures.filter((column) => aggregationRule(column, dataset.columnTypes?.[column]) !== 'avg');
  const isMoney = (column: string) => dataset.columnTypes?.[column]?.type === 'money';
  return (
    summed.find((column) => isMoney(column) && AMOUNT_FIRST.test(column)) ??
    summed.find((column) => AMOUNT_FIRST.test(column)) ??
    summed.find(isMoney) ??
    summed.find((column) => AMOUNT_NEXT.test(column)) ??
    summed[0] ??
    measures[0]
  );
}

// The earliest and the latest value of the file's time column, as written in
// the file, in the shared engine's time order (the trend finding's order).
function periodOf(dataset: Dataset): { first: string; last: string } | null {
  const time = detectTimeColumn(dataset) as TimeColumn | null;
  if (!time) return null;
  let first: { key: number; label: string } | null = null;
  let last: { key: number; label: string } | null = null;
  for (const row of dataset.data) {
    const cell = row[time.column];
    if (isBlank(cell)) continue;
    const key = time.keyOf(cell);
    if (!Number.isFinite(key)) continue;
    if (first === null || key < first.key) first = { key, label: String(cell) };
    if (last === null || key > last.key) last = { key, label: String(cell) };
  }
  if (first === null || last === null || first.key === last.key) return null;
  return { first: first.label, last: last.label };
}

// The metric per period, in time order, worked out by the shared plan engine
// exactly as the Insights chart does it, but for every period of the file.
function periodPoints(dataset: Dataset, metric: string): Point[] | null {
  const time = detectTimeColumn(dataset) as TimeColumn | null;
  if (!time || time.column === metric) return null;
  const op = aggregationRule(metric, dataset.columnTypes?.[metric]) === 'avg' ? 'avg' : 'sum';
  const table = runPlan(dataset.data, dataset.columns, {
    groupBy: [time.column],
    measures: [{ op, column: metric, as: 'value' }],
  }).table as Record<string, unknown>[];
  return table
    .filter((row) => !isBlank(row[time.column]) && isNumber(row.value))
    .map((row) => ({ label: String(row[time.column]), value: row.value as number }))
    .sort((a, b) => time.keyOf(a.label) - time.keyOf(b.label));
}

// Bars for a small picture: only when they can be drawn honestly from zero.
function pictureOf(values: number[], peakIndex: number): Picture {
  if (values.length < 2 || values.length > PICTURE_MAX_BARS) return {};
  if (peakIndex < 0 || peakIndex >= values.length) return {};
  if (values.some((value) => value < 0) || !values.some((value) => value > 0)) return {};
  return { series: values, peakIndex };
}

// (a) The cover: the name, the size, and the period when the file has one.
function coverCard(dataset: Dataset, name: string, tools: StoryTools): Draft {
  const { t, numbers } = tools;
  const rows = dataset.data.length;
  const cols = dataset.columns.length;
  const rowsText = numbers.count(rows);
  const colsText = numbers.count(cols);
  const figures: StoryFigure[] = [figure(rows, rowsText), figure(cols, colsText)];
  const parts = [
    say(tools, 'cover.size', {
      rows: t(rows === 1 ? 'unit.rowOne' : 'unit.rows', { n: rowsText }),
      cols: t(cols === 1 ? 'unit.colOne' : 'unit.cols', { n: colsText }),
    }),
  ];
  const period = rows > 0 ? periodOf(dataset) : null;
  if (period) {
    parts.push(say(tools, 'cover.period', {}, { first: period.first, last: period.last }));
    figures.push(...nameFigures([period.first, period.last], numbers.format));
  }
  // The name is the title, not part of the sentence: a file name is not a
  // number the phone worked out ("sales-2025.xlsx").
  return { id: 'cover', kind: 'cover', title: name, ...join(parts), figures };
}

// (b) The big number: the total (or, for a rate, the average) of the main
// number column, the same figure as the first tile of Insights, with a plain
// line saying how it was worked out.
function bigCard(dataset: Dataset, metric: string, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const kpis = computeKpis(dataset, metric);
  const headline = finite(kpis.headline);
  if (headline === null || kpis.values === 0) return null;

  const column = prettyColumn(metric);
  const value = numbers.amount(headline, kpis.typeInfo, metric);
  const valuesText = numbers.count(kpis.values);
  const rows = t(kpis.values === 1 ? 'unit.rowOneOver' : 'unit.rowsOver', { n: valuesText });
  const average = kpis.rule === 'avg';
  const saysItself = (average ? SAYS_AVERAGE : SAYS_TOTAL).test(column);
  const everyRow = kpis.values === kpis.rows;

  const lead = say(tools, saysItself ? 'big.named' : average ? 'big.avg' : 'big.sum', { value }, { column });
  const how = average
    ? say(tools, everyRow ? 'big.howAvg' : 'big.howAvgSome', { rows }, { column })
    : say(tools, everyRow ? 'big.howSum' : 'big.howSumSome', { rows }, { column });

  return {
    id: 'big',
    kind: 'big',
    title: t('big.title'),
    ...join([lead, how]),
    figures: [figure(headline, value), figure(kpis.values, valuesText), ...nameFigures([column], numbers.format)],
    numeral: numbers.amountParts(headline, kpis.typeInfo, metric),
  };
}

// (c) What stands out, first choice: the period with the highest value and
// the one with the lowest.
function periodCard(dataset: Dataset, metric: string, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const points = periodPoints(dataset, metric);
  if (!points || points.length < PERIOD_MIN_POINTS) return null;
  let high = 0;
  let low = 0;
  points.forEach((point, index) => {
    if (point.value > points[high].value) high = index;
    if (point.value < points[low].value) low = index;
  });
  if (points[high].value === points[low].value) return null;

  const typeInfo = dataset.columnTypes?.[metric];
  const column = prettyColumn(metric);
  const highValue = numbers.amount(points[high].value, typeInfo, metric);
  const lowValue = numbers.amount(points[low].value, typeInfo, metric);
  return {
    id: 'standout',
    kind: 'standout',
    title: t('standout.title'),
    ...join([
      say(
        tools,
        'standout.period',
        { highValue, lowValue },
        { high: points[high].label, metric: column, low: points[low].label },
      ),
    ]),
    figures: [
      figure(points[high].value, highValue),
      figure(points[low].value, lowValue),
      ...nameFigures([points[high].label, points[low].label, column], numbers.format),
    ],
    numeral: numbers.amountParts(points[high].value, typeInfo, metric),
    ...pictureOf(
      points.map((point) => point.value),
      high,
    ),
  };
}

// (c) Second choice: the shared engine's "top group and its share".
function topCard(dataset: Dataset, facts: Record<string, unknown>, tools: StoryTools): Draft | null {
  const { t, numbers, language } = tools;
  const share = finite(facts.share);
  const total = finite(facts.total);
  const groups = finite(facts.groups);
  if (share === null || total === null || groups === null || isBlank(facts.group)) return null;
  const metric = String(facts.metric);
  const groupColumn = String(facts.groupColumn);
  const group = String(facts.group);

  const column = prettyColumn(metric);
  const groupName = inSentence(prettyColumn(groupColumn), language);
  const shareText = numbers.percent(share, 1);
  const totalText = numbers.amount(total, dataset.columnTypes?.[metric], metric);
  const groupsText = numbers.count(groups);

  // The picture: every group's total, biggest first, by the same plan engine.
  const table = runPlan(dataset.data, dataset.columns, {
    groupBy: [groupColumn],
    measures: [{ op: 'sum', column: metric, as: 'value' }],
    sort: { by: 'value', dir: 'desc' },
  }).table as Record<string, unknown>[];
  const bars = table.filter((row) => !isBlank(row[groupColumn]) && isNumber(row.value));

  return {
    id: 'standout',
    kind: 'standout',
    title: t('standout.title'),
    ...join([
      say(
        tools,
        'standout.top',
        { share: shareText, total: totalText, groups: groupsText },
        { group, metric: column, groupColumn: groupName },
      ),
    ]),
    figures: [
      figure(share, shareText),
      figure(total, totalText),
      figure(groups, groupsText),
      ...nameFigures([group, column, groupName], numbers.format),
    ],
    numeral: numbers.amountParts(share, PERCENT),
    ...pictureOf(
      bars.map((row) => row.value as number),
      bars.findIndex((row) => String(row[groupColumn]) === group),
    ),
  };
}

// (c) Third choice: the shared engine's change over time.
function trendCard(dataset: Dataset, up: boolean, facts: Record<string, unknown>, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const change = finite(facts.change);
  const from = finite(facts.from);
  const to = finite(facts.to);
  if (change === null || from === null || to === null) return null;
  const metric = String(facts.metric);
  const typeInfo = dataset.columnTypes?.[metric];
  const column = prettyColumn(metric);
  const fromLabel = String(facts.fromLabel);
  const toLabel = String(facts.toLabel);
  const changeText = numbers.percent(change, 1);
  const fromText = numbers.amount(from, typeInfo, metric);
  const toText = numbers.amount(to, typeInfo, metric);
  return {
    id: 'standout',
    kind: 'standout',
    title: t('standout.title'),
    ...join([
      say(
        tools,
        up ? 'standout.trendUp' : 'standout.trendDown',
        { change: changeText, from: fromText, to: toText },
        { metric: column, fromLabel, toLabel },
      ),
    ]),
    figures: [
      figure(change, changeText),
      figure(from, fromText),
      figure(to, toText),
      ...nameFigures([column, fromLabel, toLabel], numbers.format),
    ],
    numeral: numbers.amountParts(change, PERCENT),
  };
}

// (c) Fourth choice: the shared engine's unusual value.
function unusualCard(dataset: Dataset, facts: Record<string, unknown>, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const value = finite(facts.value);
  const typical = finite(facts.typical);
  if (value === null || typical === null) return null;
  const source = String(facts.column);
  const typeInfo = dataset.columnTypes?.[source];
  const column = prettyColumn(source);
  const valueText = numbers.amount(value, typeInfo, source);
  const typicalText = numbers.amount(typical, typeInfo, source);
  return {
    id: 'standout',
    kind: 'standout',
    title: t('standout.title'),
    ...join([
      say(
        tools,
        facts.direction === 'above' ? 'standout.unusualHigh' : 'standout.unusualLow',
        { value: valueText, typical: typicalText },
        { column },
      ),
    ]),
    figures: [figure(value, valueText), figure(typical, typicalText), ...nameFigures([column], numbers.format)],
    numeral: numbers.amountParts(value, typeInfo, source),
  };
}

// (c) Last choice: the highest value of the main column and the row it is
// in, the third tile of Insights.
function highestCard(dataset: Dataset, metric: string, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const kpis = computeKpis(dataset, metric);
  const highest = finite(kpis.highest);
  if (highest === null || kpis.values < HIGHEST_MIN_VALUES) return null;
  const column = prettyColumn(metric);
  const value = numbers.amount(highest, kpis.typeInfo, metric);
  // The row's name is the file's first column; a first column of numbers
  // (a serial number) is not a name.
  const nameType = dataset.columnTypes?.[dataset.columns[0]]?.type ?? 'text';
  const label = nameType === 'text' || nameType === 'date' ? kpis.highestLabel : null;
  return {
    id: 'standout',
    kind: 'standout',
    title: t('standout.title'),
    ...join([
      label
        ? say(tools, 'standout.highest', { value }, { metric: column, label })
        : say(tools, 'standout.highestPlain', { value }, { metric: column }),
    ]),
    figures: [figure(highest, value), ...nameFigures(label ? [column, label] : [column], numbers.format)],
    numeral: numbers.amountParts(highest, kpis.typeInfo, metric),
  };
}

// The shared engine's findings for the story: the same rules on the same
// rows, asked about the story's main number first, and never about a serial
// number or an id.
function storyInsights(dataset: Dataset, metric: string | null): RawInsight[] {
  const numeric = new Set(numericColumns(dataset) as string[]);
  const measures = new Set(measureColumns(dataset));
  const others = dataset.columns.filter((column) => column !== metric && (!numeric.has(column) || measures.has(column)));
  const view: Dataset = { ...dataset, columns: metric ? [metric, ...others] : others };
  return (computeInsights(view, dataset.data) as RawInsight[]).filter((insight) => insight.facts !== undefined);
}

// (c) What stands out: the findings the app already has, best first. The
// story shows one only: the first that has something to say and passes the
// check.
function standoutChoices(dataset: Dataset, main: string | null, tools: StoryTools): (() => Draft | null)[] {
  const metric = main;
  const choices: (() => Draft | null)[] = [];
  if (metric) choices.push(() => periodCard(dataset, metric, tools));

  const insights = attempt(() => storyInsights(dataset, metric)) ?? [];
  const order: RawInsight['type'][] = ['top', 'trend_up', 'trend_down', 'unusual'];
  for (const type of order) {
    const facts = insights.find((insight) => insight.type === type)?.facts;
    if (!facts) continue;
    if (type === 'top') choices.push(() => topCard(dataset, facts, tools));
    else if (type === 'unusual') choices.push(() => unusualCard(dataset, facts, tools));
    else choices.push(() => trendCard(dataset, type === 'trend_up', facts, tools));
  }

  if (metric) choices.push(() => highestCard(dataset, metric, tools));
  return choices;
}

// (d) File health: the File check score and the one thing most worth fixing
// (the check that cost the most points).
function healthCard(dataset: Dataset, tools: StoryTools): Draft | null {
  const { t, numbers } = tools;
  const check = checkFile(dataset);
  if (check.noRows) return null;

  const scoreText = numbers.count(check.score);
  const fullText = numbers.count(FULL_SCORE);
  const figures: StoryFigure[] = [figure(check.score, scoreText), figure(FULL_SCORE, fullText)];
  const parts = [say(tools, 'health.score', { score: scoreText, max: fullText })];

  let worst: Deduction | null = null;
  for (const kind of CHECKS) {
    for (const item of check.checks[kind]) {
      if (worst === null || item.points > worst.points) worst = item;
    }
  }

  if (worst === null) {
    parts.push(say(tools, 'health.clean'));
  } else if (worst.kind === 'empty') {
    const column = prettyColumn(worst.facts.column);
    const empty = numbers.count(worst.facts.empty);
    const rows = numbers.count(worst.facts.rows);
    parts.push(say(tools, 'health.empty', { empty, rows }, { column }));
    figures.push(
      figure(worst.facts.empty, empty),
      figure(worst.facts.rows, rows),
      ...nameFigures([column], numbers.format),
    );
  } else if (worst.kind === 'repeats') {
    const repeats = numbers.count(worst.facts.repeats);
    const rows = numbers.count(worst.facts.rows);
    parts.push(say(tools, 'health.repeats', { repeats, rows }));
    figures.push(figure(worst.facts.repeats, repeats), figure(worst.facts.rows, rows));
  } else if (worst.kind === 'mixed') {
    const column = prettyColumn(worst.facts.column);
    const numericish = numbers.count(worst.facts.numericish);
    const total = numbers.count(worst.facts.total);
    parts.push(say(tools, 'health.mixed', { numericish, total }, { column }));
    figures.push(
      figure(worst.facts.numericish, numericish),
      figure(worst.facts.total, total),
      ...nameFigures([column], numbers.format),
    );
  } else if (worst.kind === 'unusual') {
    const source = worst.facts.column;
    const column = prettyColumn(source);
    const count = numbers.count(worst.facts.count);
    const typical = numbers.amount(worst.facts.typical, dataset.columnTypes?.[source], source);
    parts.push(
      say(tools, worst.facts.count === 1 ? 'health.unusualOne' : 'health.unusual', { count, typical }, { column }),
    );
    figures.push(
      figure(worst.facts.count, count),
      figure(worst.facts.typical, typical),
      ...nameFigures([column], numbers.format),
    );
  }

  return {
    id: 'health',
    kind: 'health',
    title: t('health.title'),
    ...join(parts),
    figures,
    numeral: { prefix: '', number: scoreText, suffix: '', rtl: false },
  };
}

// (e) What next: no number; the screen adds its two actions.
function nextCard(tools: StoryTools): Draft {
  return { id: 'next', kind: 'next', title: tools.t('next.title'), ...join([say(tools, 'next.sentence')]), figures: [] };
}

// The gate, the same check Ask runs on an answer, read back in the app's
// number format:
// 1. every number in the sentence matches one of the card's figures;
// 2. with the names from the file hidden, every number left matches a figure
//    the phone worked out (a digit in a name can never vouch for a result),
//    and those are the numbers the card counts as checked;
// 3. the big numeral matches a worked-out figure too.
// Anything that does not match drops the card.
function checkCard(draft: Draft, format: NumberFormat): StoryCard | null {
  if (draft.figures.some((item) => !Number.isFinite(item.value))) return null;
  const all = draft.figures.map((item) => item.value);
  const workedOut = draft.figures.filter((item) => item.fromFile !== true).map((item) => item.value);

  const whole = verifyNumbers(draft.sentence, all, format) as Checked;
  if (whole.unverified > 0) return null;
  const bare = verifyNumbers(draft.bare, workedOut, format) as Checked;
  if (bare.unverified > 0) return null;
  if (draft.numeral) {
    const { prefix, number, suffix } = draft.numeral;
    const shown = verifyNumbers(`${prefix}${number}${suffix}`, workedOut, format) as Checked;
    if (shown.checked !== 1 || shown.unverified > 0) return null;
  }

  return {
    id: draft.id,
    kind: draft.kind,
    title: draft.title,
    sentence: draft.sentence,
    figures: draft.figures,
    numeral: draft.numeral,
    series: draft.series,
    peakIndex: draft.peakIndex,
    checked: bare.checked,
  };
}

// The story of one file, in the app's language and number format: cover, the
// big number, what stands out, file health, what next. Only cards that have
// something to say and passed the check are returned, in that order.
export function buildStory(dataset: Dataset, name: string, tools: StoryTools): StoryCard[] {
  const format = tools.numbers.format;
  // Built, then checked. A card that cannot be built or does not pass is null.
  const checked = (build: () => Draft | null): StoryCard | null =>
    attempt(() => {
      const draft = build();
      return draft ? checkCard(draft, format) : null;
    });
  const firstChecked = (choices: (() => Draft | null)[]): StoryCard | null => {
    for (const build of choices) {
      const card = checked(build);
      if (card) return card;
    }
    return null;
  };

  const slots: (StoryCard | null)[] = [checked(() => coverCard(dataset, name, tools))];
  if (dataset.data.length > 0) {
    const metric = attempt(() => mainNumberColumn(dataset));
    if (metric) slots.push(checked(() => bigCard(dataset, metric, tools)));
    slots.push(firstChecked(attempt(() => standoutChoices(dataset, metric, tools)) ?? []));
    slots.push(checked(() => healthCard(dataset, tools)));
  }
  slots.push(checked(() => nextCard(tools)));

  return slots.filter((card): card is StoryCard => card !== null);
}
