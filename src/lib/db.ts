import { AppSettings, Bean, ExternalCoffee, Roast, RoastStatus, RoastStep, Tasting } from '../types';
import { diffDateDays, normalizeDateOnly, todayDateString } from './date';

export function timeToSeconds(timeStr: string | null | undefined): number {
  const normalized = normalizeElapsedTime(timeStr);
  if (!normalized || !normalized.includes(':')) return 0;
  const [mins, secs] = normalized.split(':').map(Number);
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return 0;
  return mins * 60 + secs;
}

export function secondsToTime(secs: number): string {
  if (secs < 0 || !Number.isFinite(secs)) return '00:00';
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}

export function normalizeElapsedTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Sheets can expose a time-only cell as a fraction of one day. Plain
    // numbers written by Coffee Lab are elapsed seconds.
    const seconds = value > 0 && value < 1 ? Math.round(value * 86400) : value;
    return seconds >= 0 && seconds <= 21600 ? secondsToTime(seconds) : '';
  }

  const raw = String(value).trim();
  if (!raw) return '';

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return seconds <= 21600 ? secondsToTime(seconds) : '';
  }

  // Historic Google Sheets time cells may have been serialized against the
  // Excel epoch. Recover only that known legacy shape. A normal ISO timestamp
  // is a clock time and must never leak into an elapsed-time field.
  const legacyDate = raw.match(/^(?:1899|1900)-\d{2}-\d{2}[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (legacyDate) {
    // Read the legacy cell's clock portion literally. Applying a timezone here
    // shifts elapsed time and was the source of several incorrect Crack values.
    const hours = Number(legacyDate[1]);
    const minutes = Number(legacyDate[2]);
    const seconds = Number(legacyDate[3] || 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    return minutes < 60 && seconds < 60 && total <= 21600 ? secondsToTime(total) : '';
  }

  const hms = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hms) {
    const first = Number(hms[1]);
    const second = Number(hms[2]);
    const third = Number(hms[3]);
    if ([first, second, third].every(Number.isFinite)) {
      const seconds = first * 3600 + second * 60 + third;
      return second < 60 && third < 60 && seconds <= 21600 ? secondsToTime(seconds) : '';
    }
  }

  const ms = raw.match(/^(\d{1,3}):(\d{1,2})$/);
  if (ms) {
    const mins = Number(ms[1]);
    const secs = Number(ms[2]);
    if (Number.isFinite(mins) && Number.isFinite(secs) && secs < 60 && mins <= 360) {
      return secondsToTime(mins * 60 + secs);
    }
  }

  return '';
}

export type RoastMilestoneTimes = {
  firstCrackTime: string;
  secondCrackTime: string;
  dropTime: string;
};

export function getMilestoneTimesFromSteps(steps: Partial<RoastStep>[]): RoastMilestoneTimes {
  const result: RoastMilestoneTimes = { firstCrackTime: '', secondCrackTime: '', dropTime: '' };
  for (const step of steps) {
    const time = normalizeElapsedTime(step.time);
    if (!time) continue;
    const memo = String(step.memo || '').trim().toLowerCase();
    if (!result.firstCrackTime && /^(1st crack|first crack)(?:\b|\s|\/)/i.test(memo)) result.firstCrackTime = time;
    if (!result.secondCrackTime && /^(2nd crack|second crack)(?:\b|\s|\/)/i.test(memo)) result.secondCrackTime = time;
    if (!result.dropTime && /^(drop)(?:\b|\s|\/)/i.test(memo)) result.dropTime = time;
  }
  return result;
}

export function calculateDevTime(firstCrack: string | null | undefined, drop: string | null | undefined): string | null {
  const fcSecs = timeToSeconds(firstCrack);
  const dropSecs = timeToSeconds(drop);
  if (fcSecs <= 0 || dropSecs <= fcSecs) return null;
  return secondsToTime(dropSecs - fcSecs);
}

export function calculateDevRatio(firstCrack: string | null | undefined, drop: string | null | undefined): number | null {
  const fcSecs = timeToSeconds(firstCrack);
  const dropSecs = timeToSeconds(drop);
  if (fcSecs <= 0 || dropSecs <= fcSecs) return null;
  return Math.round(((dropSecs - fcSecs) / dropSecs) * 1000) / 10;
}

export function calculateLossRatio(green: number, roasted: number): number {
  if (green <= 0 || roasted <= 0 || green < roasted) return 0;
  return Math.round(((green - roasted) / green) * 1000) / 10;
}

export function getAgingDays(dateStr: string): number {
  return Math.max(0, diffDateDays(dateStr));
}

export function getYearsSince(year: string): number | null {
  const value = Number.parseInt(year, 10);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, new Date().getFullYear() - value);
}

export function estimateRoastedWeight(roast: Roast, bean?: Bean | null): number {
  if (roast.roastedWeight > 0) return roast.roastedWeight;
  const expectedLoss = bean?.weightLossPercentage ?? roast.lossRatio ?? 15;
  return Math.round(roast.greenWeight * (1 - expectedLoss / 100) * 10) / 10;
}

export function getRoastBatchBalance(roast: Roast, tastings: Tasting[], bean?: Bean | null) {
  const estimatedRoastedWeight = estimateRoastedWeight(roast, bean);
  const usedGrams = Math.round(tastings
    .filter(tasting => tasting.roastId === roast.id && tasting.status === 'completed')
    .reduce((sum, tasting) => sum + toNumber(tasting.doseGrams), 0) * 10) / 10;
  const remainingGrams = Math.max(0, Math.round((estimatedRoastedWeight - usedGrams) * 10) / 10);
  return { estimatedRoastedWeight, usedGrams, remainingGrams };
}

const STORAGE_KEYS = {
  BEANS: 'coffeelab_beans',
  ROASTS: 'coffeelab_roasts',
  STEPS: 'coffeelab_steps',
  TASTINGS: 'coffeelab_tastings',
  EXTERNAL_COFFEES: 'coffeelab_external_coffees',
  PENDING_SYNC: 'coffeelab_pending_sync',
  SETTINGS: 'coffeelab_settings',
  LAST_MUTATION: 'coffeelab_last_local_mutation',
  LAST_SYNC: 'coffeelab_last_cloud_sync',
};

const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'detail',
  showBeanDetails: true,
  showCropYear: true,
  showPurchaseAge: true,
  showProcess: true,
  showStock: true,
  showAnalysisCards: true,
  showHomeSuggestions: true,
  showLiveRoastDetails: true,
};

export type CloudSyncResult = {
  ok: boolean;
  error?: string;
  pending?: boolean;
};

type CloudSyncPayload = {
  action?: 'upsertBean' | 'deleteBean' | 'upsertRoast' | 'deleteRoast' | 'upsertTasting' | 'deleteTasting' | 'resetAll';
  bean?: Bean;
  roast?: Roast;
  tasting?: Tasting;
  id?: string;
  beans?: Bean[];
  roasts?: Roast[];
  steps?: RoastStep[];
  tastings?: Tasting[];
};

function getLocalData<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error('Failed to parse localStorage key: ' + key, error);
    return fallback;
  }
}

function saveLocalData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function markLocalMutation(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_MUTATION, String(Date.now()));
}

function getTimestamp(key: string): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(key) || 0) || 0;
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === '' || value === null || value === undefined) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeStringArray(value: unknown): string[] {
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

function extractSecondCrackTime(input: Partial<Roast>): string {
  const direct = normalizeElapsedTime((input as Roast & { secondCrackTime?: unknown }).secondCrackTime);
  if (direct) return direct;
  const notesMatch = String(input.notes || '').match(/2nd Crack:\s*([0-9]{1,3}:[0-9]{2})/i);
  return normalizeElapsedTime(notesMatch?.[1]);
}

function normalizeBean(bean: Partial<Bean>): Bean {
  const initialWeight = toNumber(bean.initialWeight, toNumber((bean as { stockWeight?: unknown }).stockWeight));
  const currentWeight = toNumber(bean.currentWeight, toNumber((bean as { stockWeight?: unknown }).stockWeight, initialWeight));
  return {
    id: String(bean.id || ''),
    name: String(bean.name || ''),
    country: String(bean.country || ''),
    region: String(bean.region || ''),
    farm: String(bean.farm || ''),
    producer: String(bean.producer || ''),
    altitude: toNumber(bean.altitude),
    variety: String(bean.variety || ''),
    process: String(bean.process || 'Washed'),
    cropYear: String(bean.cropYear || ''),
    purchaseShop: String(bean.purchaseShop || ''),
    purchaseDate: normalizeDateOnly(bean.purchaseDate),
    purchasePrice: toNumber(bean.purchasePrice),
    initialWeight,
    currentWeight,
    weightLossPercentage: toNumber(bean.weightLossPercentage, 15),
    themeColor: bean.themeColor || defaultBeanThemeColor(bean.country, bean.process),
    notes: String(bean.notes || ''),
    photoUrl: bean.photoUrl || '',
    createdAt: String(bean.createdAt || new Date().toISOString()),
    updatedAt: bean.updatedAt,
  };
}

function normalizeRoast(roast: Partial<Roast>): Roast {
  const greenWeight = toNumber(roast.greenWeight, toNumber((roast as { inputWeight?: unknown }).inputWeight));
  const roastedWeight = toNumber(roast.roastedWeight, toNumber((roast as { expectedOutputWeight?: unknown }).expectedOutputWeight));
  const firstCrackTime = normalizeElapsedTime(roast.firstCrackTime) || null;
  const secondCrackTime = extractSecondCrackTime(roast) || null;
  const dropTime = normalizeElapsedTime(roast.dropTime);
  const firstCrackStatus = roast.firstCrackStatus || (firstCrackTime ? 'recorded' : 'unknown');
  return {
    id: String(roast.id || ''),
    beanId: String(roast.beanId || ''),
    roastDate: normalizeDateOnly(roast.roastDate),
    greenWeight,
    roastedWeight,
    yellowTime: normalizeElapsedTime(roast.yellowTime),
    firstCrackTime,
    firstCrackStatus,
    secondCrackTime,
    dropTime,
    developmentTime: firstCrackTime ? (normalizeElapsedTime(roast.developmentTime) || calculateDevTime(firstCrackTime, dropTime)) : null,
    developmentRatio: firstCrackTime ? toNullableNumber(roast.developmentRatio, calculateDevRatio(firstCrackTime, dropTime)) : null,
    lossRatio: toNumber(roast.lossRatio, calculateLossRatio(greenWeight, roastedWeight)),
    status: (roast.status || 'roasted') as RoastStatus,
    notes: String(roast.notes || ''),
    createdAt: String(roast.createdAt || new Date().toISOString()),
    updatedAt: roast.updatedAt,
  };
}

function normalizeRoastStep(step: Partial<RoastStep>, fallbackRoastId = '', index = 0): RoastStep {
  return {
    id: String(step.id || `step_${fallbackRoastId || 'unknown'}_${index}`),
    roastId: String(step.roastId || fallbackRoastId),
    time: normalizeElapsedTime(step.time) || '00:00',
    heat: toNumber(step.heat),
    air: toNumber(step.air),
    memo: String(step.memo || ''),
  };
}

function toNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === '') return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeTasting(tasting: Partial<Tasting>, roast?: Roast): Tasting {
  const tastingDate = normalizeDateOnly(tasting.tastingDate) || todayDateString();
  const dayAfterRoast = roast ? Math.max(0, diffDateDays(roast.roastDate, tastingDate)) : toNumber(tasting.dayAfterRoast, toNumber(tasting.tastingDay));
  const tastingIndex = toNumber(tasting.tastingIndex, toNumber(tasting.tastingDay, 1));
  return {
    id: String(tasting.id || `t_${tasting.roastId || 'unknown'}_${Date.now()}`),
    roastId: String(tasting.roastId || ''),
    tastingIndex,
    tastingDay: dayAfterRoast,
    tastingDate,
    dayAfterRoast,
    doseGrams: toNumber(tasting.doseGrams),
    fragrance: toNumber(tasting.fragrance),
    aroma: toNumber(tasting.aroma),
    flavor: toNumber(tasting.flavor),
    sweetness: toNumber(tasting.sweetness),
    acidityIntensity: toNumber(tasting.acidityIntensity),
    acidityQuality: toNumber(tasting.acidityQuality),
    body: toNumber(tasting.body),
    aftertaste: toNumber(tasting.aftertaste),
    balance: toNumber(tasting.balance),
    cleanCup: toNumber(tasting.cleanCup),
    overall: toNumber(tasting.overall),
    score: toNumber(tasting.score),
    recommendationRating: toNumber(tasting.recommendationRating),
    flavors: normalizeStringArray(tasting.flavors),
    negatives: normalizeStringArray(tasting.negatives),
    improvements: String(tasting.improvements || ''),
    impressionColor: String(tasting.impressionColor || '#00DFFF'),
    notes: String(tasting.notes || ''),
    photos: normalizeStringArray(tasting.photos),
    status: tasting.status === 'pending' ? 'pending' : 'completed',
    createdAt: String(tasting.createdAt || new Date().toISOString()),
    updatedAt: tasting.updatedAt,
  };
}

function isMeaningfulTasting(tasting: Tasting): boolean {
  if (!tasting.id || !tasting.roastId || tasting.status !== 'completed') return false;
  return tasting.score > 0
    || tasting.recommendationRating > 0
    || tasting.doseGrams > 0
    || tasting.flavors.length > 0
    || tasting.negatives.length > 0
    || tasting.improvements.trim().length > 0
    || tasting.notes.trim().length > 0;
}

function normalizeExternalCoffee(input: Partial<ExternalCoffee>): ExternalCoffee {
  return {
    id: String(input.id || `ec_${Date.now()}`),
    name: String(input.name || ''),
    roaster: String(input.roaster || ''),
    country: String(input.country || ''),
    region: String(input.region || ''),
    variety: String(input.variety || ''),
    process: String(input.process || ''),
    roastLevel: String(input.roastLevel || ''),
    purchaseDate: normalizeDateOnly(input.purchaseDate),
    tastingDate: normalizeDateOnly(input.tastingDate) || todayDateString(),
    brewMethod: String(input.brewMethod || ''),
    score: toNumber(input.score),
    impressionColor: String(input.impressionColor || '#00DFFF'),
    notes: String(input.notes || ''),
    createdAt: String(input.createdAt || new Date().toISOString()),
    updatedAt: input.updatedAt,
  };
}

function defaultBeanThemeColor(country?: string, process?: string): string {
  const text = `${country || ''} ${process || ''}`.toLowerCase();
  if (text.includes('kenya')) return '#C2410C';
  if (text.includes('colombia')) return '#CA8A04';
  if (text.includes('ethiopia')) return '#EA580C';
  if (text.includes('brazil')) return '#92400E';
  if (text.includes('papua')) return '#6D28D9';
  if (text.includes('natural')) return '#BE123C';
  if (text.includes('washed')) return '#0E7490';
  return '#D09B6A';
}

function getPendingSyncPayloads(): CloudSyncPayload[] {
  return getLocalData<CloudSyncPayload>(STORAGE_KEYS.PENDING_SYNC, []);
}

function savePendingSyncPayloads(payloads: CloudSyncPayload[]): void {
  saveLocalData(STORAGE_KEYS.PENDING_SYNC, payloads);
}

function sameEntityPayload(a: CloudSyncPayload, b: CloudSyncPayload): boolean {
  if (a.action !== b.action) return false;
  if (a.action === 'upsertBean') return a.bean?.id === b.bean?.id;
  if (a.action === 'deleteBean') return a.id === b.id;
  if (a.action === 'upsertRoast') return a.roast?.id === b.roast?.id;
  if (a.action === 'deleteRoast') return a.id === b.id;
  if (a.action === 'upsertTasting') return a.tasting?.id === b.tasting?.id;
  if (a.action === 'deleteTasting') return a.id === b.id;
  if (a.action === 'resetAll') return true;
  return false;
}

function enqueuePendingSync(payload: CloudSyncPayload): void {
  const pending = getPendingSyncPayloads();
  savePendingSyncPayloads([...pending.filter(item => !sameEntityPayload(item, payload)), payload]);
}

function userFriendlySyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!/GOOGLE_APPS_SCRIPT_URL.*未設定/i.test(message)) {
    console.error('Google Sheets sync detail:', error);
  }
  if (/json|html|<!doctype|<html|apps script/i.test(message)) {
    return 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。';
  }
  if (/failed to fetch|network|timeout/i.test(message)) {
    return '通信できませんでした。ローカルに保存し、あとで再試行します。';
  }
  return message || 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。';
}

async function postCloudSync(payload: CloudSyncPayload, queueOnFail = true): Promise<CloudSyncResult> {
  if (typeof window === 'undefined') return { ok: false, error: 'Browser environment is required.' };
  try {
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Google Sheets sync failed: ${response.status}`);
    }
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
    return { ok: true };
  } catch (error) {
    if (queueOnFail) enqueuePendingSync(payload);
    return { ok: false, error: userFriendlySyncError(error), pending: queueOnFail };
  }
}

async function fetchCloudSnapshot(): Promise<({ beans: Bean[]; roasts: Roast[]; steps: RoastStep[]; tastings: Tasting[] } & CloudSyncResult) | CloudSyncResult> {
  if (typeof window === 'undefined') return { ok: false, error: 'Browser environment is required.' };
  try {
    const response = await fetch('/api/sheets', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      return { ok: false, error: data?.error || `Google Sheets fetch failed: ${response.status}` };
    }
    const roasts: Roast[] = Array.isArray(data.roasts) ? data.roasts.map((item: unknown) => normalizeRoast(item as Partial<Roast>)).filter((roast: Roast) => roast.id) : [];
    return {
      ok: true,
      beans: Array.isArray(data.beans) ? data.beans.map((item: unknown) => normalizeBean(item as Partial<Bean>)).filter((bean: Bean) => bean.id) : [],
      roasts,
      steps: Array.isArray(data.steps) ? (data.steps as RoastStep[]) : [],
      tastings: Array.isArray(data.tastings)
        ? data.tastings.map((item: unknown) => normalizeTasting(item as Partial<Tasting>, roasts.find((roast: Roast) => roast.id === (item as Partial<Tasting>).roastId))).filter(isMeaningfulTasting)
        : [],
    };
  } catch (error) {
    return { ok: false, error: userFriendlySyncError(error) };
  }
}

function recalculateRoastStatuses(roasts: Roast[], tastings: Tasting[]): Roast[] {
  return roasts.map(roast => {
    const completedCount = tastings.filter(t => t.roastId === roast.id && t.status === 'completed').length;
    const status: RoastStatus = completedCount >= 3 ? 'completed' : completedCount > 0 ? 'roasted' : 'roasted';
    return roast.status === status ? roast : { ...roast, status };
  });
}

function scoreTasting(tasting: Tasting): number {
  const avgAcidity = (tasting.acidityIntensity + tasting.acidityQuality) / 2;
  return Math.round((
    tasting.fragrance + tasting.aroma + tasting.flavor + tasting.sweetness + avgAcidity +
    tasting.body + tasting.aftertaste + tasting.balance + tasting.cleanCup + tasting.overall
  ) * 10) / 10;
}

export const DBService = {
  getBeans(): Bean[] {
    const beans = getLocalData<Bean>(STORAGE_KEYS.BEANS, []).map(normalizeBean);
    saveLocalData(STORAGE_KEYS.BEANS, beans);
    return beans;
  },

  getBeanById(id: string): Bean | undefined {
    return this.getBeans().find(bean => bean.id === id);
  },

  saveBean(bean: Bean, sync = true): Bean {
    const normalized = normalizeBean({ ...bean, updatedAt: new Date().toISOString() });
    const beans = this.getBeans();
    const index = beans.findIndex(item => item.id === normalized.id);
    if (index >= 0) beans[index] = normalized;
    else beans.push(normalized);
    saveLocalData(STORAGE_KEYS.BEANS, beans);
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'upsertBean', bean: normalized });
    return normalized;
  },

  deleteBean(id: string, sync = true): void {
    saveLocalData(STORAGE_KEYS.BEANS, this.getBeans().filter(bean => bean.id !== id));
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'deleteBean', id });
  },

  saveBeanToCloud(bean: Bean): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'upsertBean', bean: normalizeBean(bean) });
  },

  deleteBeanFromCloud(id: string): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'deleteBean', id });
  },

  generateNextBeanId(): string {
    const max = Math.max(...this.getBeans().map(bean => Number.parseInt(bean.id.slice(1), 10) || 0), 0);
    return `B${(max + 1).toString().padStart(4, '0')}`;
  },

  getRoasts(): Roast[] {
    const roasts = getLocalData<Roast>(STORAGE_KEYS.ROASTS, []).map(normalizeRoast);
    const updated = recalculateRoastStatuses(roasts, this.getTastings());
    saveLocalData(STORAGE_KEYS.ROASTS, updated);
    return updated;
  },

  getRoastById(id: string): Roast | undefined {
    return this.getRoasts().find(roast => roast.id === id);
  },

  saveRoast(roast: Roast, steps: RoastStep[], sync = true): Roast {
    const roasts = this.getRoasts();
    const index = roasts.findIndex(item => item.id === roast.id);
    const timelineMilestones = getMilestoneTimesFromSteps(steps);
    const canonicalFirstCrack = timelineMilestones.firstCrackTime || roast.firstCrackTime;
    const canonicalSecondCrack = timelineMilestones.secondCrackTime || roast.secondCrackTime;
    const canonicalDrop = timelineMilestones.dropTime || roast.dropTime;
    const processed = normalizeRoast({
      ...roast,
      firstCrackTime: canonicalFirstCrack,
      secondCrackTime: canonicalSecondCrack,
      dropTime: canonicalDrop,
      developmentTime: calculateDevTime(canonicalFirstCrack, canonicalDrop),
      developmentRatio: calculateDevRatio(canonicalFirstCrack, canonicalDrop),
      lossRatio: calculateLossRatio(roast.greenWeight, roast.roastedWeight),
      updatedAt: new Date().toISOString(),
    });

    if (index >= 0) roasts[index] = processed;
    else roasts.push(processed);

    saveLocalData(STORAGE_KEYS.ROASTS, roasts);
    this.saveRoastSteps(processed.id, steps);
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'upsertRoast', roast: processed, steps: this.getAllRoastSteps() });
    return processed;
  },

  deleteRoast(id: string, sync = true): void {
    saveLocalData(STORAGE_KEYS.ROASTS, this.getRoasts().filter(item => item.id !== id));
    saveLocalData(STORAGE_KEYS.STEPS, this.getAllRoastSteps().filter(step => step.roastId !== id));
    saveLocalData(STORAGE_KEYS.TASTINGS, this.getTastings().filter(tasting => tasting.roastId !== id));
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'deleteRoast', id });
  },

  saveRoastToCloud(roast: Roast, steps: RoastStep[]): Promise<CloudSyncResult> {
    const normalized = normalizeRoast(roast);
    return postCloudSync({
      action: 'upsertRoast',
      roast: normalized,
      steps: steps.map((step, index) => normalizeRoastStep(step, normalized.id, index)),
    });
  },

  deleteRoastFromCloud(id: string): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'deleteRoast', id });
  },

  generateNextRoastId(): string {
    const max = Math.max(...this.getRoasts().map(roast => Number.parseInt(roast.id.slice(1), 10) || 0), 0);
    return `R${(max + 1).toString().padStart(4, '0')}`;
  },

  adjustBeanWeight(beanId: string, amount: number, sync = true): void {
    void beanId;
    void amount;
    void sync;
  },

  getAllRoastSteps(): RoastStep[] {
    const steps = getLocalData<RoastStep>(STORAGE_KEYS.STEPS, []).map((step, index) => normalizeRoastStep(step, step.roastId, index));
    saveLocalData(STORAGE_KEYS.STEPS, steps);
    return steps;
  },

  getRoastSteps(roastId: string): RoastStep[] {
    return this.getAllRoastSteps()
      .filter(step => step.roastId === roastId)
      .sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  },

  saveRoastSteps(roastId: string, steps: RoastStep[]): void {
    const allSteps = this.getAllRoastSteps().filter(step => step.roastId !== roastId);
    const updated = [
      ...allSteps,
      ...steps.map((step, index) => normalizeRoastStep({ ...step, id: step.id || `step_${roastId}_${Date.now()}_${index}`, roastId }, roastId, index)),
    ];
    saveLocalData(STORAGE_KEYS.STEPS, updated);
  },

  getTastings(): Tasting[] {
    const roasts = getLocalData<Roast>(STORAGE_KEYS.ROASTS, []).map(normalizeRoast);
    const tastings = getLocalData<Tasting>(STORAGE_KEYS.TASTINGS, [])
      .map(tasting => normalizeTasting(tasting, roasts.find(roast => roast.id === tasting.roastId)))
      .filter(isMeaningfulTasting)
      .sort((a, b) => a.tastingDate.localeCompare(b.tastingDate) || a.tastingIndex - b.tastingIndex);
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
    return tastings;
  },

  getTastingById(id: string): Tasting | undefined {
    return this.getTastings().find(tasting => tasting.id === id);
  },

  getTastingsForRoast(roastId: string): Tasting[] {
    return this.getTastings().filter(tasting => tasting.roastId === roastId);
  },

  generateNextTastingId(roastId: string): string {
    const next = this.getTastingsForRoast(roastId).length + 1;
    return `t_${roastId}_${Date.now()}_${next}`;
  },

  saveTasting(tasting: Tasting, sync = true): Tasting {
    const roast = this.getRoastById(tasting.roastId);
    const normalized = normalizeTasting({
      ...tasting,
      score: scoreTasting(tasting),
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }, roast);

    const tastings = this.getTastings();
    const index = tastings.findIndex(item => item.id === normalized.id);
    if (index >= 0) tastings[index] = normalized;
    else tastings.push(normalized);
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
    saveLocalData(STORAGE_KEYS.ROASTS, recalculateRoastStatuses(this.getRoasts(), tastings));
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'upsertTasting', tasting: normalized });
    return normalized;
  },

  saveTastingToCloud(tasting: Tasting): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'upsertTasting', tasting });
  },

  deleteTasting(id: string, sync = true): void {
    const next = this.getTastings().filter(tasting => tasting.id !== id);
    saveLocalData(STORAGE_KEYS.TASTINGS, next);
    saveLocalData(STORAGE_KEYS.ROASTS, recalculateRoastStatuses(this.getRoasts(), next));
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'deleteTasting', id });
  },

  deleteTastingFromCloud(id: string): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'deleteTasting', id });
  },

  getExternalCoffees(): ExternalCoffee[] {
    const coffees = getLocalData<ExternalCoffee>(STORAGE_KEYS.EXTERNAL_COFFEES, []).map(normalizeExternalCoffee);
    saveLocalData(STORAGE_KEYS.EXTERNAL_COFFEES, coffees);
    return coffees;
  },

  saveExternalCoffee(coffee: ExternalCoffee): ExternalCoffee {
    const normalized = normalizeExternalCoffee({ ...coffee, updatedAt: new Date().toISOString() });
    const coffees = this.getExternalCoffees();
    const index = coffees.findIndex(item => item.id === normalized.id);
    if (index >= 0) coffees[index] = normalized;
    else coffees.push(normalized);
    saveLocalData(STORAGE_KEYS.EXTERNAL_COFFEES, coffees);
    markLocalMutation();
    return normalized;
  },

  deleteExternalCoffee(id: string): void {
    saveLocalData(STORAGE_KEYS.EXTERNAL_COFFEES, this.getExternalCoffees().filter(item => item.id !== id));
    markLocalMutation();
  },

  async syncFromCloud(): Promise<CloudSyncResult> {
    const pending = getPendingSyncPayloads();
    if (pending.length > 0) {
      const retry = await this.retryPendingSync();
      if (!retry.ok) {
        return {
          ok: false,
          pending: true,
          error: retry.error || '未同期の変更があります。再送が成功するまでGoogle Sheetsの内容で上書きしません。',
        };
      }
    }

    const startedAt = Date.now();
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot.ok) return snapshot;
    if (!('beans' in snapshot) || !('roasts' in snapshot) || !('steps' in snapshot) || !('tastings' in snapshot)) {
      return { ok: false, error: 'Google Sheetsから不完全なデータが返りました。' };
    }
    if (getTimestamp(STORAGE_KEYS.LAST_MUTATION) > startedAt) {
      return { ok: false, pending: true, error: '同期中にローカル変更があったため、古い取得結果は破棄しました。' };
    }

    saveLocalData(STORAGE_KEYS.BEANS, snapshot.beans);
    saveLocalData(STORAGE_KEYS.ROASTS, recalculateRoastStatuses(snapshot.roasts, snapshot.tastings));
    saveLocalData(STORAGE_KEYS.STEPS, snapshot.steps);
    saveLocalData(STORAGE_KEYS.TASTINGS, snapshot.tastings);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
    return { ok: true };
  },

  syncCurrentLocalData(): Promise<CloudSyncResult> {
    return postCloudSync({
      beans: this.getBeans(),
      roasts: this.getRoasts(),
      steps: this.getAllRoastSteps(),
      tastings: this.getTastings(),
    });
  },

  getPendingSyncCount(): number {
    return getPendingSyncPayloads().length;
  },

  getLastSyncTime(): number {
    return getTimestamp(STORAGE_KEYS.LAST_SYNC);
  },

  async retryPendingSync(): Promise<CloudSyncResult> {
    const pending = getPendingSyncPayloads();
    if (pending.length === 0) return { ok: true };

    for (let index = 0; index < pending.length; index += 1) {
      const payload = pending[index];
      const result = await postCloudSync(payload, false);
      if (!result.ok) {
        savePendingSyncPayloads(pending.slice(index));
        return { ...result, pending: true };
      }
    }

    savePendingSyncPayloads([]);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
    return { ok: true };
  },

  exportData(): string {
    return JSON.stringify({
      beans: this.getBeans(),
      roasts: this.getRoasts(),
      steps: this.getAllRoastSteps(),
      tastings: this.getTastings(),
      externalCoffees: this.getExternalCoffees(),
      settings: this.getSettings(),
    }, null, 2);
  },

  importData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.beans)) saveLocalData(STORAGE_KEYS.BEANS, data.beans.map(normalizeBean));
      if (Array.isArray(data.roasts)) saveLocalData(STORAGE_KEYS.ROASTS, data.roasts.map(normalizeRoast));
      if (Array.isArray(data.steps)) saveLocalData(STORAGE_KEYS.STEPS, data.steps);
      if (Array.isArray(data.tastings)) saveLocalData(STORAGE_KEYS.TASTINGS, data.tastings.map((item: Partial<Tasting>) => normalizeTasting(item)).filter(isMeaningfulTasting));
      if (Array.isArray(data.externalCoffees)) saveLocalData(STORAGE_KEYS.EXTERNAL_COFFEES, data.externalCoffees.map(normalizeExternalCoffee));
      if (data.settings) this.saveSettings(data.settings);
      markLocalMutation();
      return true;
    } catch (error) {
      console.error('Import failed: ', error);
      return false;
    }
  },

  getSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}') };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  },

  resetLocalData(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  async resetCloudData(): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'resetAll' });
  },
};
