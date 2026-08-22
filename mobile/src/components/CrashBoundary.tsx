import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { reportCrash } from '../api/events';
import { deviceLanguage, translate } from '../i18n';
import { color, radius, space, type } from '../theme';

/**
 * The last thing standing between a broken render and a white screen.
 *
 * It sits above everything, including the language provider, so it cannot use
 * the usual hook — the tree it would read from is the tree that just failed.
 * The device's language is asked directly instead.
 *
 * "Try again" clears the error and re-renders rather than restarting: a crash
 * on one screen is usually survivable, and throwing the learner back to the
 * loading monogram loses more than it fixes. If it fails again the screen
 * simply returns, which is honest.
 */
export class CrashBoundary extends Component<
  { children: ReactNode; userId: string | null },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // the component stack says which screen, which the message alone never does
    reportCrash(error, `render${info.componentStack?.split('\n')[1]?.trim() ?? ''}`, this.props.userId);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    const language = deviceLanguage();

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{translate(language, 'crash.title')}</Text>
        <Text style={styles.text}>{translate(language, 'crash.text')}</Text>

        {/* the message is shown, not hidden: a learner who tells you what it
            said saves a round of guessing */}
        <View style={styles.detail}>
          <Text style={styles.detailText}>{error.message}</Text>
        </View>

        <Pressable onPress={() => this.setState({ error: null })} style={styles.button}>
          <Text style={styles.buttonText}>{translate(language, 'crash.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

/* Styles are literal rather than tokenised for once: this screen has to draw
   even if the theme is what broke. */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.screen,
    backgroundColor: '#f7f9fc',
  },
  title: { ...type.display, color: '#131a21', textAlign: 'center' },
  text: { ...type.body, color: '#3b4754', textAlign: 'center' },
  detail: {
    alignSelf: 'stretch',
    padding: 12,
    borderRadius: radius.base,
    backgroundColor: '#e9eef5',
  },
  detailText: { ...type.labelSm, color: '#46566a' },
  button: {
    minHeight: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.base,
    backgroundColor: color.primaryContainer,
  },
  buttonText: { ...type.title, fontSize: 18, color: '#ffffff' },
});
