import { HEADER_SYNONYMS, STANDARD_FIELDS, type ColumnMapping, type FieldKey } from '@/services/import/fields';

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_./-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const available = new Set(headers);
  const used = new Set<string>();
  const mapping: ColumnMapping = {};

  for (const field of STANDARD_FIELDS) {
    const synonyms = new Set(HEADER_SYNONYMS[field.key].map((synonym) => normalizeHeader(synonym)));
    const match = headers.find((header) => available.has(header) && !used.has(header) && synonyms.has(normalizeHeader(header)));
    if (match) {
      mapping[field.key] = match;
      used.add(match);
    }
  }

  return mapping;
}

export function mappingUsesKnownHeader(mapping: ColumnMapping, headers: string[], key: FieldKey): boolean {
  const header = mapping[key];
  return Boolean(header && headers.includes(header));
}
