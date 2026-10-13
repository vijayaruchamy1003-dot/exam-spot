import type { StudentAllocation } from '@/types/allocation';

const OPTIONAL_KEYS = [
  'studentName',
  'registerNumber',
  'department',
  'examSession',
  'building',
  'roomNumber',
  'floor',
  'seatNumber',
] as const;

export function studentToFirestore(student: StudentAllocation): Record<string, string | Record<string, string>> {
  const payload: Record<string, string | Record<string, string>> = {};
  if (student.studentId) payload.studentId = student.studentId;
  for (const key of OPTIONAL_KEYS) {
    const value = student[key];
    if (value) payload[key] = value;
  }
  if (student.extras && Object.keys(student.extras).length) {
    payload.extras = student.extras;
  }
  return payload;
}

export function studentFromFirestore(data: Record<string, unknown>): StudentAllocation | null {
  const studentId = typeof data.studentId === 'string' ? data.studentId.trim() : '';
  const registerNumber = typeof data.registerNumber === 'string' ? data.registerNumber.trim() : '';
  if (!studentId && !registerNumber) return null;
  const student: StudentAllocation = { studentId };
  for (const key of OPTIONAL_KEYS) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) student[key] = value;
  }
  if (data.extras && typeof data.extras === 'object') {
    const extras: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.extras as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) extras[key] = value;
    }
    if (Object.keys(extras).length) student.extras = extras;
  }
  return student;
}
