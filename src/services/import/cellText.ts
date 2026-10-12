import type { CellObject } from 'xlsx';
import { tidyText } from '@/utils/text';

function numberCellToString(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
    return value.toFixed(0);
  }
  return String(value);
}

/**
 * Prefer the formatted cell text. That is what Excel displays, and it is the
 * only place leading zeros survive when a column uses a text or custom format.
 * Numeric values are converted without parseInt, and missing zeros are not invented.
 */
export function cellToText(cell: CellObject | undefined): string {
  if (!cell) return '';
  if (typeof cell.w === 'string' && tidyText(cell.w)) return tidyText(cell.w);
  if (cell.t === 's' && typeof cell.v === 'string') return tidyText(cell.v);
  if (cell.t === 'n' && typeof cell.v === 'number') return numberCellToString(cell.v);
  if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
  if (typeof cell.v === 'string') return tidyText(cell.v);
  if (typeof cell.v === 'number') return numberCellToString(cell.v);
  return '';
}
