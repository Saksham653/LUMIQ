import { useEffect, useRef } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import Animated from 'react-native-reanimated';

import { duration, sizes, space, transition, useReducedMotion, useTheme } from '@/theme';
import { WorkingDots } from '@/ui/button';
import { Field, assignRef, type FieldProps } from '@/ui/field';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { useUIStrings } from '@/ui/strings';

// Everything Field takes for one line of text passes through (placeholder,
// maxLength, onFocus, autoFocus, testID, `ref` to the input, `style` for
// layout). A search bar has no drawn label, no note under it and no slots of
// its own to fill.
export type SearchBarProps = Omit<
  FieldProps,
  | 'label'
  | 'labelHidden'
  | 'hint'
  | 'error'
  | 'prefix'
  | 'suffix'
  | 'multiline'
  | 'grows'
  | 'value'
  | 'defaultValue'
  | 'onChangeText'
> & {
  // What is being searched, in the app's language ("Search this file"). It
  // is read out, not drawn: the magnifier and the placeholder name the bar to
  // the eye.
  label: string;
  // The text in the bar. The caller holds it.
  value: string;
  // Every key, at once, so the bar always shows what was typed.
  onChangeText: (text: string) => void;
  // The text to search for. With `debounce` it is called once typing has
  // stopped for that long; the search key and the clear button call it at
  // once. Without `debounce` it is called on every key.
  onSearch?: (query: string) => void;
  // How long typing must stop before onSearch is called, in ms. Set it when
  // one search is costly (a long file); leave it out when a search is instant.
  debounce?: number;
  // A search is running. The working mark takes the magnifier's place, the
  // bar keeps its size and stays usable, and a screen reader hears that it is
  // busy.
  busy?: boolean;
};

// A search bar: a pill with a magnifier at the start and, once there is text,
// a button at the end that clears it.
//   <SearchBar label={t('rows.search')} placeholder={t('rows.searchHint')} value={query} onChangeText={setQuery} />
//   <SearchBar ... debounce={300} onSearch={runSearch} busy={searching} />
//
// It is a Field underneath: the same edge, the same blue edge with the cursor
// in it, the same text size. The clear button empties the bar, searches for
// nothing at once and leaves the cursor in the bar, so the keyboard stays up.
// Inside a scrolling screen, give that scroller keyboardShouldPersistTaps
// "handled": otherwise the first press on the clear button only closes the
// keyboard.
//
// Needs AppStateProvider above it (Field reads the app language).
export function SearchBar({
  ref,
  label,
  value,
  onChangeText,
  onSearch,
  debounce = 0,
  busy = false,
  disabled = false,
  onSubmitEditing,
  ...rest
}: SearchBarProps) {
  const { colors } = useTheme();
  const strings = useUIStrings();
  const reduced = useReducedMotion();
  const input = useRef<TextInputInstance | null>(null);
  // The search that is waiting for typing to stop.
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The caller's onSearch as of the latest render, for a wait that ends later.
  const latest = useRef(onSearch);

  useEffect(() => {
    latest.current = onSearch;
  });

  // A bar that leaves the screen takes its waiting search with it.
  useEffect(() => {
    return () => {
      if (waiting.current !== null) clearTimeout(waiting.current);
    };
  }, []);

  const attach = (node: TextInputInstance | null) => {
    input.current = node;
    return assignRef(ref, node);
  };

  const stopWaiting = () => {
    if (waiting.current !== null) {
      clearTimeout(waiting.current);
      waiting.current = null;
    }
  };

  const change = (text: string) => {
    onChangeText(text);
    stopWaiting();
    if (debounce > 0) {
      waiting.current = setTimeout(() => {
        waiting.current = null;
        latest.current?.(text);
      }, debounce);
    } else {
      onSearch?.(text);
    }
  };

  // The search key does not wait.
  const submit: NonNullable<FieldProps['onSubmitEditing']> = (event) => {
    stopWaiting();
    onSearch?.(event.nativeEvent.text);
    onSubmitEditing?.(event);
  };

  const clear = () => {
    stopWaiting();
    onChangeText('');
    onSearch?.('');
    input.current?.focus();
  };

  // Disabled wins: a bar that cannot be used is not shown as working.
  const working = busy && !disabled;
  const ink = disabled ? colors.disabledInk : colors.inkSoft;

  // The magnifier keeps its place in the layout while the bar works, so the
  // text does not shift; the working mark is laid over it.
  const magnifier = (
    <View>
      <Animated.View style={[{ opacity: working ? 0 : 1 }, transition(['opacity'], duration.quick, 'standard', reduced)]}>
        <Icon name="search" size={sizes.iconSmall} color={ink} />
      </Animated.View>
      {working ? (
        <View style={styles.working}>
          <WorkingDots color={ink} />
        </View>
      ) : null}
    </View>
  );

  const clearButton =
    value !== '' && !disabled ? (
      <IconButton icon="close" size="sm" accessibilityLabel={strings.clear} onPress={clear} style={styles.clear} />
    ) : undefined;

  return (
    <Field
      role="searchbox"
      inputMode="search"
      enterKeyHint="search"
      autoCapitalize="none"
      autoCorrect={false}
      {...rest}
      ref={attach}
      label={label}
      labelHidden
      value={value}
      disabled={disabled}
      aria-busy={working}
      prefix={magnifier}
      suffix={clearButton}
      onChangeText={change}
      onSubmitEditing={submit}
    />
  );
}

const styles = StyleSheet.create({
  // Over the hidden magnifier, in the middle of it. The mark is a little
  // wider than the icon and may reach past it on both sides. Never takes a
  // touch.
  working: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  // An optical nudge, not an outer margin: the button's own box is 44 around a
  // 20 cross, and the field keeps 16 clear at its end. Pulled 12 toward the
  // edge, the cross sits in the middle of the pill's round end, and the
  // button still has its whole 48 target inside the field.
  clear: { marginEnd: -space.md },
});
