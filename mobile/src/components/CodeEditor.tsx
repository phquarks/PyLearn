import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { color, edge, font, radius, space, type } from '../theme';
import { sink } from './ui';

/**
 * Somewhere to actually write Python.
 *
 * Deliberately a plain TextInput rather than a syntax-highlighting editor. The
 * highlighted ones on React Native work by drawing coloured text underneath a
 * transparent input and hoping the two stay aligned; they do not, once the text
 * wraps or the font falls back, and a cursor sitting two characters away from
 * where you are typing is worse than no colour at all.
 *
 * What the phone keyboard genuinely lacks is the punctuation Python is made of,
 * so that is what the row of keys above the editor is for. `:` and `_` are two
 * taps and a layout switch away otherwise, and the indent key inserts four
 * spaces because that argument is not one a beginner should have to have.
 */

const KEYS: { label: string; insert: string; caret?: number }[] = [
  { label: '⇥', insert: '    ' },
  { label: ':', insert: ':' },
  { label: '_', insert: '_' },
  { label: '=', insert: ' = ' },
  // the caret goes back inside the pair, which is where the next character goes
  { label: '()', insert: '()', caret: -1 },
  { label: '[]', insert: '[]', caret: -1 },
  { label: '""', insert: '""', caret: -1 },
  { label: '#', insert: '# ' },
];

export function CodeEditor({
  value,
  onChange,
  editable = true,
  lines = 7,
}: {
  value: string;
  onChange: (next: string) => void;
  editable?: boolean;
  /** how tall the editor stands, in lines; it scrolls past this */
  lines?: number;
}) {
  const input = useRef<TextInput>(null);
  /* Where the cursor is, so a key inserts at the caret rather than at the end.
     Held in a ref as well as state because the press handler needs the value
     from this instant, not from the last render. */
  const caret = useRef({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(false);

  function press(key: (typeof KEYS)[number]) {
    const { start, end } = caret.current;
    const next = `${value.slice(0, start)}${key.insert}${value.slice(end)}`;
    const at = start + key.insert.length + (key.caret ?? 0);

    caret.current = { start: at, end: at };
    onChange(next);

    /* Moving the caret has to wait for the new text to be in the input, or the
       position is clamped against the old, shorter string. */
    requestAnimationFrame(() => input.current?.setNativeProps({ selection: { start: at, end: at } }));
  }

  return (
    <View>
      <View style={[styles.frame, focused ? styles.frameFocused : null]}>
        {/* line numbers, drawn beside the input rather than inside it: a
            gutter that scrolls with wrapped text is the same alignment problem
            as highlighting, so this one simply counts the lines it can see */}
        <View style={styles.gutter}>
          {value.split('\n').map((_, index) => (
            <Text key={index} style={styles.gutterText}>
              {index + 1}
            </Text>
          ))}
        </View>

        <TextInput
          editable={editable}
          multiline
          onBlur={() => setFocused(false)}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onSelectionChange={(event) => {
            caret.current = event.nativeEvent.selection;
          }}
          ref={input}
          style={[styles.input, { minHeight: lines * 22 }]}
          textAlignVertical="top"
          value={value}
          // every one of these off: a keyboard that capitalises the first word
          // and corrects `def` to `deaf` makes the exercise about the keyboard
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          keyboardType="ascii-capable"
          spellCheck={false}
        />
      </View>

      {editable ? (
        <ScrollView
          contentContainerStyle={styles.keys}
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
        >
          {KEYS.map((key) => (
            <Pressable
              key={key.label}
              onPress={() => press(key)}
              style={({ pressed }) => [styles.key, sink(pressed, edge.tile)]}
            >
              <Text style={styles.keyText}>{key.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    borderRadius: radius.base,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    backgroundColor: color.surfaceLowest,
    paddingVertical: 12,
    paddingRight: 12,
    overflow: 'hidden',
  },
  frameFocused: { borderColor: color.primaryContainer },
  gutter: {
    width: 34,
    paddingTop: 0,
    alignItems: 'flex-end',
    paddingRight: 8,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: color.surfaceHighest,
  },
  gutterText: { ...type.code, fontSize: 13, lineHeight: 22, color: color.outline },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: font.mono,
    fontSize: 15,
    lineHeight: 22,
    color: color.onSurface,
  },
  keys: { gap: 8, paddingTop: 10, paddingRight: space.screen },
  key: {
    minWidth: 46,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.surfaceHighest,
    borderBottomWidth: edge.tile,
    backgroundColor: color.surfaceLowest,
  },
  keyText: { ...type.code, fontSize: 16, color: color.onSurfaceVariant },
});
