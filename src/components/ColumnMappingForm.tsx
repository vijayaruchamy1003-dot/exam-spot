import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { STANDARD_FIELDS, type ColumnMapping, type FieldKey } from '@/services/import/fields';
import { colors } from '@/theme/colors';

export function ColumnMappingForm({
  headers,
  mapping,
  preserveUnmapped,
  onChange,
  onToggleExtras,
}: {
  headers: string[];
  mapping: ColumnMapping;
  preserveUnmapped: boolean;
  onChange: (key: FieldKey, header?: string) => void;
  onToggleExtras: (value: boolean) => void;
}) {
  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const field = STANDARD_FIELDS.find((item) => item.key === openField);

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Column mapping</Text>
      <Text style={styles.help}>Match the spreadsheet columns to the allocation fields. Only Student ID is required.</Text>
      {STANDARD_FIELDS.map((item) => (
        <View key={item.key} style={styles.row}>
          <Text style={styles.label}>
            {item.label}
            {item.required ? ' *' : ''}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Map ${item.label}`} style={styles.picker} onPress={() => setOpenField(item.key)}>
            <Text style={styles.pickerText}>{mapping[item.key] ?? 'Not mapped'}</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Keep other columns as extra details</Text>
        <Switch accessibilityLabel="Keep other columns as extra details" value={preserveUnmapped} onValueChange={onToggleExtras} />
      </View>
      <Modal visible={openField !== null} transparent animationType="slide" onRequestClose={() => setOpenField(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.heading}>{field?.label}</Text>
            <ScrollView>
              {!field?.required ? (
                <Pressable style={styles.option} onPress={() => { if (openField) onChange(openField, undefined); setOpenField(null); }}>
                  <Text style={styles.optionText}>Not mapped</Text>
                </Pressable>
              ) : null}
              {headers.map((header) => (
                <Pressable
                  key={header}
                  style={styles.option}
                  onPress={() => {
                    if (openField) onChange(openField, header);
                    setOpenField(null);
                  }}
                >
                  <Text style={styles.optionText}>{header}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.option} onPress={() => setOpenField(null)}>
              <Text style={styles.optionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { gap: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  picker: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pickerText: { color: colors.navy, fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  switchLabel: { flex: 1, color: colors.text, fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11, 31, 58, 0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%', backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 },
  option: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.navy, fontSize: 16 },
});
