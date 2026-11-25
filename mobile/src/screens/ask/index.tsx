import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { AskError, isAskConfigured, type AskErrorCode } from '@/ai/ask-client';
import { answerQuestion, type AskContextItem, type AskResult, type AskStage } from '@/ai/ask-flow';
import { hapticSuccess } from '@/components/haptics';
import { NoFileChosen } from '@/components/no-file-chosen';
import type { Dataset } from '@/data/types';
import type { StringKey } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { getAiConsent, setAiConsent, useAiConsent } from '@/state/consent';
import { useActiveDataset } from '@/state/datasets';
import { radius, rhythm, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { suggestedQuestions } from '@/utils/suggested-questions';

import { AnswerCard, ErrorPanel, WorkingPanel } from './answer-card';
import { AskInput } from './ask-input';
import { ConsentCard } from './consent-card';
import { FileChip } from './file-chip';
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

// The corner of the question bubble that points to the speaker (brand board,
// the Ask screen). It belongs to the bubble alone.
const BUBBLE_TAIL = 6;

let lastId = 0;
const nextId = () => ++lastId;

// Ask: questions about the chosen file in the user's own words, answered by
// LUMIQ's built-in AI. The calculation itself runs on the phone.
export function Ask() {
  const dataset = useActiveDataset();
  // One chat per file: opening another file starts a fresh chat.
  return dataset ? <AskChat key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

// The person's own question, at the end of the row.
function QuestionBubble({ text, speaker }: { text: string; speaker: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.userBubble, { backgroundColor: colors.userBubble }]}
      accessible
      accessibilityLabel={`${speaker}: ${text}`}>
      <Txt selectable color={colors.onUserBubble}>
        {text}
      </Txt>
    </View>
  );
}

function AskChat({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const t = useT();
  const { language } = useAppState();
  const numbers = useNumbers();
  const headerHeight = useHeaderHeight();
  const configured = isAskConfigured();
  const consent = useAiConsent();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState<number | null>(null);
  // A question that was asked before the person allowed sending. It has not
  // left the phone: it waits here while the permission card is shown.
  const [waiting, setWaiting] = useState<string | null>(null);
  const contextRef = useRef<AskContextItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const suggestions = useMemo(() => suggestedQuestions(dataset, language), [dataset, language]);

  // The question the permission card is asking about, while there is one.
  const held = consent === 'yes' ? null : waiting;

  useEffect(() => {
    // Permission taken back while an answer is on its way: stop, so nothing
    // more of that question is sent.
    if (consent !== 'yes') abortRef.current?.abort();
  }, [consent]);

  useEffect(() => {
    // The settings file has a second writer (see @/state/consent), which
    // saves when the open file, the language or the number style changes and
    // can put back an old answer. Saving the answer again right after it
    // keeps the file true. Nothing is written when the file already agrees.
    setAiConsent(getAiConsent());
  }, [dataset.id, language, numbers]);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || busy || !configured) return;
    // Until the person has said yes, nothing leaves the phone. The question
    // waits and the permission card is shown instead. Read at this moment, not
    // from the last render, so an answer given a moment ago is never missed.
    if (getAiConsent() !== 'yes') {
      Keyboard.dismiss();
      setWaiting(question);
      return;
    }
    setWaiting(null);
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
      // One success haptic, in the frame the stamp starts to land; none when
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

  // "Allow": the answer is saved, and the question that was waiting is sent.
  const allow = () => {
    const question = waiting;
    setAiConsent('yes');
    setWaiting(null);
    if (question !== null) void ask(question);
  };

  // "Not now": the answer is saved and nothing is sent. The screen stays as it
  // was; the next question brings the card back.
  const notNow = () => {
    setAiConsent('no');
    setWaiting(null);
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    stop();
    contextRef.current = [];
    setWaiting(null);
    setItems([]);
  };

  const footer = questionsLeft !== null ? t('ask.left', { count: numbers.count(questionsLeft) }) : null;

  return (
    // Padding on both platforms: Expo apps are edge-to-edge on Android, so the
    // window no longer resizes for the keyboard and the question box would stay
    // under it. The offset is the header above this screen.
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.ground }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.flex}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          // While the permission card is up, it is brought into view from its
          // top (see below), not from its foot.
          if (items.length > 0 && held === null) scrollRef.current?.scrollToEnd({ animated: true });
        }}>
        <FileChip dataset={dataset} />

        {!configured && <ErrorPanel code="not_configured" message={t('ask.error.notConfigured')} />}

        <View style={styles.privacy} accessible accessibilityLabel={t('ask.privacy')}>
          <Icon name="lock" size={sizes.iconSmall} color={colors.inkSoft} />
          <Txt variant="small" tone="soft" style={styles.flex}>
            {t('ask.privacy')}
          </Txt>
        </View>

        {items.length === 0 && held === null ? (
          <View style={styles.intro}>
            <Txt variant="heading">{t('ask.intro')}</Txt>
            <Txt variant="small" tone="soft">
              {t('ask.tryThese')}
            </Txt>
            <View style={styles.suggestions}>
              {suggestions.map((question) => (
                <SuggestionRow key={question} text={question} onPress={() => ask(question)} disabled={!configured || busy} />
              ))}
            </View>
          </View>
        ) : (
          <>
            {items.map((item) => {
              if (item.role === 'user') return <QuestionBubble key={item.id} text={item.text} speaker={t('ask.you')} />;
              if (item.state === 'working') return <WorkingPanel key={item.id} stages={item.stages} />;
              if (item.state === 'error') {
                return (
                  <ErrorPanel
                    key={item.id}
                    enter
                    code={item.code}
                    message={t(ERROR_TEXT[item.code], { limit: item.limit ?? '' })}
                    retryLabel={t('ask.retry')}
                    onRetry={RETRYABLE.has(item.code) ? () => ask(item.question) : undefined}
                    busy={busy}
                  />
                );
              }
              return <AnswerCard key={item.id} result={item.result} suggestions={suggestions} onAsk={ask} busy={busy} />;
            })}
            {held !== null ? (
              // The question that is waiting, and the card that asks before it
              // is sent. Brought into view from the top, so the card is read
              // before its buttons are reached.
              <View
                style={styles.held}
                onLayout={(event) => {
                  const { y } = event.nativeEvent.layout;
                  // One frame later, so the card is on screen before the view
                  // moves to it.
                  requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: true }));
                }}>
                <QuestionBubble text={held} speaker={t('ask.you')} />
                <ConsentCard onAllow={allow} onNotNow={notNow} />
              </View>
            ) : null}
            {!busy && held === null ? (
              <Button variant="plain" icon="add" label={t('ask.newChat')} onPress={newChat} style={styles.newChat} />
            ) : null}
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
  content: { padding: rhythm.screenEdge, gap: rhythm.cardGap, paddingBottom: space.xxl },
  // The lock sits on the first line of the sentence beside it.
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.xs },
  intro: { gap: space.md, marginTop: space.sm },
  suggestions: { gap: space.sm },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderBottomEndRadius: BUBBLE_TAIL,
  },
  // The waiting question and the permission card, spaced like the chat.
  held: { gap: rhythm.cardGap },
  newChat: { alignSelf: 'center' },
});
