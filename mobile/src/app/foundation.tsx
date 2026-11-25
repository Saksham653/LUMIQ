import { Redirect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  THEME_MODES,
  border,
  figureFont,
  lift,
  numeralLine,
  numeralSize,
  radius,
  setThemeMode,
  sizes,
  space,
  typeScale,
  useAppFonts,
  useTheme,
  type Palette,
  type ThemeMode,
  type TypeVariant,
} from '@/theme';
import { Icon } from '@/ui/icon';
import { ICON_NAMES } from '@/ui/icon-set';
import { Press } from '@/ui/press';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// A working preview of the design-system foundation (colours, type, icons,
// press, depth) as real app code, for the Phase 1 page on localhost. It is
// replaced by the full component gallery and never ships: outside development
// it sends people home.

const MODE_LABEL: Record<ThemeMode, string> = { system: 'Phone', light: 'Light', dark: 'Dark' };
const VARIANTS = Object.keys(typeScale) as TypeVariant[];
const ENGLISH = 'December was your best month';
const HINDI = 'दिसंबर आपका सबसे अच्छा महीना रहा';

function SectionTitle({ children }: { children: string }) {
  return <Txt variant="title">{children}</Txt>;
}

function Swatch({ role, value, colors }: { role: string; value: string; colors: Palette }) {
  return (
    <VStack gap="xs" style={{ width: '31%' }}>
      <View
        style={{
          height: sizes.target,
          borderRadius: radius.control,
          backgroundColor: value,
          borderWidth: border.hairline,
          borderColor: colors.line,
        }}
      />
      <Txt variant="small" tone="soft" numberOfLines={1}>
        {role}
      </Txt>
    </VStack>
  );
}

export default function FoundationPreview() {
  useAppFonts();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  if (!__DEV__ && process.env.EXPO_PUBLIC_GALLERY !== '1') return <Redirect href="/" />;

  const roles = Object.keys(colors) as (keyof Palette)[];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{
        paddingTop: insets.top + space.xl,
        paddingBottom: insets.bottom + space.huge,
        paddingHorizontal: space.lg,
        gap: space.xxxl,
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
      }}>
      <VStack gap="sm">
        <Txt variant="display">Foundation</Txt>
        <Txt tone="soft">
          The new colours, type, icons and press of LUMIQ, running as real app code. Every component is built on
          these.
        </Txt>
      </VStack>

      <VStack gap="md">
        <SectionTitle>Look</SectionTitle>
        <HStack gap="sm" wrap accessibilityRole="radiogroup">
          {THEME_MODES.map((m) => {
            const chosen = m === mode;
            return (
              <Press
                key={m}
                weight="sm"
                haptic="select"
                onPress={() => setThemeMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen }}
                style={{
                  minHeight: sizes.target,
                  paddingHorizontal: space.xl,
                  borderRadius: radius.pill,
                  justifyContent: 'center',
                  backgroundColor: chosen ? colors.action : colors.surfaceSunk,
                }}>
                <Txt variant="label" snug color={chosen ? colors.onAction : colors.inkSoft}>
                  {MODE_LABEL[m]}
                </Txt>
              </Press>
            );
          })}
        </HStack>
      </VStack>

      <VStack gap="md">
        <SectionTitle>Press</SectionTitle>
        <Txt tone="soft">Press and hold each one. Big surfaces move less than small ones.</Txt>
        <Press
          weight="md"
          haptic="tap"
          onPress={() => {}}
          accessibilityRole="button"
          style={{
            minHeight: sizes.control,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.action,
          }}>
          <Txt variant="label" snug color={colors.onAction}>
            Ask about this
          </Txt>
        </Press>
        <HStack gap="sm">
          {(['add', 'share', 'search'] as const).map((name) => (
              <Press
                key={name}
                weight="sm"
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel={name}
                style={{
                  width: sizes.control,
                  height: sizes.control,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.actionSoft,
                }}>
                <Icon name={name} color={colors.onActionSoft} />
              </Press>
            ))}
        </HStack>
        <View style={[{ borderRadius: radius.card, backgroundColor: colors.surface }, lift('raised', colors)]}>
          <Press
            weight="lg"
            feedback="highlight"
            onPress={() => {}}
            accessibilityRole="button"
            style={{ minHeight: sizes.row, borderRadius: radius.card, paddingHorizontal: space.lg, justifyContent: 'center' }}>
            <HStack gap="md" justify="between">
              <VStack gap="xs" style={{ flex: 1 }}>
                <Txt variant="label">shop-stock-march.csv</Txt>
                <Txt variant="small" tone="soft">
                  A full-width row tints instead of shrinking
                </Txt>
              </VStack>
              <Icon name="chevron" size={sizes.iconSmall} color={colors.inkSoft} />
            </HStack>
          </Press>
        </View>
      </VStack>

      <VStack gap="md">
        <SectionTitle>Numbers</SectionTitle>
        <HStack gap="xs" align="baseline">
          <Text
            style={[figureFont('600'), { fontSize: numeralSize.hero, lineHeight: numeralLine.hero, color: colors.ink }]}>
            712
          </Text>
          <Txt variant="heading" tone="soft">
            K
          </Txt>
        </HStack>
        <HStack gap="xs" align="baseline">
          <Text
            style={[figureFont('600'), { fontSize: numeralSize.large, lineHeight: numeralLine.large, color: colors.ink }]}>
            12,34,567
          </Text>
          <Txt variant="label" tone="soft">
            ₹
          </Txt>
        </HStack>
      </VStack>

      <VStack gap="md">
        <SectionTitle>Type</SectionTitle>
        {VARIANTS.map((variant) => (
          <VStack key={variant} gap="xs">
            <Txt variant="small" tone="faint">
              {`${variant}, ${typeScale[variant].size}`}
            </Txt>
            <Txt variant={variant}>{ENGLISH}</Txt>
            <Txt variant={variant}>{HINDI}</Txt>
          </VStack>
        ))}
      </VStack>

      <VStack gap="md">
        <SectionTitle>{`Icons (${ICON_NAMES.length})`}</SectionTitle>
        <HStack gap="sm" wrap>
          {ICON_NAMES.map((name) => (
            <VStack key={name} gap="xs" align="center" style={{ width: '22%', paddingVertical: space.sm }}>
              <Icon name={name} color={colors.ink} />
              <Txt variant="small" tone="soft" align="center" numberOfLines={1} style={{ alignSelf: 'stretch' }}>
                {name}
              </Txt>
            </VStack>
          ))}
        </HStack>
      </VStack>

      <VStack gap="md">
        <SectionTitle>{`Colours (${roles.length})`}</SectionTitle>
        <HStack gap="sm" wrap>
          {roles.map((role) => (
            <Swatch key={role} role={role} value={colors[role]} colors={colors} />
          ))}
        </HStack>
      </VStack>

      <VStack gap="md">
        <SectionTitle>Depth</SectionTitle>
        <Txt tone="soft">Only things that float get a shadow. Cards never do.</Txt>
        <HStack gap="md">
          {(['raised', 'floating'] as const).map((level) => (
            <View
              key={level}
              style={[
                {
                  flex: 1,
                  minHeight: sizes.row + space.lg,
                  borderRadius: radius.card,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                lift(level, colors),
              ]}>
              <Txt variant="label" snug>
                {level}
              </Txt>
            </View>
          ))}
        </HStack>
      </VStack>
    </ScrollView>
  );
}
