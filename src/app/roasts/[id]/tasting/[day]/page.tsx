'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Save, Star, Trash2 } from 'lucide-react';
import { DBService } from '@/lib/db';
import { diffDateDays, formatDate, todayDateString } from '@/lib/date';
import { Bean, Roast, Tasting } from '@/types';

const FLAVOR_OPTIONS = ['Floral', 'Jasmine', 'Citrus', 'Orange', 'Berry', 'Blueberry', 'Peach', 'Honey', 'Caramel', 'Chocolate', 'Tea', 'Nutty'];
const NEGATIVE_OPTIONS = ['Under Developed', 'Over Developed', 'Astringency', 'Smoky', 'Baked', 'Dry', 'Woody', 'Vegetal', 'Harsh', 'Sour'];
const IMPRESSION_COLORS = [
  { color: '#FACC15', label: '明るい酸' },
  { color: '#EF4444', label: 'ベリー' },
  { color: '#92400E', label: 'チョコ' },
  { color: '#16A34A', label: 'ハーブ' },
  { color: '#2563EB', label: 'クリーン' },
  { color: '#7C3AED', label: 'ワイン' },
  { color: '#F97316', label: '柑橘' },
  { color: '#1F2937', label: 'ビター' },
];

type ScoreKey = 'fragrance' | 'aroma' | 'flavor' | 'sweetness' | 'acidityIntensity' | 'acidityQuality' | 'body' | 'aftertaste' | 'balance' | 'cleanCup' | 'overall';

const SCORE_FIELDS: { key: ScoreKey; label: string; description: string }[] = [
  { key: 'fragrance', label: 'Fragrance', description: '粉の香り' },
  { key: 'aroma', label: 'Aroma', description: '抽出後の香り' },
  { key: 'flavor', label: 'Flavor', description: '風味' },
  { key: 'sweetness', label: 'Sweetness', description: '甘さ' },
  { key: 'acidityIntensity', label: 'Acidity Intensity', description: '酸の強さ' },
  { key: 'acidityQuality', label: 'Acidity Quality', description: '酸の質' },
  { key: 'body', label: 'Body', description: '質感' },
  { key: 'aftertaste', label: 'Aftertaste', description: '余韻' },
  { key: 'balance', label: 'Balance', description: 'バランス' },
  { key: 'cleanCup', label: 'Clean Cup', description: '透明感' },
  { key: 'overall', label: 'Overall', description: '総合評価' },
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
  const id = params.id as string;
  const routeKey = params.day as string;
  const requestedDay = Number(routeKey);
  const isNew = routeKey === 'new' || !Number.isFinite(requestedDay);

  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [tastingId, setTastingId] = useState('');
  const [tastingIndex, setTastingIndex] = useState(1);
  const [tastingDate, setTastingDate] = useState(todayDateString());
  const [doseGrams, setDoseGrams] = useState('');
  const [scores, setScores] = useState<Record<ScoreKey, number>>(defaultScores);
  const [rating, setRating] = useState(0);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [customFlavor, setCustomFlavor] = useState('');
  const [improvements, setImprovements] = useState('');
  const [notes, setNotes] = useState('');
  const [impressionColor, setImpressionColor] = useState('#D09B6A');
  const [photos, setPhotos] = useState<string[]>([]);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) {
      alert('焙煎記録が見つかりません。');
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
    setDoseGrams(existing?.doseGrams ? String(existing.doseGrams) : '');

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
      setNegatives(existing.negatives || []);
      setImprovements(existing.improvements || '');
      setNotes(existing.notes || '');
      setImpressionColor(existing.impressionColor || '#D09B6A');
      setPhotos(existing.photos || []);
    }
  }, [id, isNew, requestedDay, router]);

  const dayAfterRoast = roast ? Math.max(0, diffDateDays(roast.roastDate, tastingDate)) : 0;
  const liveScore = useMemo(() => scores.fragrance + scores.aroma + scores.flavor + scores.sweetness
    + ((scores.acidityIntensity + scores.acidityQuality) / 2)
    + scores.body + scores.aftertaste + scores.balance + scores.cleanCup + scores.overall, [scores]);

  const updateScore = (key: ScoreKey, value: number) => {
    setScores(current => ({ ...current, [key]: Math.round(Math.min(10, Math.max(0, value)) * 10) / 10 }));
  };

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  };

  const addCustomFlavor = (event: React.FormEvent) => {
    event.preventDefault();
    const value = customFlavor.trim();
    if (!value) return;
    if (!flavors.includes(value)) setFlavors([...flavors, value]);
    setCustomFlavor('');
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') setPhotos(current => [...current, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const saveTasting = async () => {
    if (!roast) return;
    const tasting: Tasting = {
      id: tastingId,
      roastId: id,
      tastingIndex,
      tastingDay: dayAfterRoast,
      tastingDate,
      dayAfterRoast,
      doseGrams: Number(doseGrams) || 0,
      ...scores,
      score: Math.round(liveScore * 10) / 10,
      recommendationRating: rating,
      flavors,
      negatives,
      improvements,
      impressionColor,
      notes,
      photos,
      status: 'completed',
      createdAt: DBService.getTastingById(tastingId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    DBService.saveTasting(tasting, false);
    setSyncMessage('ローカルに保存しました。Google Sheetsへ同期中です。');
    const result = await DBService.saveTastingToCloud(tasting);
    if (!result.ok) {
      setSyncMessage(result.error || 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。');
      return;
    }
    router.push(`/roasts/${id}`);
  };

  const deleteTasting = async () => {
    if (!tastingId || !DBService.getTastingById(tastingId)) return;
    if (!confirm('このテイスティング評価を削除しますか？分析とバッチ残量からも除外されます。')) return;
    DBService.deleteTasting(tastingId, false);
    const result = await DBService.deleteTastingFromCloud(tastingId);
    if (!result.ok) {
      setSyncMessage(result.error || '削除はローカルに反映しました。Google Sheetsへはバックグラウンドで再試行します。');
      return;
    }
    router.push(`/roasts/${id}`);
  };

  if (!roast) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-[#232326] bg-[#0E0E10]/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/roasts/${id}`} className="rounded-lg p-2 text-[#8E8E93] transition hover:bg-[#232326] hover:text-[#F4F4F6] active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-wide">テイスティング #{tastingIndex}</h1>
            <p className="text-xs text-[#8E8E93]">{roast.id} / {bean?.name || '生豆不明'} / {formatDate(tastingDate)} / Day {dayAfterRoast}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <div className="text-right">
            <span className="block text-[10px] text-[#8E8E93]">合計スコア</span>
            <span className="font-mono text-2xl font-extrabold text-[#D09B6A]">{liveScore.toFixed(1)}<span className="ml-1 text-xs font-normal text-[#8E8E93]">/100</span></span>
          </div>
          {DBService.getTastingById(tastingId) && (
            <button onClick={deleteTasting} className="rounded-lg border border-red-900/30 bg-red-950/20 p-2 text-[#EF4444] transition active:scale-95" aria-label="削除">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={saveTasting} className="inline-flex items-center gap-2 rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C] transition active:scale-95">
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </header>

      {syncMessage && <div className="border-b border-[#D09B6A]/20 bg-[#1C1C1F] px-4 py-2 text-sm text-[#D09B6A] md:px-6">{syncMessage}</div>}

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 pb-28 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
        <section className="space-y-6">
          <Panel title="基本情報">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#8E8E93]">テイスティング日</span>
                <input type="date" value={tastingDate} onChange={event => setTastingDate(event.target.value)} className="w-full rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#8E8E93]">焙煎から</span>
                <div className="flex min-h-11 items-center rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 font-mono text-sm text-[#D09B6A]">Day {dayAfterRoast}</div>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[#8E8E93]">使用した豆量(g)</span>
                <input type="number" inputMode="decimal" value={doseGrams} onChange={event => setDoseGrams(event.target.value)} className="w-full rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              </label>
            </div>
          </Panel>

          <Panel title="スコア (0-10)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SCORE_FIELDS.map(field => (
                <ScoreControl key={field.key} label={field.label} description={field.description} value={scores[field.key]} onChange={value => updateScore(field.key, value)} />
              ))}
            </div>
          </Panel>
        </section>

        <section className="space-y-6">
          <Panel title="おすすめ度">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setRating(star)} className="p-1 transition active:scale-90">
                  <Star className={`h-8 w-8 ${star <= rating ? 'fill-[#D09B6A] text-[#D09B6A]' : 'text-[#3A3A40]'}`} />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="印象色">
            <div className="grid grid-cols-4 gap-2">
              {IMPRESSION_COLORS.map(option => (
                <button key={option.color} type="button" onClick={() => setImpressionColor(option.color)} className={`rounded-xl border p-2 text-left transition active:scale-95 ${impressionColor === option.color ? 'border-[#F4F4F6]' : 'border-[#232326]'}`}>
                  <span className="block h-7 rounded-lg" style={{ backgroundColor: option.color }} />
                  <span className="mt-1 block text-[10px] text-[#A1A1AA]">{option.label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="フレーバー">
            <div className="flex flex-wrap gap-1.5">
              {FLAVOR_OPTIONS.map(option => (
                <Tag key={option} selected={flavors.includes(option)} onClick={() => toggle(option, flavors, setFlavors)}>{option}</Tag>
              ))}
            </div>
            <form onSubmit={addCustomFlavor} className="mt-3 flex gap-2">
              <input value={customFlavor} onChange={event => setCustomFlavor(event.target.value)} placeholder="自由入力" className="flex-1 rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-[#1C1C1F] px-3 py-2 text-sm font-semibold">追加</button>
            </form>
          </Panel>

          <Panel title="ネガティブ要素">
            <div className="flex flex-wrap gap-1.5">
              {NEGATIVE_OPTIONS.map(option => (
                <Tag key={option} selected={negatives.includes(option)} danger onClick={() => toggle(option, negatives, setNegatives)}>{option}</Tag>
              ))}
            </div>
          </Panel>

          <Panel title="メモ">
            <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="抽出方法、湯温、挽き目、味の印象など" className="w-full resize-none rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
            <textarea value={improvements} onChange={event => setImprovements(event.target.value)} rows={3} placeholder="次回の焙煎や抽出で試したいこと" className="mt-3 w-full resize-none rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
          </Panel>

          <Panel title="写真">
            {photos.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {photos.map((src, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-[#232326]">
                    <img src={src} alt="tasting" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos(photos.filter((_, itemIndex) => itemIndex !== index))} className="absolute inset-0 flex items-center justify-center bg-[#0B0B0C]/70 text-[#EF4444] opacity-0 transition group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#232326] py-5 text-xs text-[#8E8E93] hover:bg-[#1C1C1F]">
              写真を選択
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function ScoreControl({ label, description, value, onChange }: { label: string; description: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
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
    <div className="space-y-2 rounded-xl border border-[#232326] bg-[#131315] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-sm font-semibold">{label}</span>
          <span className="block text-[10px] text-[#8E8E93]">{description}</span>
        </div>
        <input type="number" inputMode="decimal" min="0" max="10" step="0.1" value={draft} onChange={event => setDraft(event.target.value)} onBlur={commitDraft} className="w-20 rounded-lg border border-[#232326] bg-[#1A1A1E] px-2 py-1 text-right font-mono text-sm text-[#D09B6A]" />
      </div>
      <input type="range" min="0" max="10" step="0.1" value={value} onChange={event => onChange(Number(event.target.value))} className="w-full accent-[#D09B6A]" />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#232326] bg-[#131315] p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">{title}</h2>
      {children}
    </section>
  );
}

function Tag({ selected, danger = false, onClick, children }: { selected: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition active:scale-95 ${selected ? danger ? 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]' : 'border-[#D09B6A]/40 bg-[#D09B6A]/15 text-[#D09B6A]' : 'border-[#232326] bg-[#1C1C1F] text-[#8E8E93]'}`}>
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}
