import { createSign } from 'crypto';
import { Bean, Roast, RoastStep } from '@/types';

const DEFAULT_SPREADSHEET_ID = '1vOhv0-Mjzssw03fceQ14-W9p2Oa0hcMykoIsDpSOerE';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const BEAN_HEADERS = [
  'id',
  'name',
  'country',
  'purchaseDate',
  'currentWeight',
  'weightLossPercentage',
  'region',
  'farm',
  'producer',
  'altitude',
  'variety',
  'process',
  'cropYear',
  'purchaseShop',
  'purchasePrice',
  'initialWeight',
  'recommendedRoastDegree',
  'notes',
  'photoUrl',
  'createdAt',
];

const ROAST_HEADERS = [
  'id',
  'roastDate',
  'beanId',
  'greenWeight',
  'roastedWeight',
  'timeline',
  'yellowTime',
  'firstCrackTime',
  'dropTime',
  'developmentTime',
  'developmentRatio',
  'lossRatio',
  'status',
  'notes',
  'createdAt',
];

type SheetsSnapshot = {
  beans: Bean[];
  roasts: Roast[];
  steps: RoastStep[];
};

function spreadsheetId() {
  return process.env.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
}

function privateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = privateKey();
  if (!email || !key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: email,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google auth failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token ?? null;
}

async function sheetsFetch(path: string, init: RequestInit = {}, requireAuth = false) {
  const token = await getAccessToken();
  if (requireAuth && !token) {
    throw new Error('Google Sheets write requires GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.');
  }

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${SHEETS_API}/${spreadsheetId()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sheets API failed: ${response.status} ${text}`);
  }

  return response;
}

async function readRange(sheetName: string) {
  const encodedRange = encodeURIComponent(`${sheetName}!A:Z`);
  try {
    const response = await sheetsFetch(`/values/${encodedRange}`);
    const data = await response.json();
    return Array.isArray(data.values) ? data.values as string[][] : [];
  } catch {
    return readPublicCsv(sheetName);
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function readPublicCsv(sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  return parseCsv(await response.text());
}
function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function rowValue(headers: string[], row: string[], key: string) {
  const index = headers.indexOf(key);
  return index >= 0 ? row[index] ?? '' : '';
}

function normalizeBean(bean: Bean): Bean {
  return {
    ...bean,
    weightLossPercentage: typeof bean.weightLossPercentage === 'number' ? bean.weightLossPercentage : 15,
  };
}

function parseBeans(values: string[][]): Bean[] {
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).filter(row => row.some(Boolean)).map(row => normalizeBean({
    id: rowValue(headers, row, 'id'),
    name: rowValue(headers, row, 'name'),
    country: rowValue(headers, row, 'country'),
    region: rowValue(headers, row, 'region'),
    farm: rowValue(headers, row, 'farm'),
    producer: rowValue(headers, row, 'producer'),
    altitude: toNumber(rowValue(headers, row, 'altitude')),
    variety: rowValue(headers, row, 'variety'),
    process: rowValue(headers, row, 'process'),
    cropYear: rowValue(headers, row, 'cropYear'),
    purchaseShop: rowValue(headers, row, 'purchaseShop'),
    purchaseDate: rowValue(headers, row, 'purchaseDate'),
    purchasePrice: toNumber(rowValue(headers, row, 'purchasePrice')),
    initialWeight: toNumber(rowValue(headers, row, 'initialWeight')),
    currentWeight: toNumber(rowValue(headers, row, 'currentWeight')),
    weightLossPercentage: toNumber(rowValue(headers, row, 'weightLossPercentage'), 15),
    recommendedRoastDegree: rowValue(headers, row, 'recommendedRoastDegree') || 'Medium-Light',
    notes: rowValue(headers, row, 'notes'),
    photoUrl: rowValue(headers, row, 'photoUrl'),
    createdAt: rowValue(headers, row, 'createdAt') || new Date().toISOString(),
  })).filter(bean => bean.id);
}

function parseRoasts(values: string[][]): { roasts: Roast[]; steps: RoastStep[] } {
  if (values.length <= 1) return { roasts: [], steps: [] };
  const headers = values[0];
  const roasts: Roast[] = [];
  const steps: RoastStep[] = [];

  values.slice(1).filter(row => row.some(Boolean)).forEach(row => {
    const roastId = rowValue(headers, row, 'id');
    if (!roastId) return;

    const timelineRaw = rowValue(headers, row, 'timeline');
    let timeline: RoastStep[] = [];
    try {
      const parsed = JSON.parse(timelineRaw || '[]');
      if (Array.isArray(parsed)) timeline = parsed;
    } catch {
      timeline = [];
    }

    roasts.push({
      id: roastId,
      roastDate: rowValue(headers, row, 'roastDate'),
      beanId: rowValue(headers, row, 'beanId'),
      greenWeight: toNumber(rowValue(headers, row, 'greenWeight')),
      roastedWeight: toNumber(rowValue(headers, row, 'roastedWeight')),
      yellowTime: rowValue(headers, row, 'yellowTime'),
      firstCrackTime: rowValue(headers, row, 'firstCrackTime'),
      dropTime: rowValue(headers, row, 'dropTime'),
      developmentTime: rowValue(headers, row, 'developmentTime'),
      developmentRatio: toNumber(rowValue(headers, row, 'developmentRatio')),
      lossRatio: toNumber(rowValue(headers, row, 'lossRatio')),
      status: (rowValue(headers, row, 'status') || 'waiting_day7') as Roast['status'],
      notes: rowValue(headers, row, 'notes'),
      createdAt: rowValue(headers, row, 'createdAt') || new Date().toISOString(),
    });

    timeline.forEach((step, index) => {
      steps.push({
        id: step.id || `step_${roastId}_${index}`,
        roastId,
        time: step.time,
        heat: toNumber(step.heat),
        air: toNumber(step.air),
        memo: step.memo || '',
      });
    });
  });

  return { roasts, steps };
}

function beanToRow(bean: Bean) {
  const b = normalizeBean(bean);
  return BEAN_HEADERS.map(header => String((b as unknown as Record<string, unknown>)[header] ?? ''));
}

function roastToRow(roast: Roast, steps: RoastStep[]) {
  const timeline = steps
    .filter(step => step.roastId === roast.id)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(step => ({ id: step.id, roastId: step.roastId, time: step.time, heat: step.heat, air: step.air, memo: step.memo || '' }));

  const rowData: Record<string, unknown> = {
    ...roast,
    timeline: JSON.stringify(timeline),
  };

  return ROAST_HEADERS.map(header => String(rowData[header] ?? ''));
}

async function writeRange(sheetName: string, values: unknown[][]) {
  const encodedRange = encodeURIComponent(`${sheetName}!A1`);
  await sheetsFetch(`/values/${encodedRange}:clear`, { method: 'POST', body: '{}' }, true);
  await sheetsFetch(`/values/${encodedRange}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  }, true);
}

export async function readSheetsSnapshot(): Promise<SheetsSnapshot> {
  const [beanValues, roastValues] = await Promise.all([
    readRange('beans'),
    readRange('roasts'),
  ]);
  const beans = parseBeans(beanValues);
  const { roasts, steps } = parseRoasts(roastValues);
  return { beans, roasts, steps };
}

export async function writeSheetsSnapshot(snapshot: Partial<SheetsSnapshot>) {
  if (snapshot.beans) {
    const rows = [BEAN_HEADERS, ...snapshot.beans.map(beanToRow)];
    await writeRange('beans', rows);
  }

  if (snapshot.roasts) {
    const steps = snapshot.steps ?? (await readSheetsSnapshot()).steps;
    const rows = [ROAST_HEADERS, ...snapshot.roasts.map(roast => roastToRow(roast, steps))];
    await writeRange('roasts', rows);
  } else if (snapshot.steps) {
    const current = await readSheetsSnapshot();
    const rows = [ROAST_HEADERS, ...current.roasts.map(roast => roastToRow(roast, snapshot.steps || []))];
    await writeRange('roasts', rows);
  }
}


