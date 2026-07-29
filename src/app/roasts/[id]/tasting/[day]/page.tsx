'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Minus, Plus, Save, Star, Trash2 } from 'lucide-react';
import FlavorWheel from '@/components/FlavorWheel';
import SyncStatus from '@/components/SyncStatus';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DBService } from '@/lib/db';
import { diffDateDays, formatDate, todayDateString } from '@/lib/date';
import { FLAVOR_CATEGORIES, findFlavorPath, flavorColor } from '@/lib/flavorWheel';
import { Bean, Roast, Tasting } from '@/types';

const NEGATIVE_OPTIONS = ['Under Developed', 'Over Developed', 'Astringency', 'Smoky', 'Baked', 'Dry', 'Woody', 'Vegetal', 'Harsh', 'Sour'];

type ScoreKey = 'fragrance' | 'aroma' | 'flavor' | 'sweetness' | 'acidityIntensity' | 'acidityQuality' | 'body' | 'aftertaste' | 'balance' | 'cleanCup' | 'overall';

const SCORE_FIELDS: { key: ScoreKey; label: string; description: string }[] = [
  { key: 'fragrance', label: '粉の香り', description: '挽いた直後' },
  { key: 'aroma', label: '抽出後の香り', description: 'お湯を注いだ後' },
  { key: 'flavor', label: '風味', description: '口に含んだ印象' },
  { key: 'sweetness', label: '甘さ', description: '甘さの明瞭さ' },
  { key: 'acidityIntensity', label: '酸の強さ', description: '強度' },
  { key: 'acidityQuality', label: '酸の質', description: '心地よさ' },
  { key: 'body', label: '質感', description: '口当たり' },
  { key: 'aftertaste', label: '余韻', description: '持続と心地よさ' },
  { key: 'balance', label: 'バランス', description: '全体の調和' },
  { key: 'cleanCup', label: '透明感', description: '雑味の少なさ' },
  { key: 'overall', label: '総合評価', description: 'もう一度飲みたいか' },
];

const defaultScores: Record<ScoreKey, number> = {
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
};

export default function TastingPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const routeKey = String(params.day);
  const requestedDay = Number(routeKey);
  const isNew = routeKey === 'new' || !Number.isFinite(requestedDay);

  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [tastingId, setTastingId] = useState('');
  const [tastingIndex, setTastingIndex] = useState(1);
  const [tastingDate, setTastingDate] = useState(todayDateString());
  const [doseGrams, setDoseGrams] = useState('11');
  const [scores, setScores] = useState<Record<ScoreKey, number>>(defaultScores);
  const [rating, setRating] = useState(0);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [improvements, setImprovements] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [syncMessage, setSyncMessage] = useState('');
  const [savedTasting, setSavedTasting] = useState<Tasting | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(FLAVOR_CATEGORIES[0].name);
  const [activeSubcategory, setActiveSubcategory] = useState(FLAVOR_CATEGORIES[0].subcategories[0].name);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentRoast = DBService.getRoastById(id);
      if (!currentRoast) {
        router.push('/roasts');
        return;
      }
      const currentTastings = DBService.getTastingsForRoast(id);
      const existing = isNew
        ? undefined
        : currentTastings.find(tasting => tasting.dayAfterRoast === requestedDay || tasting.tastingIndex === requestedDay);
      const nextIndex = currentTastings.length + 1;

      setRoast(currentRoast);
      setBean(DBService.getBeanById(currentRoast.beanId) || null);
      setTastingId(existing?.id || DBService.generateNextTastingId(id));
      setTastingIndex(existing?.tastingIndex || nextIndex);
      setTastingDate(existing?.tastingDate || todayDateString());
      setDoseGrams(existing
        ? existing.doseGramsRecorded === false ? '' : String(existing.doseGrams)
        : '11');

      if (existing) {
        setScores({
          fragrance: existing.fragrance,
          aroma: existing.aroma,
          flavor: existing.flavor,
          sweetness: existing.sweetness,
          acidityIntensity: existing.acidityIntensity,
          acidityQuality: existing.acidityQuality,
          body: existing.body,
          aftertaste: existing.aftertaste,
          balance: existing.balance,
          cleanCup: existing.cleanCup,
          overall: existing.overall,
        });
        setRating(existing.recommendationRating);
        setFlavors(existing.flavors || []);
        const firstFlavorPath = findFlavorPath(existing.flavors?.[0]);
        if (firstFlavorPath) {
          setActiveCategory(firstFlavorPath.category);
          setActiveSubcategory(firstFlavorPath.subcategory);
        }
        setNegatives(existing.negatives || []);
        setImprovements(existing.improvements || '');
        setNotes(existing.notes || '');
        setPhotos(existing.photos || []);
      }
      setSavedTasting(existing || null);
      setIsDirty(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, isNew, requestedDay, router]);

  const tastingColor = flavorColor(flavors[0], '#D9A066');

  const dayAfterRoast = roast ? Math.max(0, diffDateDays(roast.roastDate, tastingDate)) : 0;
  const liveScore = useMemo(() => scores.fragrance + scores.aroma + scores.flavor + scores.sweetness
    + ((scores.acidityIntensity + scores.acidityQuality) / 2)
    + scores.body + scores.aftertaste + scores.balance + scores.cleanCup + scores.overall, [scores]);

  const updateScore = (key: ScoreKey, value: number) => {
    setIsDirty(true);
    setScores(current => ({ ...current, [key]: Math.round(Math.min(10, Math.max(0, value)) * 10) / 10 }));
  };

  const toggleNegative = (value: string) => {
    setIsDirty(true);
    setNegatives(list => list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  };

  const toggleFlavor = (label: string) => {
    setIsDirty(true);
    setFlavors(list => {
      if (list.includes(label)) return list;
      return [...list, label];
    });
  };

  const removeFlavor = (label: string) => {
    setIsDirty(true);
    setFlavors(list => list.filter(item => item !== label));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos(current => [...current, reader.result as string]);
          setIsDirty(true);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const saveTasting = () => {
    if (!roast) return;
    const tasting: Tasting = {
      id: tastingId,
      roastId: id,
      tastingIndex,
      tastingDay: dayAfterRoast,
      tastingDate,
      dayAfterRoast,
      doseGrams: Number(doseGrams) || 0,
      doseGramsRecorded: doseGrams.trim() !== '',
      ...scores,
      score: Math.round(liveScore * 10) / 10,
      recommendationRating: rating,
      flavors,
      negatives,
      improvements,
      impressionColor: tastingColor,
      notes,
      photos,
      status: 'completed',
      createdAt: DBService.getTastingById(tastingId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    DBService.saveTasting(tasting, false);
    setSyncMessage('ローカル保存済み。Google Sheetsはバックグラウンドで同期します。');
    void DBService.saveTastingToCloud(tasting);
    setSavedTasting(tasting);
    setIsDirty(false);
    router.replace(`/roasts/${id}/tasting/${dayAfterRoast}`);
  };

  const deleteTasting = () => {
    if (!tastingId || !DBService.getTastingById(tastingId)) return;
    DBService.deleteTasting(tastingId, false);
    void DBService.deleteTastingFromCloud(tastingId);
    router.push('/dashboard');
  };

  if (!roast) return null;

  return (
    <div className="lab-shell flex min-h-screen flex-col" data-surface="tasting">
      <header className="page-header tasting-command-header sticky top-0 z-[var(--z-sticky)] flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="tap-button rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label="テイスティング一覧へ戻る">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">味見の記録 #{tastingIndex}</h1>
            <p className="truncate text-sm text-slate-400">{roast.id} / {bean?.name || '生豆不明'} / {formatDate(tastingDate)} / {dayAfterRoast}日</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <div className="tasting-total text-right">
            <span className="block text-xs text-slate-400">合計スコア</span>
            <span className="font-mono font-extrabold text-[var(--primary)]">{liveScore.toFixed(1)}<span className="ml-1 text-xs font-normal text-slate-400">/100</span></span>
          </div>
          {DBService.getTastingById(tastingId) && (
            <button onClick={() => setDeleteDialogOpen(true)} className="tap-button rounded-lg border border-red-300/20 bg-red-400/10 p-2 text-red-200" aria-label="削除">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={saveTasting} className="btn-primary tap-button inline-flex items-center gap-2">
            {savedTasting && !isDirty ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {savedTasting && !isDirty ? '保存済み' : '保存'}
          </button>
        </div>
      </header>

      {syncMessage && <div className="border-b border-white/10 bg-white/[0.025] px-4 py-2 md:px-6"><SyncStatus message={syncMessage} tone="pending" compact /></div>}

      <main className="tasting-workspace mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <section className="order-1 space-y-6">
          <Panel title="基本情報" className="tasting-basics">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-400">テイスティング日</span>
                <input type="date" value={tastingDate} onChange={event => { setTastingDate(event.target.value); setIsDirty(true); }} className="w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-base" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-400">焙煎から</span>
                <div className="flex min-h-11 items-center rounded-lg border border-white/10 bg-[#101827] px-3 font-mono text-sm text-[var(--primary)]">{dayAfterRoast}日目</div>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-400">使用した豆量(g)</span>
                <input type="number" inputMode="decimal" min="0" step="0.1" value={doseGrams} onChange={event => { setDoseGrams(event.target.value); setIsDirty(true); }} className="w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-base" />
              </label>
            </div>
          </Panel>

          <Panel title="スコア (0-10)" className="tasting-score-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SCORE_FIELDS.map(field => (
                <ScoreControl key={field.key} label={field.label} description={field.description} value={scores[field.key]} onChange={value => updateScore(field.key, value)} accent="var(--primary)" />
              ))}
            </div>
          </Panel>
        </section>

        <section className="order-2 space-y-6">
          <Panel title="フレーバー" className="tasting-flavor-panel">
            <FlavorWheel
              activeCategory={activeCategory}
              activeSubcategory={activeSubcategory}
              selected={flavors}
              onCategoryChange={(category, firstSubcategory) => {
                setActiveCategory(category);
                setActiveSubcategory(firstSubcategory);
              }}
              onSubcategoryChange={setActiveSubcategory}
              onToggle={toggleFlavor}
              onRemove={removeFlavor}
            />
          </Panel>

          <Panel title="おすすめ度">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => { setRating(star); setIsDirty(true); }} className="tap-button p-1" aria-label={`おすすめ度 ${star}`}>
                  <Star className={`h-8 w-8 ${star <= rating ? 'fill-current text-[var(--primary)]' : 'text-slate-700'}`} />
                </button>
              ))}
            </div>
          </Panel>

          <CollapsiblePanel title="ネガティブ要素">
            <div className="flex flex-wrap gap-1.5">
              {NEGATIVE_OPTIONS.map(option => (
                <Tag key={option} selected={negatives.includes(option)} danger onClick={() => toggleNegative(option)}>{option}</Tag>
              ))}
            </div>
          </CollapsiblePanel>

          <CollapsiblePanel title="メモ">
            <textarea aria-label="味見のメモ" value={notes} onChange={event => { setNotes(event.target.value); setIsDirty(true); }} rows={3} placeholder="抽出方法、湯温、挽き目、味の印象など" className="w-full resize-none rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-base" />
            <textarea aria-label="次回試したいこと" value={improvements} onChange={event => { setImprovements(event.target.value); setIsDirty(true); }} rows={3} placeholder="次回の焙煎や抽出で試したいこと" className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-base" />
          </CollapsiblePanel>

          <CollapsiblePanel title="写真">
            {photos.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {photos.map((src, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`味見の記録写真 ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" aria-label={`写真 ${index + 1} を削除`} onClick={() => { setPhotos(photos.filter((_, itemIndex) => itemIndex !== index)); setIsDirty(true); }} className="absolute inset-0 flex items-center justify-center bg-[#080E14]/70 text-red-300 opacity-0 transition focus:opacity-100 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="tap-button flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/10 py-5 text-xs text-slate-400 hover:bg-white/[0.04]">
              写真を選択
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </CollapsiblePanel>
        </section>
      </main>
      <ConfirmDialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={deleteTasting} title="テイスティング記録を削除しますか？" description={`${dayAfterRoast}日目の味見記録を削除します。`} consequence="残量目安が再計算されます。この操作は復元できません。" />
    </div>
  );
}

function ScoreControl({ label, description, value, onChange, accent }: { label: string; description: string; value: number; onChange: (value: number) => void; accent: string }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(String(value)), 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  const commitDraft = () => {
    if (draft.trim() === '') {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onChange(parsed);
    else setDraft(String(value));
  };

  return (
    <div className="score-control space-y-3 border-t border-[var(--border)] py-3 first:border-t-0 md:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold">{label}</span>
          <span className="score-description hidden text-xs text-slate-400 md:block">{description}</span>
        </div>
        <input aria-label={`${label}の数値`} type="number" inputMode="decimal" min="0" max="10" step="0.1" value={draft} onChange={event => setDraft(event.target.value)} onBlur={commitDraft} className="score-value-input rounded-lg border border-white/10 bg-[#101827] px-2 py-1 text-right font-mono text-base" style={{ color: accent, width: '5rem', flex: '0 0 5rem' }} />
      </div>
      <input aria-label={`${label}のスライダー`} type="range" min="0" max="10" step="1" value={Math.round(value)} onChange={event => onChange(Number(event.target.value))} className="w-full" style={{ accentColor: accent }} />
      <div className="score-step-buttons hidden grid-cols-2 gap-2 md:grid">
        <button type="button" aria-label={`${label}を0.1下げる`} onClick={() => onChange(value - 0.1)} className="tap-button inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
          <Minus className="h-3 w-3" />0.1
        </button>
        <button type="button" aria-label={`${label}を0.1上げる`} onClick={() => onChange(value + 0.1)} className="tap-button inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
          <Plus className="h-3 w-3" />0.1
        </button>
      </div>
    </div>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`instrument-panel ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">{title}</h2>
      {children}
    </section>
  );
}

function CollapsiblePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="instrument-panel">
      <summary className="tap-button cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Tag({ selected, danger = false, onClick, children }: { selected: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`tap-button flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${selected ? danger ? 'border-red-300/40 bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-red-100' : 'border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}
