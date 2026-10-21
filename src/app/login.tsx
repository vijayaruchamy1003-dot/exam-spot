import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBanner } from '@/components/StatusBanner';
import { TextField } from '@/components/TextField';
import { DEMO_ACCOUNTS } from '@/services/demo/demoAuth';
import { useSession } from '@/services/session/SessionProvider';
import { colors } from '@/theme/colors';
import { toUserMessage } from '@/utils/errors';

export default function LoginScreen() {
  const { signIn, mode, status } = useSession();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (signInError) {
      setError(toUserMessage(signInError, 'Sign-in failed. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function quickSignIn(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setSubmitting(true);
    setError(null);
    try {
      await signIn(demoEmail, demoPass);
    } catch (signInError) {
      setError(toUserMessage(signInError, 'Sign-in failed. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading' || status === 'signed-in') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>Examination duty</Text>
        <Text style={styles.title} accessibilityRole="header">
          Exam Room Finder
        </Text>
        <Text style={styles.lead}>
          Sign in to access real-time student seating allotments and exam hall assignments.
        </Text>

        {mode === 'demo' ? (
          <StatusBanner
            tone="info"
            title="Local Preview Mode"
            detail="Tap one of the demo accounts below for instant 1-tap sign in."
          />
        ) : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@school.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />

        {error ? <StatusBanner tone="error" title={error} /> : null}

        <PrimaryButton label="Sign in" onPress={() => void submit()} loading={submitting} />

        {mode === 'demo' ? (
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Quick 1-Tap Sign In:</Text>
            {DEMO_ACCOUNTS.map((account) => (
              <Pressable
                key={account.uid}
                style={styles.demoButton}
                onPress={() => void quickSignIn(account.email, account.password)}
              >
                <View>
                  <Text style={styles.demoButtonRole}>
                    {account.role === 'admin' ? 'Administrator' : 'Teacher'}
                  </Text>
                  <Text style={styles.demoButtonEmail}>{account.email}</Text>
                </View>
                <Text style={styles.demoButtonAction}>Sign In →</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, gap: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  kicker: { color: colors.teal, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: colors.navy, fontSize: 34, fontWeight: '800' },
  lead: { color: colors.text, fontSize: 16, lineHeight: 23 },
  demoBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: { color: colors.navy, fontWeight: '800', fontSize: 14 },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F6FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE7F0',
  },
  demoButtonRole: { color: colors.navy, fontWeight: '700', fontSize: 14 },
  demoButtonEmail: { color: colors.muted, fontSize: 12 },
  demoButtonAction: { color: colors.teal, fontWeight: '700', fontSize: 13 },
});
