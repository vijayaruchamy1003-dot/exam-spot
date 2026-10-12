import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function StatusBanner({
  tone,
  title,
  detail,
}: {
  tone: 'info' | 'warning' | 'error' | 'success';
  title: string;
  detail?: string;
}) {
  return (
    <View style={[styles.banner, styles[tone]]}>
      <Text style={[styles.title, tone === 'warning' && styles.warningText, tone === 'error' && styles.errorText, tone === 'success' && styles.successText]}>
        {title}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  info: { backgroundColor: colors.tealSoft },
  warning: { backgroundColor: colors.warningBg },
  error: { backgroundColor: colors.dangerBg },
  success: { backgroundColor: colors.successBg },
  title: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  warningText: { color: colors.warningText },
  errorText: { color: colors.danger },
  successText: { color: colors.success },
  detail: { color: colors.text, fontSize: 14, lineHeight: 20 },
});
