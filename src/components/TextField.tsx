import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme/colors';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  returnKeyType = 'done',
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  returnKeyType?: 'done' | 'search' | 'next' | 'go';
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.shell}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => onChangeText(stripPrefix(text, prefix))}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={prefix ? 'none' : autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function stripPrefix(text: string, prefix: string | undefined): string {
  if (!prefix) return text;
  const trimmed = text.trimStart();
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return trimmed.slice(prefix.length);
  return text;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  shell: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    paddingLeft: 14,
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.text,
  },
});
