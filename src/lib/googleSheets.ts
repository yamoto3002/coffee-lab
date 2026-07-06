import { Bean, Roast, RoastStep } from '@/types';
import { calculateDevRatio, calculateDevTime, calculateLossRatio } from '@/lib/db';

type AppsScriptJson = {
  ok?: boolean;
  error?: string;
  beans?: AppsScriptBeanRow[];
  roasts?: AppsScriptRoastRow[];
  bean?: AppsScriptBeanRow;
  roast?: AppsScriptRoastRow;
  [key: string]: unknown;
};

type SheetsSnapshot = {
  beans: Bean[];
  roasts: Roast[];
  steps: RoastStep[];
};

type AppsScriptBeanRow = {
  id?: string;
  name?: string;
  country?: string;
  purchaseDate?: string;
  stockWeight?: string | number;
  weightLossPercentage?: string | number;
  createdAt?: string;
  updatedAt?: string;
};

type AppsScriptRoastRow = {
  id?: string;
  roastDate?: string;
  beanId?: string;
  inputWeight?: string | number;
  expectedOutputWeight?: string | number;
  timelineJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RoastTimelinePayload = {
  steps?: RoastStep[];
  firstCrackTime?: string;
  secondCrackTime?: string;
  dropTime?: string;
  notes?: string;
  status?: Roast['status'];
};

const DEFAULT_ROAST_STATUS: Roast['status'] = 'waiting_day7';

function appsScriptUrl() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL is not set. Deploy the Google Apps Script Web App and set its URL in your environment variables.');
  }
  return url;
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function parseJsonResponse(response: Response): Promise<AppsScriptJson> {
  const text = await response.text();
  try {
    return JSON.parse(text) as AppsScriptJson;
  } catch {
    throw new Error(`Apps Script returned non-JSON response: ${text.slice(0, 240)}`);
  }
}

async function callAppsScript(action: string, payload?: Record<string, unknown>): Promise<AppsScriptJson> {
  const url = appsScriptUrl();
  const init: RequestInit = {
    cache: 'no-store',
    redirect: 'follow',
  };
  let requestUrl = url;

  if (payload) {
    init.method = 'POST';
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify({ action, ...payload });
  } else {
    const separator = url.includes('?') ? '&' : '?';
    requestUrl = `${url}${separator}action=${encodeURIComponent(action)}`;
  }

  const response = await fetch(requestUrl, init);
  const data = await parseJsonResponse(response);

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Apps Script request failed: ${response.status}`);
  }

  return data;
}

function normalizeBean(row: AppsScriptBeanRow): Bean {
  const stockWeight = toNumber(row.stockWeight);
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    country: String(row.country || ''),
    region: '',
    farm: '',
    producer: '',
    altitude: 0,
    variety: '',
    process: 'Washed',
    cropYear: '',
    purchaseShop: '',
    purchaseDate: String(row.purchaseDate || ''),
    purchasePrice: 0,
    initialWeight: stockWeight,
    currentWeight: stockWeight,
    weightLossPercentage: toNumber(row.weightLossPercentage, 15),
    recommendedRoastDegree: 'Medium-Light',
    notes: '',
    photoUrl: '',
    createdAt: String(row.createdAt || new Date().toISOString()),
  };
}

function parseTimelinePayload(raw: string | undefined): RoastTimelinePayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { steps: parsed as RoastStep[] };
    if (parsed && typeof parsed === 'object') return parsed as RoastTimelinePayload;
  } catch {
    return {};
  }
  return {};
}

function normalizeRoast(row: AppsScriptRoastRow): { roast: Roast; steps: RoastStep[] } {
  const roastId = String(row.id || '');
  const timeline = parseTimelinePayload(row.timelineJson);
  const inputWeight = toNumber(row.inputWeight);
  const expectedOutputWeight = toNumber(row.expectedOutputWeight);
  const firstCrackTime = timeline.firstCrackTime || '';
  const dropTime = timeline.dropTime || '';
  const steps = Array.isArray(timeline.steps)
    ? timeline.steps.map((step, index) => ({
        id: step.id || `step_${roastId}_${index}`,
        roastId,
        time: step.time,
        heat: toNumber(step.heat),
        air: toNumber(step.air),
        memo: step.memo || '',
      }))
    : [];

  return {
    roast: {
      id: roastId,
      roastDate: String(row.roastDate || ''),
      beanId: String(row.beanId || ''),
      greenWeight: inputWeight,
      roastedWeight: expectedOutputWeight,
      yellowTime: '',
      firstCrackTime,
      dropTime,
      developmentTime: calculateDevTime(firstCrackTime, dropTime),
      developmentRatio: calculateDevRatio(firstCrackTime, dropTime),
      lossRatio: calculateLossRatio(inputWeight, expectedOutputWeight),
      status: timeline.status || DEFAULT_ROAST_STATUS,
      notes: timeline.notes || (timeline.secondCrackTime ? `2nd Crack: ${timeline.secondCrackTime}` : ''),
      createdAt: String(row.createdAt || new Date().toISOString()),
    },
    steps,
  };
}

function beanToAppsScriptRow(bean: Bean): AppsScriptBeanRow {
  return {
    id: bean.id,
    name: bean.name,
    country: bean.country,
    purchaseDate: bean.purchaseDate,
    stockWeight: bean.currentWeight,
    weightLossPercentage: bean.weightLossPercentage,
    createdAt: bean.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function roastToAppsScriptRow(roast: Roast, steps: RoastStep[]): AppsScriptRoastRow {
  const roastSteps = steps
    .filter(step => step.roastId === roast.id)
    .sort((a, b) => a.time.localeCompare(b.time));
  const secondCrackMatch = roast.notes.match(/2nd Crack:\s*([0-9]{2}:[0-9]{2})/);
  const timelinePayload: RoastTimelinePayload = {
    steps: roastSteps,
    firstCrackTime: roast.firstCrackTime,
    secondCrackTime: secondCrackMatch?.[1] || '',
    dropTime: roast.dropTime,
    notes: roast.notes,
    status: roast.status,
  };

  return {
    id: roast.id,
    roastDate: roast.roastDate,
    beanId: roast.beanId,
    inputWeight: roast.greenWeight,
    expectedOutputWeight: roast.roastedWeight,
    timelineJson: JSON.stringify(timelinePayload),
    createdAt: roast.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export async function pingAppsScript() {
  return callAppsScript('ping');
}

export async function readSheetsSnapshot(): Promise<SheetsSnapshot> {
  const [beansResponse, roastsResponse] = await Promise.all([
    callAppsScript('getBeans'),
    callAppsScript('getRoasts'),
  ]);

  const beans = Array.isArray(beansResponse.beans)
    ? beansResponse.beans.map(normalizeBean).filter(bean => bean.id)
    : [];
  const parsedRoasts = Array.isArray(roastsResponse.roasts)
    ? roastsResponse.roasts.map(normalizeRoast).filter(item => item.roast.id)
    : [];

  return {
    beans,
    roasts: parsedRoasts.map(item => item.roast),
    steps: parsedRoasts.flatMap(item => item.steps),
  };
}

export async function writeSheetsSnapshot(snapshot: Partial<SheetsSnapshot>) {
  if (snapshot.beans) {
    await Promise.all(snapshot.beans.map(bean => (
      callAppsScript('updateBean', { bean: beanToAppsScriptRow(bean) })
    )));
  }

  if (snapshot.roasts) {
    const steps = snapshot.steps || [];
    await Promise.all(snapshot.roasts.map(roast => (
      callAppsScript('updateRoast', { roast: roastToAppsScriptRow(roast, steps) })
    )));
  }
}

export async function upsertBean(bean: Bean) {
  const response = await callAppsScript('updateBean', { bean: beanToAppsScriptRow(bean) });
  return response.bean ? normalizeBean(response.bean) : bean;
}

export async function deleteBeanFromSheet(id: string) {
  await callAppsScript('deleteBean', { id });
}

export async function upsertRoast(roast: Roast, steps: RoastStep[]) {
  const response = await callAppsScript('updateRoast', { roast: roastToAppsScriptRow(roast, steps) });
  return response.roast ? normalizeRoast(response.roast).roast : roast;
}

export async function deleteRoastFromSheet(id: string) {
  await callAppsScript('deleteRoast', { id });
}
