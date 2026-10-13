import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBanner } from '@/components/StatusBanner';
import { StudentCard } from '@/components/StudentCard';
import { TextField } from '@/components/TextField';
import { useAllocationSync } from '@/hooks/useAllocationSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useSession } from '@/services/session/SessionProvider';
import { colors } from '@/theme/colors';
import { STUDENT_ID_PREFIX } from '@/utils/studentId';
import { formatSyncTime } from '@/utils/text';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut, mode } = useSession();
  const { online } = useNetworkStatus();
  const sync = useAllocationSync(online);
  const search = useStudentSearch({
    metadata: sync.metadata,
    online,
    localOnly: sync.localOnly,
  });
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Teacher';

  const syncTitle = sync.localOnly
    ? 'Demo data on this device'
    : !online || sync.syncState === 'offline'
      ? 'Offline'
      : sync.syncState === 'error'
        ? 'Synchronization failed'
        : sync.syncState === 'live'
          ? 'Connected'
          : 'Checking for updates';

  const showStaleWarning = !sync.localOnly && (!online || sync.usingCachedMetadata || search.stale || sync.syncState === 'error');

  return (
    <View style={styles.screen}>
      <AppHeader title="Exam Room Finder" subtitle={roleLabel} actionLabel="Sign out" onAction={() => setConfirmingSignOut(true)} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusRow}>
          <View style={[styles.dot, online || sync.localOnly ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>{syncTitle}</Text>
        </View>
        {profile?.role === 'admin' ? (
          <>
            <Text style={styles.syncTime}>Last synchronized {formatSyncTime(sync.lastSynchronizedAt)}</Text>
            {sync.metadata?.lastSuccessfulImportAt ? (
              <Text style={styles.syncTime}>
                Active list published {formatSyncTime(sync.metadata.lastSuccessfulImportAt)}
                {sync.metadata.sourceFileName ? ` · ${sync.metadata.sourceFileName}` : ''}
                {sync.metadata.recordCount ? ` · ${sync.metadata.recordCount} records` : ''}
              </Text>
            ) : (
              <Text style={styles.syncTime}>No allocation has been published yet.</Text>
            )}
          </>
        ) : null}
        {sync.localOnly ? (
          <StatusBanner tone="warning" title="Demo mode" detail="Updates on this screen are not shared with other phones. Connect Firebase before examination duty." />
        ) : null}
        {showStaleWarning ? (
          <StatusBanner
            tone="warning"
            title="This allocation may be out of date"
            detail={sync.errorMessage ?? 'The latest allocation has not been confirmed on this phone. Do not treat a saved result as the current room list.'}
          />
        ) : null}
        {profile?.role === 'admin' ? <PrimaryButton label="Import allocation" onPress={() => router.push('/import')} tone="secondary" /> : null}
        <View style={styles.modes}>
          <SearchMode label="Registration number" selected={search.searchBy === 'registerNumber'} onPress={() => search.setSearchBy('registerNumber')} />
          <SearchMode label="Student ID" selected={search.searchBy === 'studentId'} onPress={() => search.setSearchBy('studentId')} />
        </View>
        <TextField
          label={search.searchBy === 'studentId' ? 'Enter Student ID' : 'Enter registration number'}
          prefix={search.searchBy === 'studentId' ? STUDENT_ID_PREFIX : undefined}
          value={search.query}
          onChangeText={search.setQuery}
          placeholder={search.searchBy === 'studentId' ? 'e.g. 0010245' : 'From the registration column'}
          returnKeyType="search"
          onSubmitEditing={() => void search.search()}
        />
        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton label="Search" onPress={() => void search.search()} loading={search.phase === 'searching'} />
          </View>
          <View style={styles.action}>
            <PrimaryButton label="Clear" onPress={search.clear} tone="secondary" />
          </View>
        </View>
        {search.phase === 'idle' ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Search by registration number or student ID</Text>
            <Text style={styles.emptyBody}>
              {mode === 'demo'
                ? 'Either value finds the same room and seat. Sample registration numbers include REG001. Sample student IDs include 0010245. The Z is added only for a student ID.'
                : 'Use the registration number from the seating sheet, or a student ID when that column has been added. Either one finds the room and seat.'}
            </Text>
          </View>
        ) : null}
        {search.phase === 'not-found' ? (
          <StatusBanner tone="error" title="Student not found" detail={`No allocation in the active list matches ${search.matchedId ?? 'that value'}.`} />
        ) : null}
        {search.phase === 'no-allocation' ? (
          <StatusBanner tone="info" title="No allocation published" detail="An administrator needs to import the examination spreadsheet." />
        ) : null}
        {search.phase === 'offline' || search.phase === 'error' ? <StatusBanner tone="warning" title={search.message ?? 'Lookup unavailable'} /> : null}
        {search.student ? <StudentCard student={search.student} /> : null}
        {mode === 'firebase' && sync.syncState === 'live' ? (
          <Text style={styles.footnote}>Connected teachers read the same active allocation. A new import replaces it only after every record is verified.</Text>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        visible={confirmingSignOut}
        title="Sign out?"
        message="You will need to sign in again before looking up another student."
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

function SearchMode({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.mode, selected ? styles.modeOn : null]}>
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
  statusText: { color: colors.navy, fontSize: 16, fontWeight: '700' },
  syncTime: { color: colors.muted, fontSize: 14, lineHeight: 20 },
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
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  empty: { backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 6, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  emptyBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
  footnote: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
