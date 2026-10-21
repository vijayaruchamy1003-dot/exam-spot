import { StyleSheet, Text, View } from 'react-native';
import type { SeatingAllotmentData, StudentAllocation } from '@/types/allocation';
import { colors } from '@/theme/colors';

export function StudentCard({
  student,
  isCached,
}: {
  student: SeatingAllotmentData | StudentAllocation;
  isCached?: boolean;
}) {
  const room = student.roomNo || student.roomNumber || 'Not specified';
  const seat = student.seatNo !== undefined && student.seatNo !== null
    ? String(student.seatNo)
    : student.seatNumber || 'Not specified';
  const regNo = student.registrationNumber || student.registerNumber || '-';
  const sId = student.studentId || '-';
  const status = student.allotmentStatus || (student.isAllotted ? 'CONFIRMED' : 'ALLOTTED');

  return (
    <View style={styles.card}>
      {isCached ? (
        <View style={styles.cachedBadge}>
          <Text style={styles.cachedBadgeText}>Offline result · Loaded from local device cache</Text>
        </View>
      ) : null}

      {/* Header with Name and Status */}
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.studentName} numberOfLines={2}>
            {student.studentName || 'Student Name'}
          </Text>
          <Text style={styles.subtext}>
            ID: <Text style={styles.idValue}>{sId}</Text>
            {regNo !== '-' ? `  ·  Reg: ${regNo}` : ''}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{status}</Text>
        </View>
      </View>

      {/* Hero Highlight: Room & Seat Number */}
      <View style={styles.heroBox}>
        <View style={styles.heroItem}>
          <Text style={styles.heroLabel}>ROOM NUMBER</Text>
          <Text style={styles.heroRoomValue} numberOfLines={1} adjustsFontSizeToFit>
            {room}
          </Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroItem}>
          <Text style={styles.heroLabel}>SEAT NUMBER</Text>
          <Text style={styles.heroSeatValue} numberOfLines={1}>
            {seat}
          </Text>
        </View>
      </View>

      {/* Details Grid */}
      <View style={styles.detailsList}>
        {student.className ? (
          <DetailRow label="Class" value={student.className} />
        ) : null}

        {student.programName || student.department ? (
          <DetailRow label="Program" value={student.programName || student.department || ''} />
        ) : null}

        {student.testDate ? (
          <DetailRow label="Exam Date" value={student.testDate} />
        ) : null}

        {student.testMode ? (
          <DetailRow label="Mode" value={student.testMode.toUpperCase()} />
        ) : null}

        {student.testCentreName || student.building ? (
          <DetailRow
            label="Centre"
            value={`${student.testCentreName || student.building || ''}${
              student.testCentreCity ? ` (${student.testCentreCity})` : ''
            }${student.centerCode ? ` [Code: ${student.centerCode}]` : ''}`}
          />
        ) : null}

        {student.floor ? (
          <DetailRow label="Floor" value={student.floor} />
        ) : null}
      </View>

      {/* Other allotments if student has multiple exams */}
      {student.otherAllotments && student.otherAllotments.length > 0 ? (
        <View style={styles.otherSection}>
          <Text style={styles.otherTitle}>Other Scheduled Exams:</Text>
          {student.otherAllotments.map((other, idx) => (
            <View key={idx} style={styles.otherCard}>
              <Text style={styles.otherDate}>
                {other.testDate ? `Date: ${other.testDate}` : `Exam #${idx + 1}`}
                {other.className ? ` · Class ${other.className}` : ''}
              </Text>
              <Text style={styles.otherRoomSeat}>
                Room: {other.roomNo || 'TBA'}  |  Seat: {other.seatNo ?? 'TBA'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cachedBadge: {
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  cachedBadgeText: {
    color: colors.warningText,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtext: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  idValue: {
    color: colors.navy,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  statusBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBox: {
    flexDirection: 'row',
    backgroundColor: colors.tealSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFE4E2',
  },
  heroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroLabel: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroRoomValue: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSeatValue: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '800',
  },
  heroDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#A8DCD9',
  },
  detailsList: {
    gap: 8,
    paddingTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  otherSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
  },
  otherTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700',
  },
  otherCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  otherDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  otherRoomSeat: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700',
  },
});
