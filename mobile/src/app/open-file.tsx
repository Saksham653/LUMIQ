import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportError } from '@/data/import-file';
import { defineStrings, useLocalT } from '@/i18n/local';
import { useAppState, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { rhythm, space, useTheme } from '@/theme';
import { EmptyState } from '@/ui/empty-state';
import { error as errorHaptic } from '@/ui/haptics';
import { SomethingBrokeIllustration } from '@/ui/illustrations';
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/ui/skeleton';
import { VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// "Open with LUMIQ": a CSV or Excel file tapped in another app (WhatsApp,
// Files, Gmail) lands here as /open-file?uri=… (see +native-intent.tsx). The
// page says the file is opening and hands it to the normal import, which
// shows the import review when it is needed and opens the file afterwards.
//
// This route sits outside the Stack.Protected groups of the root layout, so
// it is reached before the welcome screen is finished too. Opening a file
// this way counts as finishing it, the same as "Open your own file" on the
// welcome screen; otherwise the opened file would land behind the welcome
// screen.
//
// In the browser there is no other app to open from: the page shows its
// failure state.

const STRINGS = defineStrings({
  en: {
    wait: 'A big file can take a moment.',
    noFile: 'No file came with this link. You can open one from Home.',
    phoneOnly: 'Files from other apps open in the LUMIQ app on your phone, not in the browser.',
    couldNotRead: 'LUMIQ could not read this file. Save it to your phone, then open it from Home.',
  },
  hi: {
    wait: 'बड़ी फ़ाइल में थोड़ा समय लग सकता है।',
    noFile: 'इस लिंक के साथ कोई फ़ाइल नहीं आई। आप होम से फ़ाइल खोल सकते हैं।',
    phoneOnly: 'दूसरे ऐप की फ़ाइलें आपके फ़ोन के LUMIQ ऐप में खुलती हैं, ब्राउज़र में नहीं।',
    couldNotRead: 'LUMIQ यह फ़ाइल पढ़ नहीं सका। इसे पहले फ़ोन में सेव करें, फिर होम से खोलें।',
  },
});

// The widest the page gets on a tablet.
const PAGE_WIDTH = 560;

const FILE_LINK = /^(content|file):\/\//i;
const WRAPPED_FILE_LINK = /^(content|file)%3A/i;

// The file link from the page's address, or null when there is none.
// +native-intent wraps it twice and the router normally takes both wraps
// off; whatever wrap is left (a router that unwraps once) is peeled here.
function readFileLink(param: string | string[] | undefined): string | null {
  let value = (Array.isArray(param) ? param[0] : param)?.trim() ?? '';
  for (let layer = 0; layer < 2 && WRAPPED_FILE_LINK.test(value); layer += 1) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return FILE_LINK.test(value) ? value : null;
}

// What became of the file this page was asked to open. Kept with its link,
// so a second file sent while the page is still up starts afresh.
type Outcome = { uri: string; kind: 'opened' } | { uri: string; kind: 'failed'; error: unknown };

export default function OpenFileRoute() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const lt = useLocalT(STRINGS);
  const { onboarded, completeOnboarding } = useAppState();
  const { importFromUri } = useDatasets();
  const params = useLocalSearchParams();
  const uri = readFileLink(params.uri);
  const canOpen = uri !== null && Platform.OS !== 'web';

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // The link already handed to the import: each link is opened once, also
  // when the effect runs again (a new file list, development's double run).
  const started = useRef<string | null>(null);

  useEffect(() => {
    if (uri === null || Platform.OS === 'web' || started.current === uri) return;
    const link: string = uri;
    started.current = link;
    if (!onboarded) completeOnboarding();
    // Through a promise, so even a slip that throws at once lands in the
    // failure state instead of breaking the page.
    Promise.resolve()
      .then(() => importFromUri(link))
      .then(
        () => setOutcome({ uri: link, kind: 'opened' }),
        (error: unknown) => {
          errorHaptic();
          setOutcome({ uri: link, kind: 'failed', error });
        },
      );
  }, [uri, onboarded, completeOnboarding, importFromUri]);

  const current = outcome !== null && outcome.uri === uri ? outcome : null;

  // The import has opened the file (or the person stepped back out of it).
  // The redirect waits until this page is on screen again, then sends the
  // person Home instead of leaving them on a finished page.
  if (canOpen && current?.kind === 'opened') {
    return (
      <View style={[styles.fill, { backgroundColor: colors.ground }]}>
        <Redirect href="/" />
      </View>
    );
  }

  let failure: string | null = null;
  if (uri === null) failure = lt('noFile');
  else if (!canOpen) failure = lt('phoneOnly');
  else if (current?.kind === 'failed') {
    failure = current.error instanceof ImportError ? t(current.error.messageKey) : lt('couldNotRead');
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.ground }]}
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
      ]}>
      {failure !== null ? (
        <View accessibilityLiveRegion="polite" style={styles.grow}>
          <EmptyState
            illustration={<SomethingBrokeIllustration />}
            title={t('import.errorTitle')}
            body={failure}
            action={{ label: t('noFile.goHome'), icon: 'home', onPress: () => router.replace('/') }}
          />
        </View>
      ) : (
        <VStack gap="xxl" justify="center" style={styles.grow}>
          <VStack gap="sm">
            <Txt variant="title" accessibilityRole="header" accessibilityLiveRegion="polite">
              {t('import.opening')}
            </Txt>
            <Txt tone="soft">{lt('wait')}</Txt>
          </VStack>
          {/* The shape of the file as it will appear: its row, then a few lines. */}
          <SkeletonCard label={t('import.opening')}>
            <SkeletonRow />
            <SkeletonText lines={2} />
          </SkeletonCard>
        </VStack>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: PAGE_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: rhythm.screenEdge,
  },
  grow: { flexGrow: 1 },
});
