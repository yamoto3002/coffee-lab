import { AppSettings, Bean, Roast, RoastStatus, RoastStep, Tasting } from '../types';

export function timeToSeconds(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [mins, secs] = timeStr.split(':').map(Number);
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return 0;
  return mins * 60 + secs;
}

export function secondsToTime(secs: number): string {
  if (secs < 0 || !Number.isFinite(secs)) return '00:00';
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}

export function calculateDevTime(firstCrack: string, drop: string): string {
  const fcSecs = timeToSeconds(firstCrack);
  const dropSecs = timeToSeconds(drop);
  if (fcSecs <= 0 || dropSecs <= fcSecs) return '00:00';
  return secondsToTime(dropSecs - fcSecs);
}

export function calculateDevRatio(firstCrack: string, drop: string): number {
  const fcSecs = timeToSeconds(firstCrack);
  const dropSecs = timeToSeconds(drop);
  if (fcSecs <= 0 || dropSecs <= fcSecs) return 0;
  return Math.round(((dropSecs - fcSecs) / dropSecs) * 1000) / 10;
}

export function calculateLossRatio(green: number, roasted: number): number {
  if (green <= 0 || roasted <= 0 || green < roasted) return 0;
  return Math.round(((green - roasted) / green) * 1000) / 10;
}

export function getAgingDays(dateStr: string): number {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - date.getTime()) / 86400000);
}

export function getYearsSince(year: string): number | null {
  const value = Number.parseInt(year, 10);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, new Date().getFullYear() - value);
}

const STORAGE_KEYS = {
  BEANS: 'coffeelab_beans',
  ROASTS: 'coffeelab_roasts',
  STEPS: 'coffeelab_steps',
  TASTINGS: 'coffeelab_tastings',
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
  action?: 'upsertBean' | 'deleteBean' | 'upsertRoast' | 'deleteRoast' | 'resetAll';
  bean?: Bean;
  roast?: Roast;
  id?: string;
  beans?: Bean[];
  roasts?: Roast[];
  steps?: RoastStep[];
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
    purchaseDate: String(bean.purchaseDate || ''),
    purchasePrice: toNumber(bean.purchasePrice),
    initialWeight,
    currentWeight,
    weightLossPercentage: toNumber(bean.weightLossPercentage, 15),
    notes: String(bean.notes || ''),
    photoUrl: bean.photoUrl || '',
    createdAt: String(bean.createdAt || new Date().toISOString()),
    updatedAt: bean.updatedAt,
  };
}

function normalizeRoast(roast: Partial<Roast>): Roast {
  const greenWeight = toNumber(roast.greenWeight, toNumber((roast as { inputWeight?: unknown }).inputWeight));
  const roastedWeight = toNumber(roast.roastedWeight, toNumber((roast as { expectedOutputWeight?: unknown }).expectedOutputWeight));
  const firstCrackTime = String(roast.firstCrackTime || '');
  const dropTime = String(roast.dropTime || '');
  return {
    id: String(roast.id || ''),
    beanId: String(roast.beanId || ''),
    roastDate: String(roast.roastDate || ''),
    greenWeight,
    roastedWeight,
    yellowTime: String(roast.yellowTime || ''),
    firstCrackTime,
    dropTime,
    developmentTime: String(roast.developmentTime || calculateDevTime(firstCrackTime, dropTime)),
    developmentRatio: toNumber(roast.developmentRatio, calculateDevRatio(firstCrackTime, dropTime)),
    lossRatio: toNumber(roast.lossRatio, calculateLossRatio(greenWeight, roastedWeight)),
    status: (roast.status || 'waiting_day7') as RoastStatus,
    notes: String(roast.notes || ''),
    createdAt: String(roast.createdAt || new Date().toISOString()),
  };
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getPendingSyncPayloads(): CloudSyncPayload[] {
  return getLocalData<CloudSyncPayload>(STORAGE_KEYS.PENDING_SYNC, []);
}

function savePendingSyncPayloads(payloads: CloudSyncPayload[]): void {
  saveLocalData(STORAGE_KEYS.PENDING_SYNC, payloads);
}

function enqueuePendingSync(payload: CloudSyncPayload): void {
  const pending = getPendingSyncPayloads();
  const deduped = pending.filter(item => {
    if (payload.action === 'upsertBean' && item.action === 'upsertBean') return item.bean?.id !== payload.bean?.id;
    if (payload.action === 'deleteBean' && item.action === 'deleteBean') return item.id !== payload.id;
    if (payload.action === 'upsertRoast' && item.action === 'upsertRoast') return item.roast?.id !== payload.roast?.id;
    if (payload.action === 'deleteRoast' && item.action === 'deleteRoast') return item.id !== payload.id;
    if (payload.action === 'resetAll' && item.action === 'resetAll') return false;
    return true;
  });
  savePendingSyncPayloads([...deduped, payload]);
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
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Sheets sync failed.';
    console.warn('Background Google Sheets sync failed.', error);
    if (queueOnFail) enqueuePendingSync(payload);
    return { ok: false, error: message, pending: queueOnFail };
  }
}

async function fetchCloudSnapshot(): Promise<({ beans: Bean[]; roasts: Roast[]; steps: RoastStep[] } & CloudSyncResult) | CloudSyncResult> {
  if (typeof window === 'undefined') return { ok: false, error: 'Browser environment is required.' };
  try {
    const response = await fetch('/api/sheets', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      return { ok: false, error: data?.error || `Google Sheets fetch failed: ${response.status}` };
    }
    return {
      ok: true,
      beans: Array.isArray(data.beans) ? data.beans.map((item: unknown) => normalizeBean(item as Partial<Bean>)).filter((bean: Bean) => bean.id) : [],
      roasts: Array.isArray(data.roasts) ? data.roasts.map((item: unknown) => normalizeRoast(item as Partial<Roast>)).filter((roast: Roast) => roast.id) : [],
      steps: Array.isArray(data.steps) ? (data.steps as RoastStep[]) : [],
    };
  } catch (error) {
    console.warn('Google Sheets snapshot fetch failed.', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Google Sheets snapshot fetch failed.' };
  }
}

function recalculateRoastStatuses(roasts: Roast[], tastings: Tasting[]): Roast[] {
  return roasts.map(roast => {
    const completed = tastings.filter(t => t.roastId === roast.id && t.status === 'completed');
    const hasD7 = completed.some(t => t.tastingDay === 7);
    const hasD10 = completed.some(t => t.tastingDay === 10);
    const hasD14 = completed.some(t => t.tastingDay === 14);
    const status: RoastStatus = hasD14 ? 'completed' : hasD10 ? 'waiting_day14' : hasD7 ? 'waiting_day10' : 'waiting_day7';
    return roast.status === status ? roast : { ...roast, status };
  });
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
    const processed = normalizeRoast({
      ...roast,
      developmentTime: calculateDevTime(roast.firstCrackTime, roast.dropTime),
      developmentRatio: calculateDevRatio(roast.firstCrackTime, roast.dropTime),
      lossRatio: calculateLossRatio(roast.greenWeight, roast.roastedWeight),
    });

    if (index >= 0) {
      const oldRoast = roasts[index];
      if (oldRoast.beanId === processed.beanId) {
        const weightDiff = oldRoast.greenWeight - processed.greenWeight;
        if (weightDiff !== 0) this.adjustBeanWeight(processed.beanId, weightDiff, sync);
      } else {
        this.adjustBeanWeight(oldRoast.beanId, oldRoast.greenWeight, sync);
        this.adjustBeanWeight(processed.beanId, -processed.greenWeight, sync);
      }
      roasts[index] = processed;
    } else {
      this.adjustBeanWeight(processed.beanId, -processed.greenWeight, sync);
      roasts.push(processed);
      this.generatePendingTastingsForRoast(processed.id, processed.roastDate);
    }

    saveLocalData(STORAGE_KEYS.ROASTS, roasts);
    this.saveRoastSteps(processed.id, steps);
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'upsertRoast', roast: processed, steps: this.getAllRoastSteps() });
    return processed;
  },

  deleteRoast(id: string, sync = true): void {
    const roast = this.getRoastById(id);
    if (roast) this.adjustBeanWeight(roast.beanId, roast.greenWeight, sync);
    saveLocalData(STORAGE_KEYS.ROASTS, this.getRoasts().filter(item => item.id !== id));
    saveLocalData(STORAGE_KEYS.STEPS, this.getAllRoastSteps().filter(step => step.roastId !== id));
    saveLocalData(STORAGE_KEYS.TASTINGS, this.getTastings().filter(tasting => tasting.roastId !== id));
    markLocalMutation();
    if (sync) void postCloudSync({ action: 'deleteRoast', id });
  },

  saveRoastToCloud(roast: Roast, steps: RoastStep[]): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'upsertRoast', roast: normalizeRoast(roast), steps });
  },

  deleteRoastFromCloud(id: string): Promise<CloudSyncResult> {
    return postCloudSync({ action: 'deleteRoast', id });
  },

  generateNextRoastId(): string {
    const max = Math.max(...this.getRoasts().map(roast => Number.parseInt(roast.id.slice(1), 10) || 0), 0);
    return `R${(max + 1).toString().padStart(4, '0')}`;
  },

  adjustBeanWeight(beanId: string, amount: number, sync = true): void {
    const bean = this.getBeanById(beanId);
    if (!bean) return;
    this.saveBean({ ...bean, currentWeight: Math.max(0, Math.round((bean.currentWeight + amount) * 10) / 10) }, sync);
  },

  getAllRoastSteps(): RoastStep[] {
    return getLocalData<RoastStep>(STORAGE_KEYS.STEPS, []);
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
      ...steps.map((step, index) => ({ ...step, id: step.id || `step_${roastId}_${Date.now()}_${index}`, roastId })),
    ];
    saveLocalData(STORAGE_KEYS.STEPS, updated);
  },

  getTastings(): Tasting[] {
    return getLocalData<Tasting>(STORAGE_KEYS.TASTINGS, []);
  },

  getTastingById(id: string): Tasting | undefined {
    return this.getTastings().find(tasting => tasting.id === id);
  },

  getTastingsForRoast(roastId: string): Tasting[] {
    return this.getTastings().filter(tasting => tasting.roastId === roastId);
  },

  saveTasting(tasting: Tasting): Tasting {
    const avgAcidity = (tasting.acidityIntensity + tasting.acidityQuality) / 2;
    const processed: Tasting = {
      ...tasting,
      score: Math.round((
        tasting.fragrance + tasting.aroma + tasting.flavor + tasting.sweetness + avgAcidity +
        tasting.body + tasting.aftertaste + tasting.balance + tasting.cleanCup + tasting.overall
      ) * 10) / 10,
      status: 'completed',
      tastingDate: tasting.tastingDate || new Date().toISOString().split('T')[0],
    };

    const tastings = this.getTastings();
    const index = tastings.findIndex(item => item.id === processed.id);
    if (index >= 0) tastings[index] = processed;
    else tastings.push(processed);
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
    saveLocalData(STORAGE_KEYS.ROASTS, recalculateRoastStatuses(this.getRoasts(), tastings));
    markLocalMutation();
    return processed;
  },

  generatePendingTastingsForRoast(roastId: string, roastDateStr: string): void {
    const tastings = this.getTastings();
    ([7, 10, 14] as const).forEach(day => {
      if (tastings.some(tasting => tasting.roastId === roastId && tasting.tastingDay === day)) return;
      const roastDate = new Date(roastDateStr);
      roastDate.setDate(roastDate.getDate() + day);
      tastings.push({
        id: `t_${roastId}_d${day}`,
        roastId,
        tastingDay: day,
        tastingDate: roastDate.toISOString().split('T')[0],
        fragrance: 0,
        aroma: 0,
        flavor: 0,
        sweetness: 0,
        acidityIntensity: 0,
        acidityQuality: 0,
        body: 0,
        aftertaste: 0,
        balance: 0,
        cleanCup: 0,
        overall: 0,
        score: 0,
        recommendationRating: 0,
        flavors: [],
        negatives: [],
        improvements: '',
        photos: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    });
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
  },

  async syncFromCloud(): Promise<CloudSyncResult> {
    const pending = getPendingSyncPayloads();
    if (pending.length > 0) {
      return {
        ok: false,
        pending: true,
        error: '未同期の変更があります。再送が成功するまでGoogle Sheetsの内容で上書きしません。',
      };
    }

    const startedAt = Date.now();
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot.ok) return snapshot;
    if (!('beans' in snapshot) || !('roasts' in snapshot) || !('steps' in snapshot)) {
      return { ok: false, error: 'Google Sheetsから不完全なデータが返りました。' };
    }
    if (getTimestamp(STORAGE_KEYS.LAST_MUTATION) > startedAt) {
      return { ok: false, pending: true, error: '同期中にローカル変更があったため、古い取得結果は破棄しました。' };
    }

    saveLocalData(STORAGE_KEYS.BEANS, snapshot.beans);
    saveLocalData(STORAGE_KEYS.ROASTS, snapshot.roasts);
    saveLocalData(STORAGE_KEYS.STEPS, snapshot.steps);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
    return { ok: true };
  },

  syncCurrentLocalData(): Promise<CloudSyncResult> {
    return postCloudSync({
      beans: this.getBeans(),
      roasts: this.getRoasts(),
      steps: this.getAllRoastSteps(),
    });
  },

  getPendingSyncCount(): number {
    return getPendingSyncPayloads().length;
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
      settings: this.getSettings(),
    }, null, 2);
  },

  importData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.beans)) saveLocalData(STORAGE_KEYS.BEANS, data.beans.map(normalizeBean));
      if (Array.isArray(data.roasts)) saveLocalData(STORAGE_KEYS.ROASTS, data.roasts.map(normalizeRoast));
      if (Array.isArray(data.steps)) saveLocalData(STORAGE_KEYS.STEPS, data.steps);
      if (Array.isArray(data.tastings)) saveLocalData(STORAGE_KEYS.TASTINGS, data.tastings);
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
