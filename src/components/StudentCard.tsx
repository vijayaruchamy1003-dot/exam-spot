import { StyleSheet, Text, View } from 'react-native';
import type { StudentAllocation } from '@/types/allocation';
import { colors } from '@/theme/colors';
import { isPrivateContactField } from '@/utils/contactField';

export function StudentCard({ student }: { student: StudentAllocation }) {
  const rows = detailRows(student);

  return (
    <View style={styles.card}>
      {rows.length ? (
        rows.map((row) => (
          <Text key={row.label} style={row.emphasis ? styles.emphasis : styles.line}>
            {row.label} : {row.value}
          </Text>
        ))
      ) : (
        <Text style={styles.missing}>This allocation has no details to show.</Text>
      )}
    </View>
  );
}

function detailRows(student: StudentAllocation): Array<{ label: string; value: string; emphasis?: boolean }> {
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [];
  const add = (label: string, value: string | undefined, emphasis = false) => {
    if (!value || isPrivateContactField(label)) return;
    rows.push({ label, value, emphasis });
  };

  add('Name', student.studentName, true);
  add('Student ID', student.studentId);
  add('Registration number', student.registerNumber);
  add('Room', student.roomNumber, true);
  add('Seat', student.seatNumber, true);
  add('Floor', student.floor);
  add('Building', student.building);
  add('Course or department', student.department);
  add('Examination', student.examSession);
  if (student.extras) {
    for (const [label, value] of Object.entries(student.extras)) add(label, value);
  }
  return rows;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emphasis: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  line: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  missing: {
    color: colors.muted,
    fontSize: 15,
  },
});
