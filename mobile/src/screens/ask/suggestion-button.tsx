import { I18nManager, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { ListRow } from '@/components/grouped';
import { useTheme } from '@/hooks/use-theme';

// A ready-made question as a row in a grouped list: one tap asks it, so
// nobody has to know what to type.
export function SuggestionRow({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  const colors = useTheme();
  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }}>
      <ListRow
        onPress={disabled ? undefined : onPress}
        accessibilityLabel={text}
        accessibilityState={{ disabled: !!disabled }}
        icon={<AppIcon name={{ ios: 'bubble.left', android: 'chat_bubble_outline' }} size={20} color={colors.primary} />}
        title={<AppText>{text}</AppText>}
        trailing={
          <View style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null}>
            <AppIcon name={{ ios: 'arrow.up.right', android: 'north_east' }} size={20} color={colors.textTertiary} />
          </View>
        }
      />
    </View>
  );
}
