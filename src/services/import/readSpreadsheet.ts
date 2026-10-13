import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { MAX_FILE_BYTES } from '@/config/limits';
import { AppError } from '@/utils/errors';

const SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

export async function pickSpreadsheet(): Promise<{ name: string; bytes: ArrayBuffer } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: SPREADSHEET_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new AppError('No file was selected.', 'unsupported-file');
  const name = asset.name || 'allocation.xlsx';
  const lower = name.toLowerCase();
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
    throw new AppError('Choose an Excel file ending in .xlsx or .xls, or a .csv file.', 'unsupported-file');
  }
  if (typeof asset.size === 'number' && asset.size > MAX_FILE_BYTES) {
    throw new AppError('This file is larger than 10 MB. Split it and try again.', 'file-too-large');
  }
  const bytes = await readAsset(asset);
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new AppError('This file is larger than 10 MB. Split it and try again.', 'file-too-large');
  }
  return { name, bytes };
}

async function readAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<ArrayBuffer> {
  if (asset.file) return asset.file.arrayBuffer();
  if (asset.base64) return decodeBase64(asset.base64);
  const file = new File(asset.uri);
  return file.arrayBuffer();
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
