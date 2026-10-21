import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSession } from '@/services/session/SessionProvider';
import { colors } from '@/theme/colors';

export default function TeacherLayout() {
  const { status } = useSession();
  if (status !== 'signed-in') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
