# Exam Room Finder

Exam Room Finder is a mobile application for examination teachers and invigilators. A teacher signs in, enters a student ID or registration number, and instantly sees that student's examination room, seat number, exam centre address, program, and allotment status.

Seating data is fetched directly from the live **Z7i Seating Allotment API**. There is no manual Excel import required by administrators.

## Features

- **Live Seating Allotment Integration**: Queries the real-time seating allotment API by Student ID (e.g. `Z11586`) or Registration Number (e.g. `1102011081109260001`).
- **Student ID Auto-Formatting**: Normalizes student IDs automatically with the required `Z` prefix (e.g., entering `11586` automatically searches `Z11586`).
- **Clear Room & Seat Cards**: Prominently highlights the **Room Number** and **Seat Number**, candidate name, exam centre address, test date, and examination mode.
- **Unallotted Status Handling**: Clearly informs teachers when a candidate is registered but seating has not been allotted yet for that exam date.
- **Device-Level Offline Cache**: Caches recent search results via `@react-native-async-storage/async-storage` so teachers can continue viewing previously searched seat assignments in halls with zero network coverage.
- **1-Tap Demo Sign In**: Instant sign in with pre-configured teacher and administrator credentials for fast local testing.
- **Optional Exam Date Filter**: Allows filtering by specific test date (e.g. `10-09-2026`).

## API Specification

- **Base URL**: `https://zedswevenbackend-production.up.railway.app` (configurable with `EXPO_PUBLIC_API_BASE_URL`)
- **Endpoint**: `GET /api/seating-allotment/search`
- **Query Parameters**:
  - `query` (required): Student ID (e.g. `Z11586`) or Registration Number (e.g. `1102011081109260001`)
  - `testDate` (optional): Exam date (`DD-MM-YYYY` or `YYYY-MM-DD`)

### Example Responses

**1. Allotted Student:**
```json
{
  "success": true,
  "message": "Seating allotment retrieved successfully",
  "data": {
    "registrationNumber": "1102011081109260001",
    "studentId": "Z11586",
    "studentName": "SAI SRI MATHI  P",
    "className": "10th",
    "testDate": "11-09-2026",
    "centerCode": "108",
    "testCentreName": "SRI VIVEKANANDHA PUBLIC SCHOOL...",
    "testCentreCity": "Coimbatore",
    "roomNo": "Room 5",
    "seatNo": 1,
    "programCode": "1102",
    "programName": "Adm.Test for Students going to Class 11 (Medical)",
    "testMode": "offline",
    "allotmentStatus": "CONFIRMED",
    "isAllotted": true
  }
}
```

**2. Registered But Not Allotted Yet:**
```json
{
  "success": false,
  "message": "Seating arrangement has not been allotted yet for this exam.",
  "data": null
}
```

## Local Development & Testing

1. Install dependencies:
```bash
npm install
```

2. Configure environment (`.env`):
```env
EXPO_PUBLIC_API_BASE_URL=https://zedswevenbackend-production.up.railway.app
EXPO_PUBLIC_DEMO_MODE=true
```

3. Run the API test script:
```bash
node scripts/test-seating-api.mjs
```

4. Start the Expo development server:
```bash
npx expo start
# Or for web preview:
npx expo start --web
```

5. Sign in using 1-tap demo credentials on the login screen (`teacher@school.edu` / `demo-teacher`).
