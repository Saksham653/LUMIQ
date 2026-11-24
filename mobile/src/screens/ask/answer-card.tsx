import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import type { AskProof, AskResult, AskStage, SentPrompt } from '@/ai/ask-flow';
import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Group } from '@/components/grouped';
import { PrismLine } from '@/components/prism-line';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/i18n';
import { useNumbers, useT } from '@/state/app-state';
import { prettyColumn, type Numbers } from '@/utils/format';

import { SuggestionRow } from './suggestion-button';

const TABLE_ROWS = 8;

const SENT_LABEL: Record<SentPrompt['label'], StringKey> = {
  plan: 'ask.sent.plan',
  retry: 'ask.sent.retry',
  answer: 'ask.sent.answer',
};

// LUMIQ's side of the chat: a quiet panel with a small "LUMIQ" label. With
// `enter`, it fades in and rises 8 px (250 ms) when it first appears; with
// reduced motion it only fades.
export function AssistantPanel({ children, enter = false }: { children: ReactNode; enter?: boolean }) {
  const colors = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        styles.panel,
        { backgroundColor: colors.card },
        enter
          ? {
              animationName: reduced
                ? { from: { opacity: 0 }, to: { opacity: 1 } }
                : { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
              animationDuration: Motion.base,
              animationTimingFunction: CSS_EASE_OUT,
            }
          : null,
      ]}>
      <AppText variant="small" tone="secondary" style={styles.label}>
        LUMIQ
      </AppText>
      {children}
    </Animated.View>
  );
}

const STEPS: { stage: AskStage; key: StringKey }[] = [
  { stage: 'planning', key: 'ask.stage.planning' },
  { stage: 'calculating', key: 'ask.stage.calculating' },
  { stage: 'writing', key: 'ask.stage.writing' },
];

// While LUMIQ works: the prism line flows, and the three real steps reported
// by the Ask flow light up as they happen (200 ms each change). A step the
// flow skipped (an answer from the column summary needs no calculation) is
// not shown, so nothing pretends to have happened.
export function WorkingPanel({ stages }: { stages: AskStage[] }) {
  const colors = useTheme();
  const t = useT();
  const current = stages[stages.length - 1];
  const currentIndex = STEPS.findIndex((step) => step.stage === current);
  return (
    <AssistantPanel>
      <PrismLine state="working" label={t('ask.working')} />
      <View style={styles.steps} accessibilityLiveRegion="polite">
        {STEPS.map((step, index) => {
          const visited = stages.includes(step.stage);
          if (!visited && index < currentIndex) return null;
          const state = step.stage === current ? 'now' : visited ? 'done' : 'next';
          const color = state === 'now' ? colors.text : state === 'done' ? colors.textSecondary : colors.textTertiary;
          return (
            <View key={step.stage} style={styles.step} accessible={state === 'now'}>
              <View style={styles.mark}>
                {state === 'done' ? (
                  <AppIcon name={{ ios: 'checkmark.circle', android: 'check_circle' }} size={18} color={colors.textSecondary} />
                ) : (
                  <Animated.View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: state === 'now' ? colors.text : 'transparent',
                        borderColor: state === 'now' ? colors.text : colors.textTertiary,
                        transitionProperty: ['backgroundColor', 'borderColor'],
                        transitionDuration: 200,
                      },
                    ]}
                  />
                )}
              </View>
              <Animated.Text
                style={[
                  styles.stepText,
                  { color, fontWeight: state === 'now' ? '600' : '400', transitionProperty: 'color', transitionDuration: 200 },
                ]}>
                {t(step.key)}
              </Animated.Text>
            </View>
          );
        })}
      </View>
    </AssistantPanel>
  );
}

// An answer, with every number it states marked: bold when it matches the
// calculation, a dashed amber underline when it does not. When every number
// matches, the prism line draws into a check. "Couldn't work that out"
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
  const colors = useTheme();
  const t = useT();

  if (result.kind === 'cannot') {
    return (
      <AssistantPanel enter>
        <AppText>{t('ask.cannot')}</AppText>
        <Group style={[styles.suggestions, { backgroundColor: colors.background }]}>
          {suggestions.map((question) => (
            <SuggestionRow key={question} text={question} onPress={() => onAsk(question)} disabled={busy} />
          ))}
        </Group>
        <ProofDetails proof={result.proof} />
      </AssistantPanel>
    );
  }

  const allChecked = result.checked > 0 && result.unverified === 0;
  return (
    <AssistantPanel enter>
      <AppText selectable>
        {result.segments.map((segment, index) =>
          segment.number === undefined ? (
            segment.text
          ) : (
            <Text
              key={index}
              style={
                segment.verified
                  ? styles.verified
                  : [styles.unverified, { color: colors.accent, textDecorationColor: colors.accent }]
              }>
              {segment.text}
            </Text>
          ),
        )}
      </AppText>
      {result.checked > 0 &&
        (allChecked ? (
          <View style={styles.checkBlock}>
            <PrismLine state="verified" />
            <AppText variant="small" tone="success">
              {t('ask.checked')}
            </AppText>
          </View>
        ) : (
          <View style={styles.checkRow}>
            <AppIcon name={{ ios: 'exclamationmark.triangle.fill', android: 'warning' }} size={18} color={colors.accent} />
            <AppText variant="small" tone="accent" style={styles.flex}>
              {t('ask.unchecked', { count: result.unverified })}
            </AppText>
          </View>
        ))}
      <ProofDetails proof={result.proof} />
    </AssistantPanel>
  );
}

// "How LUMIQ worked this out": the steps run on the phone, the result table,
// how many rows were used, and exactly what was sent to the AI.
function ProofDetails({ proof }: { proof: AskProof }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const [open, setOpen] = useState(false);
  const [showSent, setShowSent] = useState(false);

  return (
    <View style={[styles.proof, { borderTopColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        style={styles.toggle}>
        <AppText variant="label" tone="primary" style={styles.flex}>
          {t('ask.howTitle')}
        </AppText>
        <Animated.View
          style={{
            transform: [{ rotate: open ? '180deg' : '0deg' }],
            transitionProperty: 'transform',
            transitionDuration: Motion.fast,
            transitionTimingFunction: CSS_EASE_OUT,
          }}>
          <AppIcon name={{ ios: 'chevron.down', android: 'expand_more' }} size={22} color={colors.primary} />
        </Animated.View>
      </Pressable>

      {open && (
        <View style={styles.proofBody}>
          {proof.fromSummary ? (
            <AppText variant="small" tone="secondary">
              {t('ask.fromSummary')}
            </AppText>
          ) : (
            <>
              {proof.steps.map((step, index) => (
                <View key={index} style={styles.proofStep}>
                  <AppText variant="small" tone="secondary" style={styles.stepNumber}>
                    {numbers.count(index + 1)}
                  </AppText>
                  <AppText variant="small" style={styles.flex}>
                    {step}
                  </AppText>
                </View>
              ))}
              {proof.table.length > 0 && <ResultTable rows={proof.table} />}
              {proof.rowsUsed > 0 && (
                <AppText variant="small" tone="secondary">
                  {t('ask.rowsUsed', { used: numbers.count(proof.rowsUsed), total: numbers.count(proof.totalRows) })}
                </AppText>
              )}
            </>
          )}
          <AppText variant="small" tone="secondary">
            {t('ask.sentSummary')}
          </AppText>
          <Pressable onPress={() => setShowSent((value) => !value)} accessibilityRole="button" hitSlop={6} style={styles.linkRow}>
            <AppText variant="small" tone="primary" style={styles.link}>
              {showSent ? t('ask.hideSent') : t('ask.showSent')}
            </AppText>
          </Pressable>
          {showSent &&
            proof.sent.map((prompt, index) => (
              <View key={index} style={[styles.sentBox, { backgroundColor: colors.surfaceVariant }]}>
                <AppText variant="small" style={styles.sentLabel}>
                  {t(SENT_LABEL[prompt.label])}
                </AppText>
                <Text selectable style={[styles.mono, { color: colors.textSecondary }]}>
                  {prompt.text}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

function cellText(value: unknown, numbers: Numbers): string {
  if (typeof value === 'number') return numbers.exact(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// The calculation's result, exact figures, at most eight rows.
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const columns = Object.keys(rows[0] ?? {});
  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { backgroundColor: colors.background }]}>
          <View style={[styles.tableRow, { backgroundColor: colors.surfaceVariant }]}>
            {columns.map((column) => (
              <AppText key={column} variant="small" style={[styles.cell, styles.headCell]}>
                {prettyColumn(column)}
              </AppText>
            ))}
          </View>
          {rows.slice(0, TABLE_ROWS).map((row, index) => (
            <View key={index} style={[styles.tableRow, styles.bodyRow, { borderTopColor: colors.border }]}>
              {columns.map((column) => (
                <AppText key={column} variant="small" style={[styles.cell, typeof row[column] === 'number' && styles.numberCell]}>
                  {cellText(row[column], numbers)}
                </AppText>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {rows.length > TABLE_ROWS && (
        <AppText variant="small" tone="secondary">
          {t('ask.moreRows', { count: numbers.count(rows.length - TABLE_ROWS) })}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.md, padding: Spacing.xl, borderRadius: Radius.xxl, marginEnd: Spacing.xl },
  label: { fontWeight: '600', letterSpacing: 0.5 },
  steps: { gap: Spacing.md, paddingTop: Spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  mark: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 24 },
  flex: { flex: 1 },
  verified: { fontWeight: '700' },
  unverified: { textDecorationLine: 'underline', textDecorationStyle: 'dashed' },
  checkBlock: { gap: Spacing.sm, paddingTop: Spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  suggestions: { marginHorizontal: -Spacing.sm },
  proof: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  proofBody: { gap: Spacing.sm },
  proofStep: { flexDirection: 'row', gap: Spacing.sm },
  stepNumber: { minWidth: 16, fontVariant: ['tabular-nums'] },
  linkRow: { minHeight: 40, justifyContent: 'center' },
  link: { textDecorationLine: 'underline' },
  sentBox: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  sentLabel: { fontWeight: '700' },
  mono: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  tableWrap: { gap: Spacing.xs },
  table: { borderRadius: Radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: { minWidth: 96, maxWidth: 180, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  numberCell: { fontVariant: ['tabular-nums'] },
  headCell: { fontWeight: '700' },
});
