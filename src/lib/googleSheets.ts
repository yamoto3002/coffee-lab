import { Bean, Roast, RoastStep, Tasting } from '@/types';
import { calculateDevRatio, calculateDevTime, calculateLossRatio } from '@/lib/db';
import { normalizeDateOnly } from '@/lib/date';

type AppsScriptJson = {
  ok?: boolean;
  error?: string;
  beans?: Record<string, unknown>[];
  roasts?: Record<string, unknown>[];
  tastings?: Record<string, unknown>[];
  bean?: Record<string, unknown>;
  roast?: Record<string, unknown>;
  tasting?: Record<string, unknown>;
  [key: string]: unknown;
};

type SheetsSnapshot = {
  beans: Bean[];
  roasts: Roast[];
  steps: RoastStep[];
  tastings: Tasting[];
};

type RoastTimelinePayload = {
  steps?: RoastStep[];
  secondCrackTime?: string;
};

const APPS_SCRIPT_HOST_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/;

export function validateAppsScriptConfig() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  if (!url) {
    return {
      ok: false,
      error: 'GOOGLE_APPS_SCRIPT_URLが未設定です。Apps Script Web Appの /exec URLを環境変数に設定してください。',
    };
  }
  if (!APPS_SCRIPT_HOST_RE.test(url)) {
    return {
      ok: false,
      error: 'GOOGLE_APPS_SCRIPT_URLが不正です。https://script.google.com/macros/s/.../exec で終わるWeb App URLを設定してください。',
    };
  }
  return { ok: true, url };
}

function appsScriptUrl() {
  const validation = validateAppsScriptConfig();
  if (!validation.ok || !validation.url) throw new Error(validation.error);
  return validation.url;
}

function toNumber(value: unknown, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toStringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

async function parseJsonResponse(response: Response): Promise<AppsScriptJson> {
  const text = await response.text();
  try {
    return JSON.parse(text) as AppsScriptJson;
  } catch {
    console.error('Apps Script returned non-JSON response:', text.slice(0, 500));
    throw new Error('Google Apps ScriptからJSONではない応答が返りました。同期はバックグラウンドで再試行します。');
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
    requestUrl = `${url}${url.includes('?') ? '&' : '?'}action=${encodeURIComponent(action)}`;
  }

  const response = await fetch(requestUrl, init);
  const data = await parseJsonResponse(response);
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Apps Script request failed: ${response.status}`);
  }
  return data;
}

function normalizeBean(row: Record<string, unknown>): Bean {
  const initialWeight = toNumber(row.initialWeight, toNumber(row.stockWeight));
  const currentWeight = toNumber(row.currentWeight, toNumber(row.stockWeight, initialWeight));
  return {
    id: toStringValue(row.id),
    name: toStringValue(row.name),
    country: toStringValue(row.country),
    region: toStringValue(row.region),
    farm: toStringValue(row.farm),
    producer: toStringValue(row.producer),
    altitude: toNumber(row.altitude),
    variety: toStringValue(row.variety),
    process: toStringValue(row.process) || 'Washed',
    cropYear: toStringValue(row.cropYear),
    purchaseShop: toStringValue(row.purchaseShop),
    purchaseDate: normalizeDateOnly(row.purchaseDate),
    purchasePrice: toNumber(row.purchasePrice),
    initialWeight,
    currentWeight,
    weightLossPercentage: toNumber(row.weightLossPercentage, 15),
    themeColor: toStringValue(row.themeColor) || undefined,
    notes: toStringValue(row.notes),
    photoUrl: toStringValue(row.photoUrl),
    createdAt: toStringValue(row.createdAt) || new Date().toISOString(),
    updatedAt: toStringValue(row.updatedAt) || undefined,
  };
}

function parseTimelinePayload(raw: unknown): RoastTimelinePayload {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return { steps: parsed as RoastStep[] };
    if (parsed && typeof parsed === 'object') return parsed as RoastTimelinePayload;
  } catch {
    return {};
  }
  return {};
}

function normalizeRoast(row: Record<string, unknown>): { roast: Roast; steps: RoastStep[] } {
  const roastId = toStringValue(row.id);
  const timeline = parseTimelinePayload(row.timelineJson);
  const greenWeight = toNumber(row.greenWeight, toNumber(row.inputWeight));
  const roastedWeight = toNumber(row.roastedWeight, toNumber(row.expectedOutputWeight));
  const firstCrackTime = toStringValue(row.firstCrackTime) || null;
  const dropTime = toStringValue(row.dropTime);
  const steps = Array.isArray(timeline.steps)
    ? timeline.steps.map((step, index) => ({
        id: step.id || `step_${roastId}_${index}`,
        roastId,
        time: step.time || '00:00',
        heat: toNumber(step.heat),
        air: toNumber(step.air),
        memo: step.memo || '',
      }))
    : [];

  return {
    roast: {
      id: roastId,
      roastDate: normalizeDateOnly(row.roastDate),
      beanId: toStringValue(row.beanId),
      greenWeight,
      roastedWeight,
      yellowTime: toStringValue(row.yellowTime),
      firstCrackTime,
      firstCrackStatus: (toStringValue(row.firstCrackStatus) || (firstCrackTime ? 'recorded' : 'unknown')) as Roast['firstCrackStatus'],
      dropTime,
      developmentTime: firstCrackTime ? (toStringValue(row.developmentTime) || calculateDevTime(firstCrackTime, dropTime)) : null,
      developmentRatio: firstCrackTime ? toNullableNumber(row.developmentRatio, calculateDevRatio(firstCrackTime, dropTime)) : null,
      lossRatio: toNumber(row.lossRatio, calculateLossRatio(greenWeight, roastedWeight)),
      status: (toStringValue(row.status) || 'roasted') as Roast['status'],
      notes: toStringValue(row.notes),
      createdAt: toStringValue(row.createdAt) || new Date().toISOString(),
      updatedAt: toStringValue(row.updatedAt) || undefined,
    },
    steps,
  };
}

function toNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === '') return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeTasting(row: Record<string, unknown>): Tasting {
  return {
    id: toStringValue(row.id),
    roastId: toStringValue(row.roastId),
    tastingIndex: toNumber(row.tastingIndex, toNumber(row.tastingDay, 1)),
    tastingDay: toNumber(row.tastingDay, toNumber(row.dayAfterRoast)),
    tastingDate: normalizeDateOnly(row.tastingDate),
    dayAfterRoast: toNumber(row.dayAfterRoast, toNumber(row.tastingDay)),
    doseGrams: toNumber(row.doseGrams),
    fragrance: toNumber(row.fragrance),
    aroma: toNumber(row.aroma),
    flavor: toNumber(row.flavor),
    sweetness: toNumber(row.sweetness),
    acidityIntensity: toNumber(row.acidityIntensity),
    acidityQuality: toNumber(row.acidityQuality),
    body: toNumber(row.body),
    aftertaste: toNumber(row.aftertaste),
    balance: toNumber(row.balance),
    cleanCup: toNumber(row.cleanCup),
    overall: toNumber(row.overall),
    score: toNumber(row.score),
    recommendationRating: toNumber(row.recommendationRating),
    flavors: toStringArray(row.flavors),
    negatives: toStringArray(row.negatives),
    improvements: toStringValue(row.improvements),
    impressionColor: toStringValue(row.impressionColor) || '#D09B6A',
    notes: toStringValue(row.notes),
    photos: toStringArray(row.photos),
    status: toStringValue(row.status) === 'pending' ? 'pending' : 'completed',
    createdAt: toStringValue(row.createdAt) || new Date().toISOString(),
    updatedAt: toStringValue(row.updatedAt) || undefined,
  };
}

function beanToAppsScriptRow(bean: Bean): Record<string, unknown> {
  return {
    id: bean.id,
    name: bean.name,
    country: bean.country,
    region: bean.region,
    farm: bean.farm,
    producer: bean.producer,
    altitude: bean.altitude,
    variety: bean.variety,
    process: bean.process,
    cropYear: bean.cropYear,
    purchaseShop: bean.purchaseShop,
    purchaseDate: bean.purchaseDate,
    purchasePrice: bean.purchasePrice,
    initialWeight: bean.initialWeight,
    currentWeight: bean.currentWeight,
    weightLossPercentage: bean.weightLossPercentage,
    themeColor: bean.themeColor || '',
    notes: bean.notes,
    photoUrl: bean.photoUrl || '',
    createdAt: bean.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function roastToAppsScriptRow(roast: Roast, steps: RoastStep[]): Record<string, unknown> {
  const roastSteps = steps
    .filter(step => step.roastId === roast.id)
    .sort((a, b) => a.time.localeCompare(b.time));
  const secondCrackMatch = roast.notes.match(/2nd Crack:\s*([0-9]{2}:[0-9]{2})/);
  const timelinePayload: RoastTimelinePayload = {
    steps: roastSteps,
    secondCrackTime: secondCrackMatch?.[1] || '',
  };

  return {
    id: roast.id,
    roastDate: roast.roastDate,
    beanId: roast.beanId,
    greenWeight: roast.greenWeight,
    roastedWeight: roast.roastedWeight,
    yellowTime: roast.yellowTime,
    firstCrackTime: roast.firstCrackTime || '',
    firstCrackStatus: roast.firstCrackStatus || (roast.firstCrackTime ? 'recorded' : 'unknown'),
    dropTime: roast.dropTime,
    developmentTime: roast.developmentTime || '',
    developmentRatio: roast.developmentRatio ?? '',
    lossRatio: roast.lossRatio,
    status: roast.status,
    notes: roast.notes,
    timelineJson: JSON.stringify(timelinePayload),
    createdAt: roast.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function tastingToAppsScriptRow(tasting: Tasting): Record<string, unknown> {
  return {
    id: tasting.id,
    roastId: tasting.roastId,
    tastingIndex: tasting.tastingIndex,
    tastingDate: tasting.tastingDate,
    dayAfterRoast: tasting.dayAfterRoast,
    tastingDay: tasting.dayAfterRoast,
    doseGrams: tasting.doseGrams,
    score: tasting.score,
    fragrance: tasting.fragrance,
    aroma: tasting.aroma,
    flavor: tasting.flavor,
    sweetness: tasting.sweetness,
    acidityIntensity: tasting.acidityIntensity,
    acidityQuality: tasting.acidityQuality,
    body: tasting.body,
    aftertaste: tasting.aftertaste,
    balance: tasting.balance,
    cleanCup: tasting.cleanCup,
    overall: tasting.overall,
    recommendationRating: tasting.recommendationRating,
    flavors: JSON.stringify(tasting.flavors || []),
    negatives: JSON.stringify(tasting.negatives || []),
    improvements: tasting.improvements,
    impressionColor: tasting.impressionColor,
    notes: tasting.notes,
    photos: JSON.stringify(tasting.photos || []),
    status: tasting.status,
    createdAt: tasting.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export async function pingAppsScript() {
  return callAppsScript('ping');
}

export async function readSheetsSnapshot(): Promise<SheetsSnapshot> {
  const [beansResponse, roastsResponse, tastingsResponse] = await Promise.all([
    callAppsScript('getBeans'),
    callAppsScript('getRoasts'),
    callAppsScript('getTastings'),
  ]);

  const beans = Array.isArray(beansResponse.beans)
    ? beansResponse.beans.map(normalizeBean).filter(bean => bean.id)
    : [];
  const parsedRoasts = Array.isArray(roastsResponse.roasts)
    ? roastsResponse.roasts.map(normalizeRoast).filter(item => item.roast.id)
    : [];
  const tastings = Array.isArray(tastingsResponse.tastings)
    ? tastingsResponse.tastings.map(normalizeTasting).filter(tasting => tasting.id && tasting.roastId && tasting.status === 'completed')
    : [];

  return {
    beans,
    roasts: parsedRoasts.map(item => item.roast),
    steps: parsedRoasts.flatMap(item => item.steps),
    tastings,
  };
}

export async function writeSheetsSnapshot(snapshot: Partial<SheetsSnapshot>) {
  if (snapshot.beans) {
    await Promise.all(snapshot.beans.map(bean => callAppsScript('updateBean', { bean: beanToAppsScriptRow(bean) })));
  }
  if (snapshot.roasts) {
    const steps = snapshot.steps || [];
    await Promise.all(snapshot.roasts.map(roast => callAppsScript('updateRoast', { roast: roastToAppsScriptRow(roast, steps) })));
  }
  if (snapshot.tastings) {
    await Promise.all(snapshot.tastings.map(tasting => callAppsScript('updateTasting', { tasting: tastingToAppsScriptRow(tasting) })));
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

export async function upsertTasting(tasting: Tasting) {
  const response = await callAppsScript('updateTasting', { tasting: tastingToAppsScriptRow(tasting) });
  return response.tasting ? normalizeTasting(response.tasting) : tasting;
}

export async function deleteTastingFromSheet(id: string) {
  await callAppsScript('deleteTasting', { id });
}

export async function resetSheetsData() {
  await callAppsScript('resetAll', {});
}
