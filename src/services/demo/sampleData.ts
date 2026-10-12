import type { StudentAllocation } from '@/types/allocation';

/**
 * Clearly labelled sample records. These are not real students.
 * Replace them by importing the school's spreadsheet.
 */
export const SAMPLE_STUDENTS: StudentAllocation[] = [
  {
    studentId: '0010245',
    studentName: 'Sample Student',
    registerNumber: 'REG001',
    department: 'Sample Department',
    examSession: 'Morning session',
    building: 'Block A',
    roomNumber: 'A-204',
    floor: '2',
    seatNumber: '24',
    extras: { 'Hall ticket': 'HT-0010245' },
  },
  {
    studentId: '0010246',
    studentName: 'Sample Student Two',
    registerNumber: 'REG002',
    department: 'Sample Department',
    examSession: 'Morning session',
    building: 'Block A',
    roomNumber: 'A-204',
    floor: '2',
    seatNumber: '25',
  },
  {
    studentId: '000007',
    studentName: 'Sample Student Three',
    registerNumber: 'REG007',
    department: 'Sample Science',
    examSession: 'Afternoon session',
    building: 'Block B',
    roomNumber: 'B-010',
    floor: 'Ground',
    seatNumber: '03',
  },
  {
    studentId: '0011001',
    studentName: 'Sample Student Four',
    registerNumber: 'REG110',
    department: 'Sample Commerce',
    examSession: 'Morning session',
    building: 'Block C',
    roomNumber: 'C-12',
    floor: '1',
    seatNumber: '01',
  },
  {
    studentId: '009900',
    studentName: 'Sample Student Five',
    registerNumber: 'REG990',
    examSession: 'Afternoon session',
    building: 'Block B',
    roomNumber: 'B-101',
    floor: '1',
  },
];

export const SAMPLE_HEADERS = [
  'Student ID',
  'Student Name',
  'Register Number',
  'Department',
  'Examination',
  'Building',
  'Room Number',
  'Floor',
  'Seat Number',
  'Hall Ticket',
];

export function sampleRows(): string[][] {
  return SAMPLE_STUDENTS.map((student) => [
    student.studentId,
    student.studentName ?? '',
    student.registerNumber ?? '',
    student.department ?? '',
    student.examSession ?? '',
    student.building ?? '',
    student.roomNumber ?? '',
    student.floor ?? '',
    student.seatNumber ?? '',
    student.extras?.['Hall ticket'] ?? '',
  ]);
}
