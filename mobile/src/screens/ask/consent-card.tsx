import { StyleSheet, View } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Txt } from '@/ui/text';

import { AssistantPanel } from './answer-card';
import { ASK_STRINGS } from './strings';

// The two buttons share a row and grow from this width, so they are always
// the same size; on a very narrow card they stack, still the same size.
const BUTTON_BASIS = 120;

// One thing the person should know before saying yes: a small icon, what it
// is about, and the plain sentence. One stop for a screen reader.
function Fact({ icon, label, children }: { icon: IconName; label: string; children: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fact} accessible>
      <Icon name={icon} size={sizes.iconSmall} color={colors.inkSoft} />
      <View style={styles.factWords}>
        <Txt variant="label">{label}</Txt>
        <Txt variant="small" tone="soft">
          {children}
        </Txt>
      </View>
    </View>
  );
}

// Permission before the first question: shown in the chat, in place of
// sending, until the person has said yes. It says what is sent, who receives
// it and what never leaves the phone. The two answers have the same weight:
// neither is made to look like the right one.
export function ConsentCard({ onAllow, onNotNow }: { onAllow: () => void; onNotNow: () => void }) {
  const t = useLocalT(ASK_STRINGS);
  return (
    <AssistantPanel enter>
      <Txt variant="heading" accessibilityRole="header">
        {t('consentTitle')}
      </Txt>
      <Fact icon="share" label={t('consentSentLabel')}>
        {t('consentSent')}
      </Fact>
      <Fact icon="language" label={t('consentWhoLabel')}>
        {t('consentWho')}
      </Fact>
      <Fact icon="lock" label={t('consentNeverLabel')}>
        {t('consentNever')}
      </Fact>
      <View style={styles.buttons}>
        <Button variant="quiet" label={t('consentNotNow')} onPress={onNotNow} style={styles.button} />
        <Button variant="quiet" label={t('consentAllow')} onPress={onAllow} style={styles.button} />
      </View>
    </AssistantPanel>
  );
}

const styles = StyleSheet.create({
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  // Takes the room that is left, so long words wrap inside it.
  factWords: { flex: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: { flexGrow: 1, flexShrink: 1, flexBasis: BUTTON_BASIS },
});
