'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Star, Trash2 } from 'lucide-react';
import { DBService } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';

const FLAVOR_OPTIONS = ['Floral', 'Jasmine', 'Citrus', 'Orange', 'Berry', 'Blueberry', 'Peach', 'Honey', 'Caramel', 'Chocolate', 'Tea', 'Nutty'];
const NEGATIVE_OPTIONS = ['Under Developed', 'Over Developed', 'Astringency', 'Smoky', 'Baked', 'Dry', 'Woody', 'Vegetal', 'Harsh', 'Sour'];

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
  { key: 'cleanCup', label: 'Clean Cup', description: 'クリーンさ' },
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
  const day = Number(params.day) as 7 | 10 | 14;
  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [tastingId, setTastingId] = useState(`t_${id}_d${day}`);
  const [scores, setScores] = useState<Record<ScoreKey, number>>(defaultScores);
  const [rating, setRating] = useState(0);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [customFlavor, setCustomFlavor] = useState('');
  const [improvements, setImprovements] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) {
      alert('焙煎記録が見つかりません。');
      router.push('/roasts');
      return;
    }
    setRoast(currentRoast);
    setBean(DBService.getBeanById(currentRoast.beanId) || null);
    const existing = DBService.getTastingsForRoast(id).find(tasting => tasting.tastingDay === day);
    if (!existing) return;
    setTastingId(existing.id);
    if (existing.status === 'completed') {
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
      setPhotos(existing.photos || []);
    }
  }, [id, day, router]);

  const liveScore = scores.fragrance + scores.aroma + scores.flavor + scores.sweetness
    + ((scores.acidityIntensity + scores.acidityQuality) / 2)
    + scores.body + scores.aftertaste + scores.balance + scores.cleanCup + scores.overall;

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

  const saveTasting = () => {
    if (!roast) return;
    const tasting: Tasting = {
      id: tastingId,
      roastId: id,
      tastingDay: day,
      tastingDate: new Date().toISOString().split('T')[0],
      ...scores,
      score: Math.round(liveScore * 10) / 10,
      recommendationRating: rating,
      flavors,
      negatives,
      improvements,
      photos,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    DBService.saveTasting(tasting);
    router.push(`/roasts/${id}`);
  };

  if (!roast) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href={`/roasts/${id}`} className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#232326] hover:text-[#F4F4F6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Day {day} テイスティング</h1>
            <p className="text-xs text-[#8E8E93]">{roast.id} / {bean?.name || '生豆不明'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-[10px] text-[#8E8E93]">合計スコア</span>
            <span className="font-mono text-2xl font-extrabold text-[#D09B6A]">{liveScore.toFixed(1)}<span className="ml-1 text-xs font-normal text-[#8E8E93]">/100</span></span>
          </div>
          <button onClick={saveTasting} className="rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C]">保存</button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-y-auto lg:flex-row">
        <section className="w-full space-y-6 border-b border-[#232326] p-6 lg:w-3/5 lg:border-b-0 lg:border-r">
          <h2 className="text-base font-bold text-[#F4F4F6]">スコア (0-10)</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SCORE_FIELDS.map(field => (
              <ScoreControl key={field.key} label={field.label} description={field.description} value={scores[field.key]} onChange={value => updateScore(field.key, value)} />
            ))}
          </div>
        </section>

        <section className="w-full space-y-6 bg-[#0E0E10]/20 p-6 lg:w-2/5">
          <Panel title="おすすめ度">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setRating(star)} className="p-1">
                  <Star className={`h-8 w-8 ${star <= rating ? 'fill-[#D09B6A] text-[#D09B6A]' : 'text-[#232326]'}`} />
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

          <Panel title="次回への調整メモ">
            <textarea value={improvements} onChange={event => setImprovements(event.target.value)} rows={4} placeholder="例: 火力を少し早めに落とす、Devを10秒伸ばす..." className="w-full resize-none rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm" />
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
      <div className="flex items-center justify-between">
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
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${selected ? danger ? 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]' : 'border-[#D09B6A]/40 bg-[#D09B6A]/15 text-[#D09B6A]' : 'border-[#232326] bg-[#1C1C1F] text-[#8E8E93]'}`}>
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}
