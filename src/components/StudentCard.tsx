import { StyleSheet, Text, View } from 'react-native';
import type { StudentAllocation } from '@/types/allocation';
import { colors } from '@/theme/colors';

const DETAIL_FIELDS: Array<{ key: keyof StudentAllocation; label: string }> = [
  { key: 'registerNumber', label: 'Registration number' },
  { key: 'department', label: 'Course or department' },
  { key: 'examSession', label: 'Examination' },
];

export function StudentCard({ student }: { student: StudentAllocation }) {
  const headline = student.studentId || student.registerNumber || '';
  const eyebrow = student.studentId ? 'Student ID' : 'Registration number';
  const hasRoom = Boolean(student.roomNumber);
  const hasSeat = Boolean(student.seatNumber);
  const place = [student.building, student.floor ? `Floor ${student.floor}` : ''].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.studentId} accessibilityRole="header">
        {headline}
      </Text>
      {student.studentName ? <Text style={styles.name}>{student.studentName}</Text> : null}

      {hasRoom || hasSeat ? (
        <View style={styles.heroRow}>
          {hasRoom ? (
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Room</Text>
              <Text style={styles.heroValue} maxFontSizeMultiplier={1.4}>
                {student.roomNumber}
              </Text>
            </View>
          ) : null}
          {hasSeat ? (
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Seat</Text>
              <Text style={styles.heroValue} maxFontSizeMultiplier={1.4}>
                {student.seatNumber}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.missing}>Room and seat were not included for this student.</Text>
      )}
      {place ? <Text style={styles.place}>{place}</Text> : null}

      <View style={styles.details}>
        {DETAIL_FIELDS.map((field) => {
          if (field.key === 'registerNumber' && !student.studentId) return null;
          const value = student[field.key];
          if (typeof value !== 'string' || !value) return null;
          return (
            <View key={field.key} style={styles.row}>
              <Text style={styles.rowLabel}>{field.label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          );
        })}
        {student.extras
          ? Object.entries(student.extras).map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
              </View>
            ))
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  studentId: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  hero: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 96,
    justifyContent: 'center',
  },
  heroLabel: {
    color: '#D5E4F2',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroValue: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  missing: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
  },
  place: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    marginTop: 8,
    gap: 10,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
