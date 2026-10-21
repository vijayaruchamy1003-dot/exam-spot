import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBanner } from '@/components/StatusBanner';
import { StudentCard } from '@/components/StudentCard';
import { TextField } from '@/components/TextField';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useSession } from '@/services/session/SessionProvider';
import { colors } from '@/theme/colors';
import { STUDENT_ID_PREFIX } from '@/utils/studentId';

export default function HomeScreen() {
  const { profile, signOut } = useSession();
  const { online } = useNetworkStatus();
  const search = useStudentSearch({ online });
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [showOptionalDate, setShowOptionalDate] = useState(false);

  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Teacher';
  const connectionLabel = online
    ? 'Live Seating Allotment Service'
    : 'Offline Mode · Saved Results Only';

  const onSelectSample = (sampleValue: string, mode: 'studentId' | 'registerNumber') => {
    search.setSearchBy(mode);
    search.setQuery(sampleValue);
    void search.search(sampleValue);
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Exam Room Finder"
        subtitle={roleLabel}
        actionLabel="Sign out"
        onAction={() => setConfirmingSignOut(true)}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Connection status banner */}
        <View style={styles.statusRow}>
          <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>{connectionLabel}</Text>
        </View>

        {!online ? (
          <StatusBanner
            tone="warning"
            title="You are offline"
            detail="Searches will look up previously viewed students stored on this phone. Reconnect to the internet for live data."
          />
        ) : null}

        {/* Search Mode Toggle */}
        <View style={styles.modes}>
          <SearchMode
            label="Student ID"
            selected={search.searchBy === 'studentId'}
            onPress={() => search.setSearchBy('studentId')}
          />
          <SearchMode
            label="Registration No."
            selected={search.searchBy === 'registerNumber'}
            onPress={() => search.setSearchBy('registerNumber')}
          />
        </View>

        {/* Input Field */}
        <TextField
          label={search.searchBy === 'studentId' ? 'Enter Student ID' : 'Enter Registration Number'}
          prefix={search.searchBy === 'studentId' ? STUDENT_ID_PREFIX : undefined}
          value={search.query}
          onChangeText={search.setQuery}
          placeholder={search.searchBy === 'studentId' ? 'e.g. 11586' : 'e.g. 1102011081109260001'}
          returnKeyType="search"
          onSubmitEditing={() => void search.search()}
        />

        {/* Optional Exam Date Toggle */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowOptionalDate((prev) => !prev)}
          style={styles.dateToggle}
        >
          <Text style={styles.dateToggleText}>
            {showOptionalDate ? '− Hide exam date filter' : '+ Optional exam date filter'}
          </Text>
        </Pressable>

        {showOptionalDate ? (
          <TextField
            label="Exam Date (Optional)"
            value={search.testDate}
            onChangeText={search.setTestDate}
            placeholder="DD-MM-YYYY (e.g. 11-09-2026)"
            returnKeyType="search"
            onSubmitEditing={() => void search.search()}
          />
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label="Search Seating"
              onPress={() => void search.search()}
              loading={search.phase === 'searching'}
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton label="Clear" onPress={search.clear} tone="secondary" />
          </View>
        </View>

        {/* Quick Test Chips for convenience */}
        <View style={styles.samplesBox}>
          <Text style={styles.samplesTitle}>Try sample queries:</Text>
          <View style={styles.chipsRow}>
            <Pressable
              style={styles.chip}
              onPress={() => onSelectSample('11586', 'studentId')}
            >
              <Text style={styles.chipText}>ID: Z11586 (Allotted)</Text>
            </Pressable>
            <Pressable
              style={styles.chip}
              onPress={() => onSelectSample('1102011081109260001', 'registerNumber')}
            >
              <Text style={styles.chipText}>Reg: 1102011081109260001</Text>
            </Pressable>
            <Pressable
              style={styles.chip}
              onPress={() => onSelectSample('09334', 'studentId')}
            >
              <Text style={styles.chipText}>ID: Z09334 (Unallotted)</Text>
            </Pressable>
          </View>
        </View>

        {/* Result Area */}
        {search.phase === 'idle' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Instant Room & Seat Lookup</Text>
            <Text style={styles.emptyBody}>
              Enter a Student ID or 19-digit Registration Number to instantly view the assigned examination hall, seat number, exam centre, and candidate details.
            </Text>
          </View>
        ) : null}

        {search.phase === 'not-allotted' ? (
          <StatusBanner
            tone="warning"
            title="Seating Not Allotted Yet"
            detail={search.message ?? 'Seating arrangement has not been allotted yet for this exam.'}
          />
        ) : null}

        {search.phase === 'not-found' ? (
          <StatusBanner
            tone="error"
            title="Student Not Found"
            detail={search.message ?? `No student was found matching ${search.matchedId ?? 'that query'}.`}
          />
        ) : null}

        {search.phase === 'offline' ? (
          <StatusBanner
            tone="warning"
            title="Offline Lookup"
            detail={search.message ?? 'You are currently offline. Only previously viewed allocations are available.'}
          />
        ) : null}

        {search.phase === 'error' ? (
          <StatusBanner
            tone="error"
            title="Connection Error"
            detail={search.message ?? 'Unable to connect to the seating allotment server. Check your network connection.'}
          />
        ) : null}

        {/* Display student seating card if found */}
        {search.student ? (
          <StudentCard student={search.student} isCached={search.isCached} />
        ) : null}

        {/* Recent Searches (if available) */}
        {search.recentList && search.recentList.length > 0 && search.phase === 'idle' ? (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Recently Looked Up:</Text>
            {search.recentList.slice(0, 5).map((item, idx) => (
              <Pressable
                key={idx}
                style={styles.recentItem}
                onPress={() => onSelectSample(item.studentId?.replace(/^Z/i, '') || item.registrationNumber, 'studentId')}
              >
                <View style={styles.recentItemMain}>
                  <Text style={styles.recentItemName}>{item.studentName}</Text>
                  <Text style={styles.recentItemSub}>
                    ID: {item.studentId} · Reg: {item.registrationNumber}
                  </Text>
                </View>
                <View style={styles.recentBadge}>
                  <Text style={styles.recentBadgeText}>{item.roomNo || 'Room'}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmingSignOut}
        title="Sign out?"
        message="You will need to sign in again to access the seating finder."
        confirmLabel="Sign out"
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          void signOut();
        }}
      />
    </View>
  );
}

function SearchMode({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.mode, selected ? styles.modeOn : null]}
    >
      <Text style={[styles.modeText, selected ? styles.modeTextOn : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: colors.gold },
  statusText: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  modes: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modeOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  modeText: { color: colors.navy, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  modeTextOn: { color: colors.white },
  dateToggle: { alignSelf: 'flex-start', paddingVertical: 2 },
  dateToggleText: { color: colors.teal, fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  action: { flex: 1 },
  samplesBox: {
    backgroundColor: '#EBF3FA',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D0E3F3',
  },
  samplesTitle: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BCD5EC',
  },
  chipText: { color: colors.navy, fontSize: 12, fontWeight: '600' },
  empty: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: colors.text, fontSize: 14, lineHeight: 22 },
  recentSection: {
    marginTop: 8,
    gap: 8,
  },
  recentTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  recentItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  recentItemMain: {
    flex: 1,
    gap: 2,
  },
  recentItemName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '700',
  },
  recentItemSub: {
    color: colors.muted,
    fontSize: 12,
  },
  recentBadge: {
    backgroundColor: colors.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recentBadgeText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '700',
  },
});
