import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { type CSSAnimationProperties } from 'react-native-reanimated';

import type { AskErrorCode } from '@/ai/ask-client';
import type { AnswerSegment, AskProof, AskResult, AskStage, SentPrompt } from '@/ai/ask-flow';
import type { StringKey } from '@/i18n';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import {
  ANSWER_LINE,
  MAX_FONT_SCALE,
  border,
  curve,
  duration,
  figureFont,
  hasDevanagari,
  lineHeightFor,
  radius,
  rise,
  sizes,
  space,
  textFont,
  transition,
  typeScale,
  useIsRTL,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { Button, WorkingDots } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press } from '@/ui/press';
import { Txt } from '@/ui/text';
import { prettyColumn, type Numbers } from '@/utils/format';

import { ASK_STRINGS } from './strings';
import { SuggestionRow } from './suggestion-button';

const TABLE_ROWS = 8;

const SENT_LABEL: Record<SentPrompt['label'], StringKey> = {
  plan: 'ask.sent.plan',
  retry: 'ask.sent.retry',
  answer: 'ask.sent.answer',
};

// --- Arriving ------------------------------------------------------------------

// Something new in the chat fades in and rises once. When the phone asks for
// less motion it only fades.
const ARRIVE: CSSAnimationProperties<ViewStyle> = {
  animationName: {
    from: { opacity: 0, transform: [{ translateY: rise }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
  },
  animationDuration: duration.sweep,
  animationTimingFunction: curve.standard,
};
const ARRIVE_STILL: CSSAnimationProperties<ViewStyle> = {
  animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
  animationDuration: duration.quick,
  animationTimingFunction: curve.standard,
};

function Arrive({ children, enter }: { children: ReactNode; enter: boolean }) {
  const reduced = useReducedMotion();
  return <Animated.View style={enter ? (reduced ? ARRIVE_STILL : ARRIVE) : null}>{children}</Animated.View>;
}

// LUMIQ's side of the chat: a card as wide as the screen allows. With
// `enter`, it fades in and rises when it first appears.
export function AssistantPanel({ children, enter = false }: { children: ReactNode; enter?: boolean }) {
  return (
    <Arrive enter={enter}>
      <Card style={styles.panel}>{children}</Card>
    </Arrive>
  );
}

// --- Working -------------------------------------------------------------------

const STEPS: { stage: AskStage; key: StringKey }[] = [
  { stage: 'planning', key: 'ask.stage.planning' },
  { stage: 'calculating', key: 'ask.stage.calculating' },
  { stage: 'writing', key: 'ask.stage.writing' },
];

// While LUMIQ works: the working mark beside the words that say so, and the
// three real steps reported by the Ask flow, marked as they happen. A step
// the flow skipped (an answer from the column summary needs no calculation)
// is not shown, so nothing pretends to have happened.
export function WorkingPanel({ stages }: { stages: AskStage[] }) {
  const { colors } = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const current = stages[stages.length - 1];
  const currentIndex = STEPS.findIndex((step) => step.stage === current);
  return (
    <AssistantPanel>
      <View style={styles.working} accessible accessibilityRole="progressbar" accessibilityLabel={t('ask.working')}>
        <WorkingDots color={colors.inkSoft} />
        <Txt variant="small" tone="soft" style={styles.flex}>
          {t('ask.working')}
        </Txt>
      </View>
      <View style={styles.steps} accessibilityLiveRegion="polite">
        {STEPS.map((step, index) => {
          const visited = stages.includes(step.stage);
          if (!visited && index < currentIndex) return null;
          const state = step.stage === current ? 'now' : visited ? 'done' : 'next';
          return (
            <View key={step.stage} style={styles.step} accessible={state === 'now'}>
              <View style={styles.mark}>
                {state === 'done' ? (
                  <Icon name="check" size={sizes.iconSmall} color={colors.inkSoft} />
                ) : (
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: state === 'now' ? colors.ink : colors.surface,
                        borderColor: state === 'now' ? colors.ink : colors.inkFaint,
                      },
                      transition(['backgroundColor', 'borderColor'], duration.quick, 'standard', reduced),
                    ]}
                  />
                )}
              </View>
              <Txt
                weight={state === 'now' ? '600' : '400'}
                tone={state === 'now' ? 'ink' : state === 'done' ? 'soft' : 'faint'}
                style={styles.flex}>
                {t(step.key)}
              </Txt>
            </View>
          );
        })}
      </View>
    </AssistantPanel>
  );
}

// --- A failure -----------------------------------------------------------------

type NoteTone = 'info' | 'warn' | 'bad';

// Amber for "not yet" (no questions left, busy, offline, not switched on),
// red for a failure, quiet paper for the person's own stop.
const ERROR_TONE: Record<AskErrorCode, NoteTone> = {
  not_configured: 'warn',
  device_limit: 'warn',
  busy: 'warn',
  offline: 'warn',
  failed: 'bad',
  stopped: 'info',
};

// What went wrong, in words, with its icon, on the soft fill of its kind.
// With `onRetry` it offers the same question again; the button is switched
// off while another answer is on its way.
export function ErrorPanel({
  code,
  message,
  retryLabel,
  onRetry,
  busy = false,
  enter = false,
}: {
  code: AskErrorCode;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  busy?: boolean;
  enter?: boolean;
}) {
  const { colors } = useTheme();
  const tone = ERROR_TONE[code];
  const fill = tone === 'bad' ? colors.badSoft : tone === 'warn' ? colors.warnSoft : colors.surfaceSunk;
  const mark = tone === 'bad' ? colors.bad : tone === 'warn' ? colors.warn : colors.inkSoft;
  const icon: IconName = code === 'offline' ? 'offline' : tone === 'bad' ? 'error' : tone === 'warn' ? 'warning' : 'info';
  return (
    <Arrive enter={enter}>
      <View style={[styles.note, { backgroundColor: fill }]}>
        <Icon name={icon} color={mark} />
        <View style={styles.flex}>
          <Txt>{message}</Txt>
          {onRetry !== undefined && retryLabel !== undefined ? (
            <Button
              variant="plain"
              size="sm"
              icon="retry"
              label={retryLabel}
              disabled={busy}
              onPress={onRetry}
              style={styles.textButton}
            />
          ) : null}
        </View>
      </View>
    </Arrive>
  );
}

// --- The answer ----------------------------------------------------------------

// The band behind a checked number (brand spec, section 11): 5 of room at
// each end, top corners 6, foot corners 2. These belong to the band alone.
const BAND_PADDING = 5;
const BAND_TOP = 6;
const BAND_FOOT = 2;
// The stamp under an answer is 28 (brand spec, section 11), and so is the
// warning sign that takes its place.
const STAMP = 28;
// A thing that arrives never starts from nothing: from a little smaller.
const STAMP_FROM = 0.9;

const WEB = Platform.OS === 'web';
// A number and its unit ("4.68 M") stay on one line, so a band is never cut
// in two.
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
// A run of text on a phone cannot take padding, so the band gets its room
// from a narrow space that never breaks at each end. The browser pads the
// band itself.
const BAND_AIR = WEB ? '' : String.fromCharCode(0x202f);

// The stamp lands once, after the card that holds it has arrived.
const STAMP_LAND: CSSAnimationProperties<ViewStyle> = {
  animationName: {
    from: { opacity: 0, transform: [{ scale: STAMP_FROM }] },
    to: { opacity: 1, transform: [{ scale: 1 }] },
  },
  animationDuration: duration.exit,
  animationDelay: duration.sweep,
  animationTimingFunction: curve.standard,
  animationFillMode: 'both',
};

// What a screen reader hears: the whole sentence, with "checked" or "could
// not be matched" said after each number.
function spokenAnswer(segments: AnswerSegment[], checkedWord: string, unmatchedWord: string): string {
  let spoken = '';
  segments.forEach((segment, index) => {
    if (segment.number === undefined) {
      spoken += segment.text;
      return;
    }
    const next = segments[index + 1]?.text ?? '';
    spoken += `${segment.text}, ${segment.verified ? checkedWord : unmatchedWord}${/^\s/.test(next) ? ',' : ''}`;
  });
  return spoken;
}

// The answer sentence, with every number it states marked inside the line of
// text: a number the phone matched with its own calculation stands on the
// highlight band with a solid line under it; one it could not match gets a
// dashed line and no band. Which is which comes from the Ask flow's check and
// from nothing else.
function AnswerText({ text, segments }: { text: string; segments: AnswerSegment[] }) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const ta = useLocalT(ASK_STRINGS);

  // The taller answer line, so bands on neighbouring lines never touch.
  const tall = language === 'hi' || hasDevanagari(text) ? ANSWER_LINE.devanagari : ANSWER_LINE.latin;
  const line = Math.max(lineHeightFor('body', language, text), tall);

  // In the browser a run of text is a box, so the band is drawn exactly: its
  // padding, its corners and the 2 line at its foot. On a phone a run can only
  // take a background and an underline, so the line is the underline.
  const checked: TextStyle = WEB
    ? {
        color: colors.onLight,
        backgroundColor: colors.lightSoft,
        paddingHorizontal: BAND_PADDING,
        borderTopStartRadius: BAND_TOP,
        borderTopEndRadius: BAND_TOP,
        borderBottomStartRadius: BAND_FOOT,
        borderBottomEndRadius: BAND_FOOT,
        borderBottomWidth: border.strong,
        borderBottomColor: colors.checkedLine,
      }
    : {
        color: colors.onLight,
        backgroundColor: colors.lightSoft,
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
        textDecorationColor: colors.checkedLine,
      };
  // Where a platform cannot dash an underline it draws it solid, still in the
  // warning colour.
  const unmatched: TextStyle = WEB
    ? {
        color: colors.ink,
        borderBottomWidth: border.strong,
        borderBottomColor: colors.warn,
        borderStyle: 'dashed',
      }
    : {
        color: colors.ink,
        textDecorationLine: 'underline',
        textDecorationStyle: 'dashed',
        textDecorationColor: colors.warn,
      };

  return (
    <Txt
      selectable
      accessibilityLabel={spokenAnswer(segments, ta('spokenChecked'), ta('spokenUnmatched'))}
      style={{ lineHeight: line }}>
      {segments.map((segment, index) => {
        if (segment.number === undefined) return segment.text;
        const shown = segment.text.replace(/ /g, NO_BREAK_SPACE);
        // Digits in the figures face; a number written with a Hindi unit keeps
        // the text face, which has those letters.
        const face = hasDevanagari(shown) ? textFont('600', language, shown) : figureFont();
        return (
          <Text key={index} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[face, segment.verified ? checked : unmatched]}>
            {segment.verified ? `${BAND_AIR}${shown}${BAND_AIR}` : shown}
          </Text>
        );
      })}
    </Txt>
  );
}

// The sun stamp: a disc of light with its ring and the tick. It is only ever
// drawn when every number in the answer matched.
function Stamp() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      aria-hidden
      style={[
        styles.stamp,
        { backgroundColor: colors.light, borderColor: colors.checkedLine },
        reduced ? null : STAMP_LAND,
      ]}>
      <Icon name="check" size={sizes.iconSmall} color={colors.onLight} />
    </Animated.View>
  );
}

// Under the answer: how the check went, and the count. Three forms, told
// apart by shape and not only by their digits: the stamp when every number
// matched, the warning sign when some did not, a filled warning note when
// none did.
function Signature({ matched, total }: { matched: number; total: number }) {
  const { colors } = useTheme();
  const t = useT();
  const ta = useLocalT(ASK_STRINGS);
  const numbers = useNumbers();

  const all = matched === total;
  const none = matched === 0;
  const first = all ? t('ask.checked') : t('ask.unchecked', { count: numbers.count(total - matched) });
  const count = ta(total === 1 ? 'countOne' : 'countMany', {
    checked: numbers.count(matched),
    total: numbers.count(total),
  });

  return (
    <View
      accessible
      style={[
        styles.signature,
        none
          ? [styles.signatureNote, { backgroundColor: colors.warnSoft }]
          : [styles.signatureRule, { borderTopColor: colors.line }],
      ]}>
      {all ? <Stamp /> : <Icon name="warning" size={STAMP} color={colors.warn} />}
      <View style={styles.flex}>
        <Txt variant="label">{first}</Txt>
        <Txt variant="small" tone="soft">
          {count}
        </Txt>
      </View>
    </View>
  );
}

// An answer: the sentence with its numbers marked, how it was worked out,
// and the result of the check with its count. "Couldn't work that out"
// replies offer ready-made questions instead.
export function AnswerCard({
  result,
  suggestions,
  onAsk,
  busy,
}: {
  result: AskResult;
  suggestions: string[];
  onAsk: (question: string) => void;
  busy: boolean;
}) {
  const t = useT();

  if (result.kind === 'cannot') {
    return (
      <AssistantPanel enter>
        <Txt>{t('ask.cannot')}</Txt>
        <View style={styles.suggestions}>
          {suggestions.map((question) => (
            <SuggestionRow key={question} text={question} onPress={() => onAsk(question)} disabled={busy} />
          ))}
        </View>
        <ProofDetails proof={result.proof} />
      </AssistantPanel>
    );
  }

  return (
    <AssistantPanel enter>
      <AnswerText text={result.text} segments={result.segments} />
      <ProofDetails proof={result.proof} />
      {result.checked > 0 ? (
        <Signature matched={result.checked - result.unverified} total={result.checked} />
      ) : null}
    </AssistantPanel>
  );
}

// --- How it was worked out -------------------------------------------------------

// "How LUMIQ worked this out", as a sunk block inside the answer: closed, it
// says where the answer came from; open, it shows the steps run on the phone,
// the result table, how many rows were used, and exactly what was sent to the
// AI.
function ProofDetails({ proof }: { proof: AskProof }) {
  const { colors } = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const reduced = useReducedMotion();
  const rtl = useIsRTL();
  const [open, setOpen] = useState(false);
  const [showSent, setShowSent] = useState(false);

  const rowsLine =
    proof.rowsUsed > 0
      ? t('ask.rowsUsed', { used: numbers.count(proof.rowsUsed), total: numbers.count(proof.totalRows) })
      : null;
  // The one line the closed block shows under its title.
  const summary = proof.fromSummary ? t('ask.fromSummary') : rowsLine;
  // The chevron points along the reading direction, so the quarter turn that
  // makes it point down (closed) or up (open) depends on that direction.
  const down = rtl ? '-90deg' : '90deg';
  const up = rtl ? '90deg' : '-90deg';

  return (
    <Card variant="sunk" flush style={styles.proof}>
      <Press
        feedback="highlight"
        weight="lg"
        onPress={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={styles.proofHead}>
        <View style={styles.proofTitle}>
          <Txt variant="label" style={styles.flex}>
            {t('ask.howTitle')}
          </Txt>
          <Animated.View
            style={[
              { transform: [{ rotate: open ? up : down }] },
              transition(['transform'], duration.quick, 'standard', reduced),
            ]}>
            <Icon name="chevron" size={sizes.iconSmall} color={colors.inkSoft} />
          </Animated.View>
        </View>
        {!open && summary !== null ? (
          <Txt variant="small" tone="soft">
            {summary}
          </Txt>
        ) : null}
      </Press>

      {open && (
        <View style={styles.proofBody}>
          {proof.fromSummary ? (
            <Txt variant="small" tone="soft">
              {t('ask.fromSummary')}
            </Txt>
          ) : (
            <>
              {proof.steps.map((step, index) => (
                <View key={index} style={styles.proofStep}>
                  <Txt variant="small" tone="soft" style={styles.stepNumber}>
                    {numbers.count(index + 1)}
                  </Txt>
                  <Txt variant="small" style={styles.flex}>
                    {step}
                  </Txt>
                </View>
              ))}
              {proof.table.length > 0 && <ResultTable rows={proof.table} />}
              {rowsLine !== null && (
                <Txt variant="small" tone="soft">
                  {rowsLine}
                </Txt>
              )}
            </>
          )}
          <Txt variant="small" tone="soft">
            {t('ask.sentSummary')}
          </Txt>
          <Button
            variant="plain"
            size="sm"
            label={showSent ? t('ask.hideSent') : t('ask.showSent')}
            onPress={() => setShowSent((value) => !value)}
            aria-expanded={showSent}
            style={styles.textButton}
          />
          {showSent &&
            proof.sent.map((prompt, index) => (
              <View key={index} style={[styles.sentBox, { backgroundColor: colors.surface }]}>
                <Txt variant="small" weight="600">
                  {t(SENT_LABEL[prompt.label])}
                </Txt>
                <Text
                  selectable
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={[styles.mono, { color: colors.inkSoft }]}>
                  {prompt.text}
                </Text>
              </View>
            ))}
        </View>
      )}
    </Card>
  );
}

function cellText(value: unknown, numbers: Numbers): string {
  if (typeof value === 'number') return numbers.exact(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// The narrowest and the widest a column of the result table is drawn. They
// belong to this table alone.
const CELL_MIN = 96;
const CELL_MAX = 180;

// The calculation's result, exact figures, at most eight rows.
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const { colors } = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const columns = Object.keys(rows[0] ?? {});
  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { backgroundColor: colors.surface }]}>
          <View style={styles.tableRow}>
            {columns.map((column) => (
              <Txt key={column} variant="small" weight="600" style={styles.cell}>
                {prettyColumn(column)}
              </Txt>
            ))}
          </View>
          {rows.slice(0, TABLE_ROWS).map((row, index) => (
            <View key={index} style={[styles.tableRow, styles.bodyRow, { borderTopColor: colors.line }]}>
              {columns.map((column) => (
                <Txt
                  key={column}
                  variant="small"
                  style={[styles.cell, typeof row[column] === 'number' && styles.numberCell]}>
                  {cellText(row[column], numbers)}
                </Txt>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {rows.length > TABLE_ROWS && (
        <Txt variant="small" tone="soft">
          {t('ask.moreRows', { count: numbers.count(rows.length - TABLE_ROWS) })}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // The card of the brand board: the parts of an answer sit 12 apart.
  panel: { gap: space.md },

  working: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  steps: { gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mark: { width: sizes.iconSmall, height: sizes.iconSmall, alignItems: 'center', justifyContent: 'center' },
  dot: { width: space.md, height: space.md, borderRadius: radius.pill, borderWidth: border.strong },

  // The status note of the brand board: radius 14, at least 48 high.
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: sizes.target,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
  },
  // A text button keeps 12 of room at each end of its words. Pulling it back
  // by 12 lines its first word up with the words above it.
  textButton: { alignSelf: 'flex-start', marginStart: -space.md },

  signature: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  // Some or all matched: a plain footer under a 1 rule.
  signatureRule: { borderTopWidth: border.hairline, paddingTop: space.md },
  // None matched: the footer becomes a filled warning note.
  signatureNote: { padding: space.md, borderRadius: radius.control },
  stamp: {
    width: STAMP,
    height: STAMP,
    borderRadius: radius.pill,
    borderWidth: border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestions: { gap: space.sm },

  // The well clips the highlight of its own header to its corners.
  proof: { overflow: 'hidden' },
  proofHead: { minHeight: sizes.target, justifyContent: 'center', padding: space.md, gap: space.xs },
  proofTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  proofBody: { gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md },
  proofStep: { flexDirection: 'row', gap: space.sm },
  stepNumber: { minWidth: space.lg, fontVariant: ['tabular-nums'] },
  sentBox: { borderRadius: radius.control, padding: space.md, gap: space.xs },
  // Exactly what was sent, letter for letter, in the phone's fixed-width
  // face. It can hold any script, so it takes the taller line.
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineDeva,
  },
  tableWrap: { gap: space.xs },
  table: { borderRadius: radius.control, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  bodyRow: { borderTopWidth: border.hairline },
  cell: { minWidth: CELL_MIN, maxWidth: CELL_MAX, paddingHorizontal: space.md, paddingVertical: space.sm },
  numberCell: { fontVariant: ['tabular-nums'] },
});
