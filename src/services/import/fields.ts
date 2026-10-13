/**
 * Adapt the spreadsheet here when the real examination file arrives.
 * Add a field, a label, and header synonyms.
 * A row must include a student ID or a registration number.
 * Do not assume the workbook uses these exact column titles.
 */
export const STANDARD_FIELDS = [
  { key: 'studentId', label: 'Student ID', required: false },
  { key: 'studentName', label: 'Student name', required: false },
  { key: 'registerNumber', label: 'Registration number', required: false },
  { key: 'department', label: 'Course or department', required: false },
  { key: 'examSession', label: 'Examination or session', required: false },
  { key: 'building', label: 'Building or block', required: false },
  { key: 'roomNumber', label: 'Room number', required: false },
  { key: 'floor', label: 'Floor', required: false },
  { key: 'seatNumber', label: 'Seat number', required: false },
] as const;

export type FieldKey = (typeof STANDARD_FIELDS)[number]['key'];

export type ColumnMapping = Partial<Record<FieldKey, string>>;

export const HEADER_SYNONYMS: Record<FieldKey, string[]> = {
  studentId: [
    'student id',
    'studentid',
    'id',
    'roll no',
    'roll number',
    'admission no',
    'admission number',
    'university number',
  ],
  studentName: ['student name', 'name', 'candidate name', 'full name'],
  registerNumber: ['register number', 'register no', 'reg no', 'registration number', 'registration no', 'reg number'],
  department: ['department', 'course', 'course or department', 'programme', 'program', 'branch'],
  examSession: ['examination', 'exam', 'exam session', 'session', 'examination name'],
  building: ['building', 'block', 'building or block', 'venue'],
  roomNumber: ['room number', 'room no', 'room', 'hall', 'exam room'],
  floor: ['floor', 'level'],
  seatNumber: ['seat number', 'seat no', 'seat', 'desk'],
};
