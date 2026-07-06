# Coffee Lab

Coffee Lab is a Next.js app for recording green coffee beans, roast logs, live roast timelines, and tastings.

## Development

```bash
npm run dev
```

Open http://localhost:3000.

## Google Sheets Sync Setup

Coffee Lab uses a Google Apps Script Web App as a simple free backend for Google Sheets. You do not need a Google Cloud service account.

### 1. Create the Apps Script

1. Open your Google Spreadsheet.
2. Click `Extensions` -> `Apps Script`.
3. Delete the starter code.
4. Copy all of [docs/google-apps-script/Code.gs](docs/google-apps-script/Code.gs).
5. Paste it into the Apps Script editor.
6. Save the project.

The script automatically creates these sheets if they do not exist:

`beans`

```text
id, name, country, purchaseDate, stockWeight, weightLossPercentage, createdAt, updatedAt
```

`roasts`

```text
id, roastDate, beanId, inputWeight, expectedOutputWeight, timelineJson, createdAt, updatedAt
```

### 2. Deploy as a Web App

1. Click `Deploy` -> `New deployment`.
2. Click the gear icon and choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Click `Deploy`.
6. Authorize the script when Google asks.
7. Copy the Web App URL ending in `/exec`.

### 3. Set the Environment Variable

For local development, create `.env.local`:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

For Vercel:

1. Open `Vercel` -> your project -> `Settings`.
2. Open `Environment Variables`.
3. Add `GOOGLE_APPS_SCRIPT_URL`.
4. Paste the Apps Script Web App `/exec` URL.
5. Redeploy the project.

### 4. Check the Connection

After setting `GOOGLE_APPS_SCRIPT_URL`, open:

```text
/api/sheets/ping
```

You should see JSON like:

```json
{
  "ok": true,
  "result": {
    "ok": true,
    "message": "Coffee Lab Apps Script is connected."
  }
}
```

## Sync Behavior

- Bean and roast edits update the UI immediately.
- Coffee Lab then saves to Google Sheets in the background.
- If saving fails, the app shows an error instead of silently overwriting local data.
- Failed changes are kept in a local pending queue and can be retried from the UI.
