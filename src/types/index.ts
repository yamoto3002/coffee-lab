export interface Bean {
  id: string; // e.g. "B0001"
  name: string;
  country: string;
  region: string;
  farm: string;
  producer: string;
  altitude: number; // in meters
  variety: string;
  process: string; // e.g. "Washed", "Natural", "Honey"
  cropYear: string;
  purchaseShop: string;
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
  initialWeight: number; // reference grams
  currentWeight: number; // legacy/reference grams, no longer auto-adjusted by roasts
  weightLossPercentage: number; // expected roast loss percentage
  themeColor?: string;
  notes: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RoastStatus =
  | 'roasted'
  | 'waiting_day7'
  | 'waiting_day10'
  | 'waiting_day14'
  | 'completed';

export type FirstCrackStatus = 'recorded' | 'not_detected' | 'estimated' | 'unknown';

export interface Roast {
  id: string; // e.g. "R0001"
  beanId: string;
  roastDate: string; // YYYY-MM-DD
  greenWeight: number; // input weight in grams
  roastedWeight: number; // output or expected weight in grams
  yellowTime: string; // MM:SS
  firstCrackTime: string | null; // MM:SS
  firstCrackStatus?: FirstCrackStatus;
  dropTime: string; // MM:SS
  developmentTime: string | null; // MM:SS
  developmentRatio: number | null; // percentage (e.g. 15.5)
  lossRatio: number; // percentage (e.g. 14.2)
  status: RoastStatus;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RoastStep {
  id: string;
  roastId: string;
  time: string; // MM:SS
  heat: number; // 1-8
  air: number; // 1-8
  memo?: string;
}

export interface Tasting {
  id: string;
  roastId: string;
  tastingIndex: number;
  tastingDay: number;
  tastingDate: string; // YYYY-MM-DD
  dayAfterRoast: number;
  doseGrams: number;
  fragrance: number; // 0-10
  aroma: number; // 0-10
  flavor: number; // 0-10
  sweetness: number; // 0-10
  acidityIntensity: number; // 0-10
  acidityQuality: number; // 0-10
  body: number; // 0-10
  aftertaste: number; // 0-10
  balance: number; // 0-10
  cleanCup: number; // 0-10
  overall: number; // 0-10
  score: number; // total out of 100
  recommendationRating: number; // 1-5 stars
  flavors: string[];
  negatives: string[];
  improvements: string;
  impressionColor: string;
  notes: string;
  photos: string[];
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export interface ExternalCoffee {
  id: string;
  name: string;
  roaster: string;
  country: string;
  region: string;
  variety: string;
  process: string;
  roastLevel: string;
  purchaseDate: string;
  tastingDate: string;
  brewMethod: string;
  score: number;
  impressionColor: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export type DisplayMode = 'beginner' | 'detail' | 'pro';

export interface AppSettings {
  displayMode: DisplayMode;
  showBeanDetails: boolean;
  showCropYear: boolean;
  showPurchaseAge: boolean;
  showProcess: boolean;
  showStock: boolean;
  showAnalysisCards: boolean;
  showHomeSuggestions: boolean;
  showLiveRoastDetails: boolean;
}
