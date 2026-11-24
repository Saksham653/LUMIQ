import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { AskError, isAskConfigured, type AskErrorCode } from '@/ai/ask-client';
import { answerQuestion, type AskContextItem, type AskResult, type AskStage } from '@/ai/ask-flow';
import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { FileHeader } from '@/components/file-header';
import { Group } from '@/components/grouped';
import { hapticSuccess } from '@/components/haptics';
import { NoFileChosen } from '@/components/no-file-chosen';
import { PressableScale } from '@/components/pressable-scale';
import { PrivacyNote } from '@/components/privacy-note';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { suggestedQuestions } from '@/utils/suggested-questions';

import { AnswerCard, AssistantPanel, WorkingPanel } from './answer-card';
import { AskInput } from './ask-input';
import { SuggestionRow } from './suggestion-button';

type ChatItem =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; state: 'working'; stages: AskStage[] }
  | { id: number; role: 'assistant'; state: 'done'; result: AskResult }
  | { id: number; role: 'assistant'; state: 'error'; code: AskErrorCode; limit: number | null; question: string };

const ERROR_TEXT: Record<AskErrorCode, StringKey> = {
  not_configured: 'ask.error.notConfigured',
  device_limit: 'ask.error.deviceLimit',
  busy: 'ask.error.busy',
  offline: 'ask.error.offline',
  failed: 'ask.error.failed',
  stopped: 'ask.stopped',
};

const RETRYABLE = new Set<AskErrorCode>(['busy', 'offline', 'failed', 'stopped']);

let lastId = 0;
const nextId = () => ++lastId;

// Ask: questions about the chosen file in the user's own words, answered by
// LUMIQ's built-in AI. The calculation itself runs on the phone.
export function Ask() {
  const dataset = useActiveDataset();
  // One chat per file: opening another file starts a fresh chat.
  return dataset ? <AskChat key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

function AskChat({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const { language } = useAppState();
  const numbers = useNumbers();
  const headerHeight = useHeaderHeight();
  const configured = isAskConfigured();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState<number | null>(null);
  const contextRef = useRef<AskContextItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const suggestions = useMemo(() => suggestedQuestions(dataset, language), [dataset, language]);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || busy || !configured) return;
    setInput('');
    const answerId = nextId();
    const replace = (update: (item: ChatItem) => ChatItem) =>
      setItems((previous) => previous.map((entry) => (entry.id === answerId ? update(entry) : entry)));
    setItems((previous) => [
      ...previous,
      { id: nextId(), role: 'user', text: question },
      { id: answerId, role: 'assistant', state: 'working', stages: ['planning'] },
    ]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await answerQuestion({
        dataset,
        question,
        context: contextRef.current,
        language,
        numberFormat: numbers.format,
        signal: controller.signal,
        // Real stages from the flow, never a timer.
        onStage: (stage) =>
          replace((item) =>
            item.role === 'assistant' && item.state === 'working' && !item.stages.includes(stage)
              ? { ...item, stages: [...item.stages, stage] }
              : item,
          ),
      });
      replace(() => ({ id: answerId, role: 'assistant', state: 'done', result }));
      // One success haptic, in the frame the check starts to draw; none when
      // a number could not be matched.
      if (result.kind === 'answer' && result.checked > 0 && result.unverified === 0) hapticSuccess();
      if (result.questionsLeft !== null) setQuestionsLeft(result.questionsLeft);
      if (result.kind === 'answer' && result.context) {
        contextRef.current = [...contextRef.current, result.context].slice(-3);
      }
    } catch (error) {
      const failure = error instanceof AskError ? error : new AskError('failed');
      if (failure.code === 'device_limit') setQuestionsLeft(0);
      replace(() => ({ id: answerId, role: 'assistant', state: 'error', code: failure.code, limit: failure.limit, question }));
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    stop();
    contextRef.current = [];
    setItems([]);
  };

  const footer = questionsLeft !== null ? t('ask.left', { count: numbers.count(questionsLeft) }) : null;

  return (
    // Padding on both platforms: Expo apps are edge-to-edge on Android, so the
    // window no longer resizes for the keyboard and the question box would stay
    // under it. The offset is the header above this screen.
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.flex}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (items.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
        }}>
        <FileHeader dataset={dataset} />

        {!configured && (
          <View style={[styles.notice, { backgroundColor: colors.accentContainer }]}>
            <AppIcon name={{ ios: 'info.circle.fill', android: 'info' }} size={22} color={colors.accent} />
            <AppText style={styles.flex}>{t('ask.error.notConfigured')}</AppText>
          </View>
        )}

        <PrivacyNote text={t('ask.privacy')} align="start" />

        {items.length === 0 ? (
          <View style={styles.intro}>
            <AppText variant="heading">{t('ask.intro')}</AppText>
            <AppText variant="small" tone="secondary">
              {t('ask.tryThese')}
            </AppText>
            <Group>
              {suggestions.map((question) => (
                <SuggestionRow key={question} text={question} onPress={() => ask(question)} disabled={!configured || busy} />
              ))}
            </Group>
          </View>
        ) : (
          <>
            {items.map((item) => {
              if (item.role === 'user') {
                return (
                  <View
                    key={item.id}
                    style={[styles.userBubble, { backgroundColor: colors.userBubble }]}
                    accessible
                    accessibilityLabel={`${t('ask.you')}: ${item.text}`}>
                    <AppText selectable style={{ color: colors.onUserBubble }}>
                      {item.text}
                    </AppText>
                  </View>
                );
              }
              if (item.state === 'working') return <WorkingPanel key={item.id} stages={item.stages} />;
              if (item.state === 'error') {
                return (
                  <AssistantPanel key={item.id} enter>
                    <AppText>{t(ERROR_TEXT[item.code], { limit: item.limit ?? '' })}</AppText>
                    {RETRYABLE.has(item.code) && (
                      <Pressable onPress={() => ask(item.question)} disabled={busy} accessibilityRole="button" style={styles.retry}>
                        <AppIcon name={{ ios: 'arrow.clockwise', android: 'refresh' }} size={20} color={colors.primary} />
                        <AppText variant="label" tone="primary" style={styles.flex}>
                          {t('ask.retry')}
                        </AppText>
                      </Pressable>
                    )}
                  </AssistantPanel>
                );
              }
              return <AnswerCard key={item.id} result={item.result} suggestions={suggestions} onAsk={ask} busy={busy} />;
            })}
            {!busy && (
              <PressableScale onPress={newChat} accessibilityRole="button" style={styles.newChat}>
                <AppIcon name={{ ios: 'plus', android: 'add' }} size={20} color={colors.primary} />
                {/* Self-sizing label: snug keeps Android from cutting Hindi short. */}
                <AppText variant="label" tone="primary" snug>
                  {t('ask.newChat')}
                </AppText>
              </PressableScale>
            )}
          </>
        )}
      </ScrollView>

      <AskInput
        value={input}
        onChangeText={setInput}
        onSend={() => ask(input)}
        onStop={stop}
        busy={busy}
        disabled={!configured}
        placeholder={t('ask.placeholder')}
        sendLabel={t('ask.send')}
        stopLabel={t('ask.stop')}
        footer={footer}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  notice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.xxl },
  intro: { gap: Spacing.md, marginTop: Spacing.sm },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xxl,
    borderBottomEndRadius: Spacing.sm,
  },
  retry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  newChat: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
});
