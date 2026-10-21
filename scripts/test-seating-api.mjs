const DEFAULT_BASE_URL = 'https://zedswevenbackend-production.up.railway.app';

function normalizeStudentId(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('Z') || trimmed.startsWith('z')) {
    return 'Z' + trimmed.slice(1);
  }
  return 'Z' + trimmed;
}

function normalizeRegisterNumber(value) {
  return value.trim();
}

function normalizeSearchQuery(query, searchBy = 'registerNumber') {
  const trimmed = query.trim();
  if (!trimmed) return '';
  if (searchBy === 'studentId') {
    return normalizeStudentId(trimmed);
  }
  return normalizeRegisterNumber(trimmed);
}

async function searchSeatingAllotment({ query, searchBy = 'registerNumber', testDate }) {
  const normalized = normalizeSearchQuery(query, searchBy);
  if (!normalized) {
    return { success: false, message: 'Please enter a valid query.', data: null };
  }

  const url = new URL(`${DEFAULT_BASE_URL}/api/seating-allotment/search`);
  url.searchParams.set('query', normalized);
  if (testDate && testDate.trim()) {
    url.searchParams.set('testDate', testDate.trim());
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  const json = await response.json();
  return json;
}

console.log('Testing Seating Allotment API integration...\n');

async function runTests() {
  const cases = [
    {
      name: '1. Search by Student ID (Allotted: Z11586)',
      params: { query: 'Z11586', searchBy: 'studentId' },
      expectedSuccess: true,
      check: (data) => data.roomNo === 'Room 5' && data.seatNo === 1 && data.studentId === 'Z11586',
    },
    {
      name: '2. Search by Student ID without Z (11586 -> normalizes to Z11586)',
      params: { query: '11586', searchBy: 'studentId' },
      expectedSuccess: true,
      check: (data) => data.studentId === 'Z11586' && data.roomNo === 'Room 5',
    },
    {
      name: '3. Search by Registration Number (1102011081109260001)',
      params: { query: '1102011081109260001', searchBy: 'registerNumber' },
      expectedSuccess: true,
      check: (data) => data.registrationNumber === '1102011081109260001' && data.roomNo === 'Room 5',
    },
    {
      name: '4. Search with Exam Date Filter (Z43264, 10-09-2026)',
      params: { query: 'Z43264', searchBy: 'studentId', testDate: '10-09-2026' },
      expectedSuccess: true,
      check: (data) => data.studentId === 'Z43264' && data.testDate === '10-09-2026',
    },
    {
      name: '5. Search Registered but Not Allotted (Z09334)',
      params: { query: 'Z09334', searchBy: 'studentId' },
      expectedSuccess: false,
      check: (_, res) => res.message.toLowerCase().includes('not been allotted') && res.data === null,
    },
    {
      name: '6. Search Non-Existent Student (UNKNOWN_ID_9999)',
      params: { query: 'UNKNOWN_ID_9999', searchBy: 'studentId' },
      expectedSuccess: false,
      check: (_, res) => res.data === null,
    },
  ];

  let passed = 0;
  for (const testCase of cases) {
    process.stdout.write(`• ${testCase.name}... `);
    try {
      const res = await searchSeatingAllotment(testCase.params);
      if (res.success !== testCase.expectedSuccess) {
        console.error(`FAILED: expected success=${testCase.expectedSuccess}, got ${res.success}. Message: ${res.message}`);
        continue;
      }
      if (!testCase.check(res.data, res)) {
        console.error(`FAILED condition check. Data:`, res);
        continue;
      }
      console.log('✓ PASS');
      passed++;
    } catch (err) {
      console.error(`FAILED with exception:`, err);
    }
  }

  console.log(`\nResults: ${passed}/${cases.length} tests passed.`);
  if (passed !== cases.length) process.exit(1);
}

runTests();
