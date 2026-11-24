import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// Press feedback for buttons and cards: scale to 0.97 on press-in, back on
// release (120 ms). Tens of times a day, so it stays near-imperceptible.
// Disabled buttons don't move.
export function PressableScale({ style, children, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}>
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
            transitionProperty: 'transform',
            transitionDuration: Motion.press,
            transitionTimingFunction: CSS_EASE_OUT,
          },
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Press feedback for full-width rows: the background highlights instead of
// the row scaling (a scaling row reads as the whole screen squishing).
export function PressableRow({ style, children, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}>
      <Animated.View
        style={[
          style,
          {
            backgroundColor: pressed && !disabled ? colors.pressed : 'transparent',
            transitionProperty: 'backgroundColor',
            transitionDuration: Motion.press,
            transitionTimingFunction: CSS_EASE_OUT,
          },
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
