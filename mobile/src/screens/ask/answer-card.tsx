import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import type { AskProof, AskResult, SentPrompt } from '@/ai/ask-flow';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/i18n';
import { useT } from '@/state/app-state';
import { formatCount, formatExact, prettyColumn } from '@/utils/format';

import { SuggestionButton } from './suggestion-button';

const TABLE_ROWS = 8;

const SENT_LABEL: Record<SentPrompt['label'], StringKey> = {
  plan: 'ask.sent.plan',
  retry: 'ask.sent.retry',
  answer: 'ask.sent.answer',
};

// LUMIQ's side of the chat: a card with a small "LUMIQ" header.
export function AssistantCard({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={18} color={colors.secondary} />
        <AppText variant="small" style={{ color: colors.secondary, fontWeight: '700' }}>
          LUMIQ
        </AppText>
      </View>
      {children}
    </View>
  );
}

// An answer, with every number it states marked: bold when it matches the
// calculation, underlined in amber when it does not. "Couldn't work that
// out" replies offer ready-made questions instead.
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
      <AssistantCard>
        <AppText>{t('ask.cannot')}</AppText>
        {suggestions.map((question) => (
          <SuggestionButton key={question} text={question} onPress={() => onAsk(question)} disabled={busy} />
        ))}
        <ProofDetails proof={result.proof} />
      </AssistantCard>
    );
  }

  const allChecked = result.checked > 0 && result.unverified === 0;
  return (
    <AssistantCard>
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
      {result.checked > 0 && (
        <View style={styles.checkRow}>
          <AppIcon
            name={allChecked ? { ios: 'checkmark.seal.fill', android: 'verified' } : { ios: 'exclamationmark.triangle.fill', android: 'warning' }}
            size={18}
            color={allChecked ? colors.success : colors.accent}
          />
          <AppText variant="small" tone={allChecked ? 'success' : 'accent'} style={styles.flex}>
            {allChecked ? t('ask.checked') : t('ask.unchecked', { count: result.unverified })}
          </AppText>
        </View>
      )}
      <ProofDetails proof={result.proof} />
    </AssistantCard>
  );
}

// "How LUMIQ worked this out": the steps run on the phone, the result table,
// how many rows were used, and exactly what was sent to the AI.
function ProofDetails({ proof }: { proof: AskProof }) {
  const colors = useTheme();
  const t = useT();
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
        <AppIcon
          name={open ? { ios: 'chevron.up', android: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more' }}
          size={22}
          color={colors.primary}
        />
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
                <AppText key={index} variant="small">{`•  ${step}`}</AppText>
              ))}
              {proof.table.length > 0 && <ResultTable rows={proof.table} />}
              {proof.rowsUsed > 0 && (
                <AppText variant="small" tone="secondary">
                  {t('ask.rowsUsed', { used: formatCount(proof.rowsUsed), total: formatCount(proof.totalRows) })}
                </AppText>
              )}
            </>
          )}
          <AppText variant="small" tone="secondary">
            {t('ask.sentSummary')}
          </AppText>
          <Pressable onPress={() => setShowSent((value) => !value)} accessibilityRole="button" hitSlop={6}>
            <AppText variant="small" tone="primary" style={styles.link}>
              {showSent ? t('ask.hideSent') : t('ask.showSent')}
            </AppText>
          </Pressable>
          {showSent &&
            proof.sent.map((prompt, index) => (
              <View key={index} style={[styles.sentBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
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

function cellText(value: unknown): string {
  if (typeof value === 'number') return formatExact(value);
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// The calculation's result, exact figures, at most eight rows.
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const colors = useTheme();
  const t = useT();
  const columns = Object.keys(rows[0] ?? {});
  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { borderColor: colors.border }]}>
          <View style={[styles.tableRow, { backgroundColor: colors.background }]}>
            {columns.map((column) => (
              <AppText key={column} variant="small" style={[styles.cell, styles.headCell]}>
                {prettyColumn(column)}
              </AppText>
            ))}
          </View>
          {rows.slice(0, TABLE_ROWS).map((row, index) => (
            <View key={index} style={[styles.tableRow, { borderTopColor: colors.border }, styles.bodyRow]}>
              {columns.map((column) => (
                <AppText key={column} variant="small" style={styles.cell}>
                  {cellText(row[column])}
                </AppText>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {rows.length > TABLE_ROWS && (
        <AppText variant="small" tone="secondary">
          {t('ask.moreRows', { count: rows.length - TABLE_ROWS })}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginRight: Spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  verified: { fontWeight: '700' },
  unverified: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  proof: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  proofBody: { gap: Spacing.sm },
  link: { textDecorationLine: 'underline', paddingVertical: Spacing.xs },
  sentBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  sentLabel: { fontWeight: '700' },
  mono: { fontFamily: 'monospace', fontSize: 12, lineHeight: 17 },
  tableWrap: { gap: Spacing.xs },
  table: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: { minWidth: 96, maxWidth: 180, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  headCell: { fontWeight: '700' },
});
