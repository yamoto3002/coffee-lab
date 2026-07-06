import { Bean, Roast, RoastStep, Tasting, RoastStatus } from '../types';

// --- Time Helper Functions ---

export function timeToSeconds(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [mins, secs] = timeStr.split(':').map(Number);
  if (isNaN(mins) || isNaN(secs)) return 0;
  return mins * 60 + secs;
}

export function secondsToTime(secs: number): string {
  if (secs < 0 || isNaN(secs)) return '00:00';
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
  const devSecs = dropSecs - fcSecs;
  return Math.round((devSecs / dropSecs) * 1000) / 10; // e.g. 15.5
}

export function calculateLossRatio(green: number, roasted: number): number {
  if (green <= 0 || roasted <= 0 || green < roasted) return 0;
  return Math.round(((green - roasted) / green) * 1000) / 10; // e.g. 14.2
}

export function getAgingDays(roastDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const roastDate = new Date(roastDateStr);
  roastDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - roastDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// --- Seed Data ---

const SEED_BEANS: Bean[] = [
  {
    id: 'B0001',
    name: 'Sigri Estate Peaberry',
    country: 'Papua New Guinea',
    region: 'Wahgi Valley',
    farm: 'Sigri Estate',
    producer: 'Sigri Group',
    altitude: 1600,
    variety: 'Typica',
    process: 'Washed',
    cropYear: '2025',
    purchaseShop: 'Green Coffee Traders',
    purchaseDate: '2026-05-10',
    purchasePrice: 2800,
    initialWeight: 1000,
    currentWeight: 600,
    weightLossPercentage: 15,
    recommendedRoastDegree: 'Medium-Light',
    notes: 'Very clean washed peaberry with citrus notes, black tea finish and medium body.',
    photoUrl: '',
    createdAt: '2026-05-10T10:00:00Z'
  },
  {
    id: 'B0002',
    name: 'Chelbesa G1',
    country: 'Ethiopia',
    region: 'Yirgacheffe',
    farm: 'Chelbesa Washing Station',
    producer: 'Local Smallholders',
    altitude: 2100,
    variety: 'Kurume / Dega',
    process: 'Natural',
    cropYear: '2025',
    purchaseShop: 'TYPICA',
    purchaseDate: '2026-06-01',
    purchasePrice: 3800,
    initialWeight: 500,
    currentWeight: 350,
    weightLossPercentage: 14.5,
    recommendedRoastDegree: 'Light',
    notes: 'Intense jasmine aroma, blueberry flavor, and peach-like sweetness. High acidity.',
    photoUrl: '',
    createdAt: '2026-06-01T12:00:00Z'
  }
];

// Helper to get formatted dates relative to today
function getRelativeDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const SEED_ROASTS: Roast[] = [
  {
    id: 'R0001',
    beanId: 'B0001',
    roastDate: getRelativeDateStr(8), // 8 days ago (Day 7 tasting was yesterday)
    greenWeight: 200,
    roastedWeight: 171.6,
    yellowTime: '04:30',
    firstCrackTime: '08:15',
    dropTime: '09:48',
    developmentTime: '01:33',
    developmentRatio: 15.8,
    lossRatio: 14.2,
    status: 'waiting_day10', // completed Day 7, waiting for Day 10
    notes: 'Targeting a balanced profile. Yellow phase hit at 4:30. Crack was gentle. Dropped 1min 33s after crack.',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 'R0002',
    beanId: 'B0001',
    roastDate: getRelativeDateStr(3), // 3 days ago, waiting for Day 7
    greenWeight: 200,
    roastedWeight: 172.4,
    yellowTime: '04:20',
    firstCrackTime: '08:00',
    dropTime: '09:30',
    developmentTime: '01:30',
    developmentRatio: 15.8,
    lossRatio: 13.8,
    status: 'waiting_day7',
    notes: 'Slightly shorter drying phase. Smells very sweet.',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'R0003',
    beanId: 'B0002',
    roastDate: getRelativeDateStr(12), // 12 days ago, Day 7 and Day 10 completed, waiting for Day 14
    greenWeight: 150,
    roastedWeight: 128.5,
    yellowTime: '04:10',
    firstCrackTime: '07:45',
    dropTime: '09:00',
    developmentTime: '01:15',
    developmentRatio: 13.9,
    lossRatio: 14.3,
    status: 'waiting_day14',
    notes: 'Very fast light roast for Yirgacheffe to preserve acidity and floral aromas.',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
  }
];

const SEED_ROAST_STEPS: RoastStep[] = [
  // R0001 steps
  { id: 's1', roastId: 'R0001', time: '00:00', heat: 7, air: 2, memo: 'Charge' },
  { id: 's2', roastId: 'R0001', time: '02:00', heat: 8, air: 2, memo: 'Increase heat' },
  { id: 's3', roastId: 'R0001', time: '04:30', heat: 6, air: 3, memo: 'Yellowing' },
  { id: 's4', roastId: 'R0001', time: '06:00', heat: 5, air: 4, memo: 'Decrease heat' },
  { id: 's5', roastId: 'R0001', time: '08:15', heat: 4, air: 5, memo: 'First Crack' },
  { id: 's6', roastId: 'R0001', time: '09:00', heat: 3, air: 6, memo: 'Lower heat' },
  { id: 's7', roastId: 'R0001', time: '09:48', heat: 1, air: 8, memo: 'Drop' },

  // R0002 steps
  { id: 's8', roastId: 'R0002', time: '00:00', heat: 8, air: 2, memo: 'High heat charge' },
  { id: 's9', roastId: 'R0002', time: '04:20', heat: 6, air: 3, memo: 'Yellow' },
  { id: 's10', roastId: 'R0002', time: '07:00', heat: 5, air: 4 },
  { id: 's11', roastId: 'R0002', time: '08:00', heat: 3, air: 6, memo: '1st Crack' },
  { id: 's12', roastId: 'R0002', time: '09:30', heat: 1, air: 8, memo: 'Drop' },

  // R0003 steps
  { id: 's13', roastId: 'R0003', time: '00:00', heat: 8, air: 3, memo: 'Ethiopia light profile' },
  { id: 's14', roastId: 'R0003', time: '04:10', heat: 6, air: 4, memo: 'Yellow' },
  { id: 's15', roastId: 'R0003', time: '06:30', heat: 5, air: 5 },
  { id: 's16', roastId: 'R0003', time: '07:45', heat: 3, air: 7, memo: '1st Crack' },
  { id: 's17', roastId: 'R0003', time: '09:00', heat: 1, air: 8, memo: 'Drop' }
];

const SEED_TASTINGS: Tasting[] = [
  // R0001 Tastings: Day 7 is completed
  {
    id: 't1',
    roastId: 'R0001',
    tastingDay: 7,
    tastingDate: getRelativeDateStr(1), // Completed yesterday
    fragrance: 8.0,
    aroma: 8.2,
    flavor: 8.0,
    sweetness: 8.5,
    acidityIntensity: 7.5,
    acidityQuality: 8.0,
    body: 7.5,
    aftertaste: 7.8,
    balance: 8.0,
    cleanCup: 8.5,
    overall: 8.0,
    score: 84.5,
    recommendationRating: 4,
    flavors: ['Fruit', 'Citrus', 'Orange', 'Chocolate', 'Brown Sugar'],
    negatives: [],
    improvements: 'Body is a bit light. Next time increase heat during middle phase slightly or extend development time by 10s.',
    photos: [],
    status: 'completed',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  // R0003 Tastings: Day 7 and Day 10 completed
  {
    id: 't2',
    roastId: 'R0003',
    tastingDay: 7,
    tastingDate: getRelativeDateStr(5),
    fragrance: 8.5,
    aroma: 8.8,
    flavor: 8.5,
    sweetness: 8.0,
    acidityIntensity: 8.5,
    acidityQuality: 8.0,
    body: 7.0,
    aftertaste: 8.0,
    balance: 8.2,
    cleanCup: 9.0,
    overall: 8.5,
    score: 87.0,
    recommendationRating: 4,
    flavors: ['Fruit', 'Berry', 'Blueberry', 'Floral', 'Jasmine', 'Citrus'],
    negatives: [],
    improvements: 'Very bright and complex. Day 7 acid is intense. Let\'s see how it mellows by Day 10.',
    photos: [],
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 't3',
    roastId: 'R0003',
    tastingDay: 10,
    tastingDate: getRelativeDateStr(2),
    fragrance: 8.8,
    aroma: 9.0,
    flavor: 8.8,
    sweetness: 8.5,
    acidityIntensity: 8.0,
    acidityQuality: 8.8,
    body: 7.2,
    aftertaste: 8.5,
    balance: 8.8,
    cleanCup: 9.0,
    overall: 9.0,
    score: 89.6, // overall high score
    recommendationRating: 5,
    flavors: ['Fruit', 'Berry', 'Blueberry', 'Floral', 'Jasmine', 'Honey', 'Peach'],
    negatives: [],
    improvements: 'Exceptional balance on Day 10. Blueberry note is very prominent. Drop time was perfect.',
    photos: [],
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

// --- Storage API ---

const STORAGE_KEYS = {
  BEANS: 'coffeelab_beans',
  ROASTS: 'coffeelab_roasts',
  STEPS: 'coffeelab_steps',
  TASTINGS: 'coffeelab_tastings'
};

function getLocalData<T>(key: string, seed: T[]): T[] {
  if (typeof window === 'undefined') return seed;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse storage key: ' + key, e);
    return seed;
  }
}

function saveLocalData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function normalizeBean(bean: Bean): Bean {
  return {
    ...bean,
    weightLossPercentage: typeof bean.weightLossPercentage === 'number' ? bean.weightLossPercentage : 15,
  };
}

function persistCloudSync(payload: { beans?: Bean[]; roasts?: Roast[]; steps?: RoastStep[]; delete?: { type: 'bean' | 'roast'; id: string } }): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify(payload);
  const url = '/api/sheets';

  try {
    if ('sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch (error) {
    console.warn('sendBeacon sync failed, falling back to fetch.', error);
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch((error) => {
    console.warn('Background Google Sheets sync failed.', error);
  });
}

async function fetchCloudSnapshot(): Promise<{ beans: Bean[]; roasts: Roast[]; steps: RoastStep[] } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/api/sheets', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      beans: Array.isArray(data.beans) ? data.beans.map(normalizeBean) : [],
      roasts: Array.isArray(data.roasts) ? data.roasts : [],
      steps: Array.isArray(data.steps) ? data.steps : [],
    };
  } catch (error) {
    console.warn('Google Sheets snapshot fetch failed.', error);
    return null;
  }
}

// --- DB Service Methods ---

export const DBService = {
  // Beans CRUD
  getBeans(): Bean[] {
    const beans = getLocalData<Bean>(STORAGE_KEYS.BEANS, SEED_BEANS).map(normalizeBean);
    saveLocalData(STORAGE_KEYS.BEANS, beans);
    return beans;
  },

  getBeanById(id: string): Bean | undefined {
    return this.getBeans().find(b => b.id === id);
  },

  saveBean(bean: Bean): Bean {
    const normalizedBean = normalizeBean(bean);
    const beans = this.getBeans();
    const index = beans.findIndex(b => b.id === normalizedBean.id);
    if (index >= 0) {
      beans[index] = { ...normalizedBean };
    } else {
      beans.push({ ...normalizedBean });
    }
    saveLocalData(STORAGE_KEYS.BEANS, beans);
    persistCloudSync({ beans });
    return normalizedBean;
  },

  deleteBean(id: string): void {
    const beans = this.getBeans().filter(b => b.id !== id);
    saveLocalData(STORAGE_KEYS.BEANS, beans);
    persistCloudSync({ beans, delete: { type: 'bean', id } });
    // Cascade delete can be done, but we'll preserve roasts for history or let user know
  },

  generateNextBeanId(): string {
    const beans = this.getBeans();
    if (beans.length === 0) return 'B0001';
    const numericIds = beans.map(b => {
      const num = parseInt(b.id.substring(1));
      return isNaN(num) ? 0 : num;
    });
    const max = Math.max(...numericIds, 0);
    return `B${(max + 1).toString().padStart(4, '0')}`;
  },

  // Roasts CRUD
  getRoasts(): Roast[] {
    const roasts = getLocalData<Roast>(STORAGE_KEYS.ROASTS, SEED_ROASTS);
    // Dynamically update status based on tastings
    const tastings = this.getTastings();
    let updated = false;

    const updatedRoasts = roasts.map(roast => {
      const roastTastings = tastings.filter(t => t.roastId === roast.id && t.status === 'completed');
      let newStatus: RoastStatus = 'waiting_day7';
      const hasD7 = roastTastings.some(t => t.tastingDay === 7);
      const hasD10 = roastTastings.some(t => t.tastingDay === 10);
      const hasD14 = roastTastings.some(t => t.tastingDay === 14);

      if (hasD14) {
        newStatus = 'completed';
      } else if (hasD10) {
        newStatus = 'waiting_day14';
      } else if (hasD7) {
        newStatus = 'waiting_day10';
      } else {
        newStatus = 'waiting_day7';
      }

      if (roast.status !== newStatus) {
        updated = true;
        return { ...roast, status: newStatus };
      }
      return roast;
    });

    if (updated) {
      saveLocalData(STORAGE_KEYS.ROASTS, updatedRoasts);
      return updatedRoasts;
    }
    return roasts;
  },

  getRoastById(id: string): Roast | undefined {
    return this.getRoasts().find(r => r.id === id);
  },

  saveRoast(roast: Roast, steps: RoastStep[]): Roast {
    const roasts = this.getRoasts();
    const index = roasts.findIndex(r => r.id === roast.id);
    
    // Auto-calculations
    const devTime = calculateDevTime(roast.firstCrackTime, roast.dropTime);
    const devRatio = calculateDevRatio(roast.firstCrackTime, roast.dropTime);
    const lossRatio = calculateLossRatio(roast.greenWeight, roast.roastedWeight);
    
    const processedRoast: Roast = {
      ...roast,
      developmentTime: devTime,
      developmentRatio: devRatio,
      lossRatio: lossRatio
    };

    if (index >= 0) {
      // Adjust bean weight if green weight changed
      const oldRoast = roasts[index];
      const weightDiff = oldRoast.greenWeight - roast.greenWeight; // if green weight decreased, we give back stock. If increased, we deduct more.
      if (weightDiff !== 0) {
        this.adjustBeanWeight(roast.beanId, weightDiff);
      }
      roasts[index] = processedRoast;
    } else {
      // Deduct bean weight on new roast
      this.adjustBeanWeight(roast.beanId, -roast.greenWeight);
      roasts.push(processedRoast);

      // Proactively create pending tastings for Day 7, Day 10, Day 14
      this.generatePendingTastingsForRoast(roast.id, roast.roastDate);
    }
    
    saveLocalData(STORAGE_KEYS.ROASTS, roasts);

    // Save Roast Steps
    this.saveRoastSteps(roast.id, steps);
    persistCloudSync({
      beans: this.getBeans(),
      roasts,
      steps: this.getAllRoastSteps(),
    });

    return processedRoast;
  },

  deleteRoast(id: string): void {
    // Return green weight to bean first
    const roast = this.getRoastById(id);
    if (roast) {
      this.adjustBeanWeight(roast.beanId, roast.greenWeight);
    }

    const roasts = this.getRoasts().filter(r => r.id !== id);
    saveLocalData(STORAGE_KEYS.ROASTS, roasts);

    // Delete steps
    const steps = this.getAllRoastSteps().filter(s => s.roastId !== id);
    saveLocalData(STORAGE_KEYS.STEPS, steps);

    // Delete tastings
    const tastings = this.getTastings().filter(t => t.roastId !== id);
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
    persistCloudSync({
      beans: this.getBeans(),
      roasts,
      steps,
      delete: { type: 'roast', id },
    });
  },

  generateNextRoastId(): string {
    const roasts = this.getRoasts();
    if (roasts.length === 0) return 'R0001';
    const numericIds = roasts.map(r => {
      const num = parseInt(r.id.substring(1));
      return isNaN(num) ? 0 : num;
    });
    const max = Math.max(...numericIds, 0);
    return `R${(max + 1).toString().padStart(4, '0')}`;
  },

  adjustBeanWeight(beanId: string, amount: number): void {
    const bean = this.getBeanById(beanId);
    if (bean) {
      bean.currentWeight = Math.max(0, bean.currentWeight + amount);
      this.saveBean(bean);
    }
  },

  // Roast Steps
  getAllRoastSteps(): RoastStep[] {
    return getLocalData<RoastStep>(STORAGE_KEYS.STEPS, SEED_ROAST_STEPS);
  },

  getRoastSteps(roastId: string): RoastStep[] {
    return this.getAllRoastSteps()
      .filter(s => s.roastId === roastId)
      .sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  },

  saveRoastSteps(roastId: string, steps: RoastStep[]): void {
    const allSteps = this.getAllRoastSteps().filter(s => s.roastId !== roastId);
    // Assign proper IDs to new steps and add them
    const updatedSteps = [
      ...allSteps,
      ...steps.map((s, idx) => ({
        ...s,
        id: s.id || `step_${roastId}_${Date.now()}_${idx}`,
        roastId
      }))
    ];
    saveLocalData(STORAGE_KEYS.STEPS, updatedSteps);
  },

  // Tastings CRUD
  getTastings(): Tasting[] {
    return getLocalData<Tasting>(STORAGE_KEYS.TASTINGS, SEED_TASTINGS);
  },

  getTastingById(id: string): Tasting | undefined {
    return this.getTastings().find(t => t.id === id);
  },

  getTastingsForRoast(roastId: string): Tasting[] {
    return this.getTastings().filter(t => t.roastId === roastId);
  },

  saveTasting(tasting: Tasting): Tasting {
    const tastings = this.getTastings();
    const index = tastings.findIndex(t => t.id === tasting.id);
    
    // Calculate total score based on coffee tasting parameters
    const params = [
      tasting.fragrance,
      tasting.aroma,
      tasting.flavor,
      tasting.sweetness,
      tasting.acidityIntensity,
      tasting.acidityQuality,
      tasting.body,
      tasting.aftertaste,
      tasting.balance,
      tasting.cleanCup,
      tasting.overall
    ];
    // Q-grader standard is sum of 10 categories. But we have 11 items because acidity is split.
    // Let's compute average of acidity quality & intensity to keep 10 dimensions, or simply average all and map to 100 points scale.
    // Summing them: fragrance (10) + aroma (10) + flavor (10) + sweetness (10) + body (10) + aftertaste (10) + balance (10) + cleanCup (10) + overall (10) + average(acidityIntensity, acidityQuality) (10)
    // Total out of 100. Let's do that! That's exactly Q-grader standard where acidity is a single 10pts field.
    const avgAcidity = (tasting.acidityIntensity + tasting.acidityQuality) / 2;
    const finalScore = 
      tasting.fragrance + 
      tasting.aroma + 
      tasting.flavor + 
      tasting.sweetness + 
      avgAcidity + 
      tasting.body + 
      tasting.aftertaste + 
      tasting.balance + 
      tasting.cleanCup + 
      tasting.overall;

    const processedTasting: Tasting = {
      ...tasting,
      score: Math.round(finalScore * 10) / 10,
      status: 'completed',
      tastingDate: tasting.tastingDate || new Date().toISOString().split('T')[0]
    };

    if (index >= 0) {
      tastings[index] = processedTasting;
    } else {
      tastings.push(processedTasting);
    }
    
    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);

    // Trigger roast status recalculation
    this.getRoasts(); 

    return processedTasting;
  },

  generatePendingTastingsForRoast(roastId: string, roastDateStr: string): void {
    const tastings = this.getTastings();
    const days: (7 | 10 | 14)[] = [7, 10, 14];
    
    days.forEach(day => {
      // Calculate target date
      const roastDate = new Date(roastDateStr);
      roastDate.setDate(roastDate.getDate() + day);
      const targetDateStr = roastDate.toISOString().split('T')[0];

      const pendingTasting: Tasting = {
        id: `t_${roastId}_d${day}`,
        roastId,
        tastingDay: day,
        tastingDate: targetDateStr,
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
        createdAt: new Date().toISOString()
      };

      // Ensure no duplicate pending tasting
      const exists = tastings.some(t => t.roastId === roastId && t.tastingDay === day);
      if (!exists) {
        tastings.push(pendingTasting);
      }
    });

    saveLocalData(STORAGE_KEYS.TASTINGS, tastings);
  },

  async syncFromCloud(): Promise<boolean> {
    const snapshot = await fetchCloudSnapshot();
    if (!snapshot) return false;
    saveLocalData(STORAGE_KEYS.BEANS, snapshot.beans);
    saveLocalData(STORAGE_KEYS.ROASTS, snapshot.roasts);
    saveLocalData(STORAGE_KEYS.STEPS, snapshot.steps);
    return true;
  },

  syncCurrentLocalData(): void {
    persistCloudSync({
      beans: this.getBeans(),
      roasts: this.getRoasts(),
      steps: this.getAllRoastSteps(),
    });
  },

  // Export / Import
  exportData(): string {
    const data = {
      beans: this.getBeans(),
      roasts: this.getRoasts(),
      steps: this.getAllRoastSteps(),
      tastings: this.getTastings()
    };
    return JSON.stringify(data, null, 2);
  },

  importData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.beans && Array.isArray(data.beans)) {
        saveLocalData(STORAGE_KEYS.BEANS, data.beans);
      }
      if (data.roasts && Array.isArray(data.roasts)) {
        saveLocalData(STORAGE_KEYS.ROASTS, data.roasts);
      }
      if (data.steps && Array.isArray(data.steps)) {
        saveLocalData(STORAGE_KEYS.STEPS, data.steps);
      }
      if (data.tastings && Array.isArray(data.tastings)) {
        saveLocalData(STORAGE_KEYS.TASTINGS, data.tastings);
      }
      return true;
    } catch (e) {
      console.error('Import failed: ', e);
      return false;
    }
  }
};

