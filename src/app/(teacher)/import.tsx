import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ColumnMappingForm } from '@/components/ColumnMappingForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBanner } from '@/components/StatusBanner';
import { LARGE_IMPORT_WARNING } from '@/config/limits';
import { useSession } from '@/services/session/SessionProvider';
import { versionsEligibleForCleanup } from '@/services/allocations/cleanup';
import { getAllocationRepository } from '@/services/allocations/getRepository';
import { runImport } from '@/services/allocations/workflow';
import type { ColumnMapping, FieldKey } from '@/services/import/fields';
import { suggestColumnMapping } from '@/services/import/mapping';
import { parseWorkbook } from '@/services/import/parseWorkbook';
import { pickSpreadsheet } from '@/services/import/readSpreadsheet';
import { validateImport } from '@/services/import/validate';
import type { DuplicatePolicy } from '@/types/allocation';
import type { ImportProgress, ImportRunResult, ParsedSheet } from '@/types/import';
import { colors } from '@/theme/colors';
import { toUserMessage } from '@/utils/errors';

export default function ImportScreen() {
  const router = useRouter();
  const { profile, mode } = useSession();
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [policy, setPolicy] = useState<DuplicatePolicy>('reject');
  const [preserveUnmapped, setPreserveUnmapped] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const sheet = sheets[sheetIndex];
  const validation = useMemo(() => {
    if (!sheet) return null;
    return validateImport({
      rows: sheet.rows,
      headers: sheet.headers,
      mapping,
      policy,
      preserveUnmapped,
    });
  }, [mapping, policy, preserveUnmapped, sheet]);

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.screen}>
        <AppHeader title="Import allocation" actionLabel="Back" onAction={() => router.back()} />
        <View style={styles.content}>
          <StatusBanner tone="error" title="Administrators only" detail="Your account can search allocations. It cannot import or replace them." />
        </View>
      </View>
    );
  }

  async function chooseFile() {
    if (running) return;
    setError(null);
    setResult(null);
    try {
      const picked = await pickSpreadsheet();
      if (!picked) return;
      const workbook = parseWorkbook(picked.bytes);
      const first = workbook.sheets[0];
      setFileName(picked.name);
      setSheets(workbook.sheets);
      setSheetIndex(0);
      setMapping(first ? suggestColumnMapping(first.headers) : {});
      setPolicy('reject');
    } catch (pickError) {
      setError(toUserMessage(pickError, 'The spreadsheet could not be read.'));
    }
  }

  function selectSheet(index: number) {
    const next = sheets[index];
    setSheetIndex(index);
    setPolicy('reject');
    setMapping(next ? suggestColumnMapping(next.headers) : {});
    setResult(null);
  }

  function updateMapping(key: FieldKey, header?: string) {
    setMapping((current) => {
      const next = { ...current };
      if (!header) {
        delete next[key];
        return next;
      }
      for (const field of Object.keys(next) as FieldKey[]) {
        if (field !== key && next[field] === header) delete next[field];
      }
      next[key] = header;
      return next;
    });
  }

  async function confirmImport() {
    if (!validation?.canImport || !fileName || !profile || running) return;
    setConfirming(false);
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await runImport(
        getAllocationRepository(),
        {
          records: validation.records,
          sourceFileName: fileName,
          actorId: profile.uid,
          duplicatePolicy: policy,
        },
        setProgress,
      );
      setResult(outcome);
      if (!outcome.ok) setError(outcome.message);
    } catch (importError) {
      setError(toUserMessage(importError, 'The upload did not finish, so the current allocation was left unchanged.'));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  async function cleanup() {
    if (running) return;
    setCleanupMessage(null);
    try {
      const repo = getAllocationRepository();
      const [metadata, versions] = await Promise.all([repo.getMetadata(), repo.listVersions()]);
      const removable = versionsEligibleForCleanup(versions, metadata);
      if (!removable.length) {
        setCleanupMessage('There are no older versions to remove. The active allocation and the previous one are kept.');
        return;
      }
      for (const versionId of removable) await repo.deleteVersion(versionId);
      setCleanupMessage(`Removed ${removable.length} older allocation version${removable.length === 1 ? '' : 's'}.`);
    } catch (cleanupError) {
      setCleanupMessage(toUserMessage(cleanupError, 'Old versions could not be removed. The active allocation is unchanged.'));
    }
  }

  const progressRatio = progress && progress.total > 0 ? progress.completed / progress.total : 0;

  return (
    <View style={styles.screen}>
      <AppHeader title="Import allocation" actionLabel="Back" onAction={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'demo' ? (
          <StatusBanner tone="warning" title="Demo import stays on this device" detail="A successful demo import updates this phone only. It does not synchronize to other devices." />
        ) : null}
        <Text style={styles.lead}>Select the examination spreadsheet, check the column mapping, and publish a new allocation only after the upload is verified.</Text>
        <PrimaryButton label="Select Excel file" onPress={() => void chooseFile()} disabled={running} />
        {fileName ? <Text style={styles.fileName}>Selected file: {fileName}</Text> : null}
        {error ? <StatusBanner tone="error" title={error} /> : null}
        {sheets.length > 1 ? (
          <View style={styles.sheetRow}>
            {sheets.map((item, index) => (
              <View key={item.name} style={styles.sheetButton}>
                <PrimaryButton label={item.name} tone={index === sheetIndex ? 'primary' : 'secondary'} onPress={() => selectSheet(index)} disabled={running} />
              </View>
            ))}
          </View>
        ) : sheet ? (
          <Text style={styles.fileName}>Worksheet: {sheet.name}</Text>
        ) : null}
        {sheet ? (
          <ColumnMappingForm
            headers={sheet.headers}
            mapping={mapping}
            preserveUnmapped={preserveUnmapped}
            onChange={updateMapping}
            onToggleExtras={setPreserveUnmapped}
          />
        ) : null}
        {validation ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>Import summary</Text>
            <SummaryLine label="Total rows" value={validation.summary.totalRows} />
            <SummaryLine label="Valid rows" value={validation.summary.validRows} />
            <SummaryLine label="Invalid rows" value={validation.summary.invalidRows} />
            <SummaryLine label="Duplicate rows" value={validation.summary.duplicateRows} />
            <SummaryLine label="Imported records" value={validation.summary.importedRecords} />
            {validation.summary.importedRecords > LARGE_IMPORT_WARNING ? (
              <Text style={styles.note}>Large imports use one database write per student. Check the Firebase daily quota before continuing.</Text>
            ) : null}
            {validation.blockingReason ? <StatusBanner tone="error" title="Import blocked" detail={validation.blockingReason} /> : null}
            {validation.summary.duplicateRows > 0 ? (
              <View style={styles.policy}>
                <Text style={styles.heading}>Duplicate IDs</Text>
                <Text style={styles.note}>
                  The default is to stop. Keep first stores the earliest row for each duplicated ID. Keep last stores the latest row. Either choice is applied only to this import and is listed below.
                </Text>
                <PrimaryButton label="Stop and require a corrected file" tone={policy === 'reject' ? 'primary' : 'secondary'} onPress={() => setPolicy('reject')} disabled={running} />
                <PrimaryButton label="Keep first occurrence" tone={policy === 'keep-first' ? 'primary' : 'secondary'} onPress={() => setPolicy('keep-first')} disabled={running} />
                <PrimaryButton label="Keep last occurrence" tone={policy === 'keep-last' ? 'primary' : 'secondary'} onPress={() => setPolicy('keep-last')} disabled={running} />
              </View>
            ) : null}
            {validation.preview.length ? (
              <View style={styles.preview}>
                <Text style={styles.heading}>Preview</Text>
                {validation.preview.map((row) => (
                  <Text key={row.rowNumber} style={styles.previewRow}>
                    Row {row.rowNumber}: {row.studentId || '(blank ID)'} {row.studentName} {row.roomNumber} {row.seatNumber} · {row.status}
                  </Text>
                ))}
              </View>
            ) : null}
            {validation.issues.length ? (
              <View style={styles.preview}>
                <Text style={styles.heading}>Rows to correct</Text>
                {validation.issues.slice(0, 30).map((issue, index) => (
                  <Text key={`${issue.rowNumber}-${issue.code}-${index}`} style={styles.issue}>
                    {issue.message}
                  </Text>
                ))}
                {validation.issues.length > 30 ? <Text style={styles.note}>And {validation.issues.length - 30} more.</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {progress ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>{progress.message}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
          </View>
        ) : null}
        {result?.ok ? <StatusBanner tone="success" title="Import published" detail={result.message} /> : null}
        <PrimaryButton
          label="Import and replace active allocation"
          onPress={() => setConfirming(true)}
          disabled={!validation?.canImport || running}
          loading={running}
        />
        <PrimaryButton label="Remove old versions" tone="secondary" onPress={() => void cleanup()} disabled={running} />
        {cleanupMessage ? <Text style={styles.note}>{cleanupMessage}</Text> : null}
        <Text style={styles.note}>
          If the upload stops early, the previous active allocation stays in place. Student IDs are kept as text, including leading zeros. Format the ID column as text in Excel before import.
        </Text>
      </ScrollView>
      <ConfirmDialog
        visible={confirming}
        title="Replace the active allocation?"
        message={`Publish ${validation?.summary.importedRecords ?? 0} records from ${fileName ?? 'this file'}? Teachers switch to the new list only after the upload is verified. If it fails, the current allocation stays active.`}
        confirmLabel="Publish allocation"
        busy={running}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void confirmImport()}
      />
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  lead: { color: colors.text, fontSize: 15, lineHeight: 22 },
  fileName: { color: colors.navy, fontSize: 15, fontWeight: '700' },
  sheetRow: { gap: 8 },
  sheetButton: {},
  panel: { backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  heading: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 28, alignItems: 'center' },
  summaryLabel: { color: colors.muted, fontSize: 15 },
  summaryValue: { color: colors.navy, fontSize: 16, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  policy: { gap: 8 },
  preview: { gap: 6 },
  previewRow: { color: colors.text, fontSize: 14, lineHeight: 20 },
  issue: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  track: { height: 10, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: colors.teal },
});
