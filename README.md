# Exam Room Finder

Exam Room Finder is an Android app for teachers. A teacher signs in, enters a student ID, and sees that student's examination room and seat. An administrator imports the allocation spreadsheet. Every signed-in phone reads the same active list from Cloud Firestore. There is no custom application server.

The Excel column names are not fixed. The import screen maps whatever headers are in the file onto a small internal model. Sample rows in this repository are fictional.

## What is implemented

- Email and password sign-in, with the session kept on the device.
- Teacher search by exact student ID, including search-as-you-type after three characters.
- A student card that emphasizes room and seat and hides fields that were not imported.
- Local Excel parsing for `.xlsx` and `.xls`, worksheet choice, column mapping, preview, and validation.
- Blank IDs block the import and are listed with row numbers. Duplicate IDs block the import until an administrator explicitly chooses keep-first or keep-last.
- Versioned Firestore imports. A new list becomes active only after the uploaded count matches the spreadsheet. A failed upload leaves the previous list active.
- A realtime listener on the small active-allocation document, so phones notice a new published list without watching every student.
- A bounded on-device cache for the last metadata snapshot and up to 50 lookups. Offline results are labelled as possibly out of date.
- Firestore Security Rules that deny access by default.
- Unit tests for IDs, mapping, validation, activation, failed imports, and lookup decisions.
- Emulator tests for the security rules.
- An EAS profile that builds an internal Android APK.

## What is not automatic

Cloud sign-in and multi-phone synchronization do **not** work until you create a Firebase project, deploy the rules, and add user profiles. Until then, set `EXPO_PUBLIC_DEMO_MODE=true`. Demo mode is a local preview. It does not share data between phones.

Firebase's client configuration is public. It identifies the project. It does not protect student records. The rules in `firestore.rules` do that.

## Assumptions

- The first row of the selected worksheet is the header row.
- Student IDs are text. Leading and trailing spaces are removed. The app never converts an ID with `Number` or `parseInt`. If Excel stored the ID as a number, the leading zeros are already gone and the app will not invent them. Format that column as Text before importing.
- Lookup is an exact ID match through one document read. There is no name search.
- Blank student IDs must be corrected in the spreadsheet. They are not skipped.
- Duplicate IDs are not overwritten quietly. The default policy is to stop. Keep-first keeps the earliest row. Keep-last keeps the latest row. The decision applies only to the new import.
- Extra columns are kept when "Keep other columns" is on. Characters that Firestore cannot store in a field name are replaced.
- One import can contain up to 20,000 data rows and the file must be 10 MB or smaller. Writes are batched at 400 records.
- The active version and the previous version are kept. Older versions are removed only when an administrator taps "Remove old versions".
- The Firebase JS SDK does not provide a full offline database inside Expo. The app caches metadata and recent lookups instead of listening to every student document.
- The first administrator cannot be created from the phone. Create that profile in the Firebase console, which bypasses security rules. After that, the rules stop anyone from granting themselves administrator access.

## Prerequisites

- Node.js 20.19+ or 22, and npm
- The Expo CLI, installed through `npx expo`
- For a device preview, the Expo Go app or an Android emulator
- For an installable APK, an Expo account and EAS Build
- For rule tests, Java 17+ (Java 21 is fine) and the Firebase emulators installed with this repo

## Project layout

```text
src/app/                 screens and navigation
src/components/          shared UI
src/services/firebase/   Auth and Firestore
src/services/import/     Excel parsing, mapping, validation
src/services/allocations versioned import, lookup, cache
src/services/demo/       local sample data
src/hooks/               network, sync, and search
src/types/               TypeScript models
firestore.rules          security rules
assets/sample/           fictional spreadsheets
```

Column titles and synonyms live in `src/services/import/fields.ts`. Add a field there when the real workbook arrives.

## Local setup

```bash
npm install
cp .env.example .env
npm start
```

The example `.env` turns demo mode on. Sign in with:

| Role | Email | Password |
| --- | --- | --- |
| Teacher | teacher@school.edu | demo-teacher |
| Administrator | admin@school.edu | demo-admin |

Try student IDs `0010245` and `000007`. Import `assets/sample/sample-allocation.xlsx` as the administrator. `assets/sample/sample-allocation-with-issues.xlsx` contains a blank ID and a duplicate so you can see the validation messages.

Demo imports stay on that one device.

## Firebase setup

These steps are manual. They happen in the Firebase and Google Cloud consoles, not in the app.

1. Create a Firebase project. Stay on the Spark plan unless the school needs more quota. A few thousand student writes per import fit the free daily limits for a modest exam. Check the current quotas before a large import. The import screen warns above 5,000 rows.
2. Add a Web app in Project settings. Copy `firebaseConfig` into a local `.env` using the names in `.env.example`, then set `EXPO_PUBLIC_DEMO_MODE=false`. Do not commit `.env`. Check the connection without printing student data:

```bash
npm run test:firebase
```

The command makes no network request until all six values are present. A passing result means Firestore rejected an anonymous read and Email/Password authentication is enabled. It does not by itself prove a teacher profile can open allocations.
3. Authentication → Sign-in method → enable Email/Password.
4. Create one user per teacher or administrator. The app does not offer public registration.
5. Create a Firestore database in production mode.
6. Deploy the rules before importing real data:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

7. Create the first administrator document in the Firestore console:

```text
users/{uid from Authentication}
  uid: "{same uid}"
  email: "admin@school.edu"
  role: "admin"
  displayName: "Exam office"
```

`role` must be `admin` or `teacher`. A missing document, or any other role, cannot open allocations.

8. For each teacher, create `users/{their uid}` with `role: "teacher"`. The phone cannot change its own role.
9. Restart Expo so it reloads `.env`.

EAS cloud builds do not upload a gitignored `.env`. The preview profile keeps `EXPO_PUBLIC_DEMO_MODE=false` and reads the Firebase client variables from the EAS `preview` environment. Create each variable with plaintext visibility so Metro can inline it: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID`. Do not commit a Firebase service-account key.

## How an import is published

1. The spreadsheet is parsed and validated on the phone.
2. The app creates a new `allocationVersions/{versionId}` document with status `uploading`. The active list is not changed.
3. Student documents are written in batches under `allocationVersions/{versionId}/students/{encodedStudentId}`.
4. The app counts the stored documents. If the count does not match, the version is marked `failed` and the active list stays as it was.
5. Only then does a transaction mark the version `active`, archive the previous version, and update `allocationMetadata/current`.
6. Other phones are listening to `allocationMetadata/current`. When it changes, they drop results from the old version and read the same student ID from the new version.

Document IDs are encoded from the student ID. Slashes and other path characters cannot point the write somewhere else.

## Security rules

`firestore.rules` denies every path unless a rule allows it.

- A signed-in teacher or administrator can read the metadata document and the active or previous student list.
- Teachers cannot read an upload that is still in progress.
- Only an existing administrator can create versions, write students, activate a list, or delete an old version.
- The active version cannot be deleted from the client.
- Student documents are not edited in place. A correction is a new import.
- Users cannot create or change roles unless the caller is already an administrator.

Test the rules against the emulator:

```bash
npm test
npm run test:rules
```

`npm test` does not need Firebase. `npm run test:rules` starts the Firestore emulator, runs `tests/rules/firestore.rules.test.ts`, and shuts the emulator down.

## Offline behavior

The status line shows whether the phone is online, and the time this phone last received the active-allocation document.

When the phone is offline:

- The app says the allocation may be out of date.
- A previously opened student can be shown only if the cached record belongs to the last known active version.
- An ID that was never opened on that phone is not guessed.
- Demo mode is local data, so it says so instead of pretending to be a cloud sync.

When the network returns, the metadata listener resumes and an open search is repeated against the active version.

## Android APK

Install EAS and sign in once:

```bash
npx eas-cli login
npx eas-cli build:configure
```

Create the internal APK:

```bash
npx eas-cli build --platform android --profile preview
```

The `preview` profile builds an APK (`buildType: apk`) with internal distribution. When the build finishes, EAS shows a download URL. Send that file to teachers. On each phone, allow installation from the browser or file manager, then install the APK. This is sideloading, not Play Store distribution.

Before building, set the Firebase environment variables for the preview environment in Expo and keep `EXPO_PUBLIC_DEMO_MODE` unset or `false`. A demo-mode APK will not share allocations between phones.

`npx eas-cli build --platform android --profile production` uses the same APK output for a later internal release.

You do not need Android Studio for an EAS cloud build. Do not commit `android/` or a keystore. EAS creates the native project and signs the APK.

## iOS Simulator

The `ios-simulator` profile builds an unsigned app for the iOS Simulator on a Mac. It uses the Firebase variables already stored in the EAS preview environment and keeps demo mode off. It does not install on an iPhone, and it does not require device registration or a paid Apple Developer account.

```bash
npx eas-cli build --platform ios --profile ios-simulator
```

On the Mac, with Xcode installed, install that build into a booted simulator:

```bash
npx eas-cli build:run --platform ios --profile ios-simulator
```

For a physical iPhone, use the `preview` profile instead. Register the phone first with `npx eas-cli device:create`, then run `npx eas-cli build --platform ios --profile preview`. That build requires a paid Apple Developer Program membership. Open the install link in Safari on that iPhone. If iOS blocks the app, go to Settings, General, VPN & Device Management, trust the developer certificate, then open Exam Room Finder again. Do not commit `ios/` or the signing certificates.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run web` | Browser preview |
| `npm run android` | Open the Android dev client or emulator |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript |
| `npm run test:rules` | Firestore emulator rule tests |
| `node scripts/generate-sample-workbooks.mjs` | Rewrite the fictional sample files |

## Manual two-phone check

Do this after Firebase is configured and the rules are deployed. Demo mode cannot pass this test.

1. Install the app on two phones and sign in as teachers.
2. Search for the same student ID on both. Confirm the room and seat match.
3. On an administrator phone, import an updated spreadsheet and confirm publication.
4. Confirm both teacher phones show a new synchronization time without a manual refresh.
5. Search again on both phones and confirm the new room or seat.
6. Turn on airplane mode on one phone. Search for a student that phone has already opened. Confirm the stale-data warning. Search for an ID that phone has never opened and confirm it does not invent a result.
7. Turn the network back on. Confirm the warning clears after synchronization and the search matches the other phone.

## Troubleshooting

- **Incorrect email or password.** The Authentication user does not exist, or the password is wrong. The app uses the same message for both.
- **Account is not authorized.** Authentication succeeded, but `users/{uid}` is missing or the role is not `teacher` or `admin`.
- **Firebase configuration is required.** `.env` is missing values, or demo mode is off. Restart Expo after changing `.env`.
- **Permission denied.** The rules are not deployed, or the signed-in user has no profile document.
- **Student not found.** The ID is not in the active import. Check leading zeros and extra spaces. `10245` does not match `0010245`.
- **Blank or duplicate rows.** Fix the spreadsheet, or explicitly choose keep-first or keep-last for duplicates. Blank IDs always block the import.
- **Import stopped.** The previous active list is still the one teachers see. Start the import again. Do not expect a half-finished version to become active.
- **Phones disagree.** Confirm demo mode is off, both phones show Connected, and the published time matches. If one phone is offline, trust the phone that last synchronized.
- **Large import fails.** Firestore free-tier writes are limited per day. Split the file or wait for the quota to reset.
- **APK will not install.** Uninstall an older copy signed with a different key, and allow installs from the source you used to open the file.

## Logging

Production logs record event names such as sign-in and sign-out. They do not include student names, IDs, or room assignments.
