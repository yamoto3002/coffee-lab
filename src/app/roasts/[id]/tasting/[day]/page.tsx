'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DBService } from '@/lib/db';
import { Roast, Tasting, Bean } from '@/types';
import { ArrowLeft, Star, Plus, Trash2, Camera, HelpCircle, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

// Hierarchical Flavor Wheel Data
const FLAVOR_WHEEL = {
  Fruit: {
    Berry: ['Blueberry', 'Raspberry', 'Strawberry', 'Blackberry'],
    Citrus: ['Lemon', 'Lime', 'Orange', 'Grapefruit', 'Yuzu'],
    StoneFruit: ['Peach', 'Plum', 'Apricot', 'Cherry'],
    OtherFruit: ['Apple', 'Grape', 'Pineapple', 'Banana', 'Mango']
  },
  Sweet: {
    Sugar: ['Honey', 'Brown Sugar', 'Caramel', 'Maple Syrup', 'Molasses'],
    Vanilla: ['Vanilla Pod', 'Marshmallow']
  },
  Cocoa_Nutty: {
    Chocolate: ['Dark Chocolate', 'Milk Chocolate', 'Cocoa Powder'],
    Nutty: ['Almond', 'Hazelnut', 'Peanut', 'Cashew', 'Walnut']
  },
  Floral: {
    Flower: ['Jasmine', 'Lavender', 'Rose', 'Coffee Blossom', 'Elderflower']
  },
  Herbal_Spice: {
    Tea: ['Black Tea', 'Green Tea', 'Earl Grey', 'Rooibos'],
    Spices: ['Cinnamon', 'Clove', 'Nutmeg', 'Cardamom', 'Ginger']
  }
};

const NEGATIVE_DESCRIPTOR_OPTIONS = [
  'Under Developed (生焼け)',
  'Over Developed (焦げ)',
  'Astringency (渋み)',
  'Smoky (煙臭)',
  'Baked (フラット)',
  'Dry (乾燥感)',
  'Woody (木質)',
  'Vegetal (青臭さ)',
  'Harsh (刺すような味)',
  'Sour (不快な酸)'
];

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  description?: string;
}

// Custom ScoreSlider component with +/- 0.25 buttons for ultra-fast thumb input
function ScoreSlider({ label, value, onChange, description }: ScoreSliderProps) {
  const adjust = (amount: number) => {
    const newVal = Math.min(10, Math.max(0, value + amount));
    onChange(Math.round(newVal * 100) / 100);
  };

  return (
    <div className="bg-[#131315] p-3.5 rounded-xl border border-[#232326] space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-semibold text-[#F4F4F6]">{label}</span>
          {description && <span className="text-[10px] text-[#8E8E93] block">{description}</span>}
        </div>
        <span className="font-mono text-base font-extrabold text-[#D09B6A]">{value.toFixed(2)}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjust(-0.25)}
          className="w-10 h-8 rounded bg-[#1C1C1F] hover:bg-[#232326] flex items-center justify-center text-xs font-bold text-[#E4E4E7] transition-all cursor-pointer active:scale-90 select-none"
        >
          -0.25
        </button>

        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[#D09B6A] cursor-pointer h-1 bg-[#232326] rounded-lg appearance-none"
        />

        <button
          type="button"
          onClick={() => adjust(0.25)}
          className="w-10 h-8 rounded bg-[#1C1C1F] hover:bg-[#232326] flex items-center justify-center text-xs font-bold text-[#E4E4E7] transition-all cursor-pointer active:scale-90 select-none"
        >
          +0.25
        </button>
      </div>
    </div>
  );
}

export default function TastingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const day = parseInt(params.day as string) as 7 | 10 | 14;

  const [roast, setRoast] = useState<Roast | null>(null);
  const [bean, setBean] = useState<Bean | null>(null);
  const [tastingId, setTastingId] = useState('');

  // 11 scoring parameters (Q-grader style)
  // Default to 8.00 (standard Q-grader base for specialty coffee)
  const [fragrance, setFragrance] = useState(8.0);
  const [aroma, setAroma] = useState(8.0);
  const [flavor, setFlavor] = useState(8.0);
  const [sweetness, setSweetness] = useState(8.0);
  const [acidityIntensity, setAcidityIntensity] = useState(8.0);
  const [acidityQuality, setAcidityQuality] = useState(8.0);
  const [body, setBody] = useState(8.0);
  const [aftertaste, setAftertaste] = useState(8.0);
  const [balance, setBalance] = useState(8.0);
  const [cleanCup, setCleanCup] = useState(8.0);
  const [overall, setOverall] = useState(8.0);

  // Recommendations and Tags
  const [rating, setRating] = useState(4);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedNegatives, setSelectedNegatives] = useState<string[]>([]);
  const [improvements, setImprovements] = useState('');
  
  // Custom flavor inputs
  const [customFlavor, setCustomFlavor] = useState('');
  
  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);

  // Flavor Wheel UI state
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  useEffect(() => {
    const currentRoast = DBService.getRoastById(id);
    if (!currentRoast) {
      alert('焙煎記録が見つかりません');
      router.push('/roasts');
      return;
    }
    setRoast(currentRoast);
    setBean(DBService.getBeanById(currentRoast.beanId) || null);

    // Check if tasting already exists
    const allTastings = DBService.getTastingsForRoast(id);
    const existing = allTastings.find(t => t.tastingDay === day);
    if (existing) {
      setTastingId(existing.id);
      if (existing.status === 'completed') {
        // Load values
        setFragrance(existing.fragrance);
        setAroma(existing.aroma);
        setFlavor(existing.flavor);
        setSweetness(existing.sweetness);
        setAcidityIntensity(existing.acidityIntensity);
        setAcidityQuality(existing.acidityQuality);
        setBody(existing.body);
        setAftertaste(existing.aftertaste);
        setBalance(existing.balance);
        setCleanCup(existing.cleanCup);
        setOverall(existing.overall);
        setRating(existing.recommendationRating);
        setSelectedFlavors(existing.flavors || []);
        setSelectedNegatives(existing.negatives || []);
        setImprovements(existing.improvements || '');
        setPhotos(existing.photos || []);
      } else {
        setTastingId(existing.id);
      }
    } else {
      setTastingId(`t_${id}_d${day}`);
    }
  }, [id, day, router]);

  // Calculate live score
  const avgAcidity = (acidityIntensity + acidityQuality) / 2;
  const liveScore = 
    fragrance + 
    aroma + 
    flavor + 
    sweetness + 
    avgAcidity + 
    body + 
    aftertaste + 
    balance + 
    cleanCup + 
    overall;

  const handleSaveTasting = () => {
    if (!roast) return;

    const newTasting: Tasting = {
      id: tastingId || `t_${id}_d${day}`,
      roastId: id,
      tastingDay: day,
      tastingDate: new Date().toISOString().split('T')[0],
      fragrance,
      aroma,
      flavor,
      sweetness,
      acidityIntensity,
      acidityQuality,
      body,
      aftertaste,
      balance,
      cleanCup,
      overall,
      score: Math.round(liveScore * 10) / 10,
      recommendationRating: rating,
      flavors: selectedFlavors,
      negatives: selectedNegatives,
      improvements,
      photos,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    DBService.saveTasting(newTasting);
    router.push(`/roasts/${id}`);
  };

  // Flavor selectors
  const toggleFlavor = (fl: string) => {
    if (selectedFlavors.includes(fl)) {
      setSelectedFlavors(selectedFlavors.filter(x => x !== fl));
    } else {
      setSelectedFlavors([...selectedFlavors, fl]);
    }
  };

  const handleAddCustomFlavor = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFlavor.trim()) {
      const fl = customFlavor.trim();
      if (!selectedFlavors.includes(fl)) {
        setSelectedFlavors([...selectedFlavors, fl]);
      }
      setCustomFlavor('');
    }
  };

  const toggleNegative = (neg: string) => {
    if (selectedNegatives.includes(neg)) {
      setSelectedNegatives(selectedNegatives.filter(x => x !== neg));
    } else {
      setSelectedNegatives([...selectedNegatives, neg]);
    }
  };

  // Photo uploads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setPhotos(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  if (!roast) return null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href={`/roasts/${id}`} className="p-1.5 hover:bg-[#232326] rounded-lg text-[#8E8E93] hover:text-[#F4F4F6] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Day {day} テイスティング</h1>
            <p className="text-xs text-[#8E8E93]">バッチ: {roast.id} / 豆: {bean?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-[#8E8E93] block">合計スコア</span>
            <span className="text-2xl font-extrabold text-[#D09B6A] font-mono">
              {liveScore.toFixed(1)}
              <span className="text-xs font-normal text-[#8E8E93] ml-1">/100</span>
            </span>
          </div>
          <button
            onClick={handleSaveTasting}
            className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-sm transition-all active:scale-95 cursor-pointer"
          >
            評価を保存
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Left Side: Score Sliders (Mobile First) */}
        <div className="w-full lg:w-3/5 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-[#232326]">
          <h2 className="text-base font-bold text-[#F4F4F6] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D09B6A]" />
            Q-Grader テイスト評価 (0〜10点)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScoreSlider label="Fragrance (粉の香り)" value={fragrance} onChange={setFragrance} description="挽いた後のドライ時の香り" />
            <ScoreSlider label="Aroma (抽出後の香り)" value={aroma} onChange={setAroma} description="お湯を注いだ後のウェット時の香り" />
            <ScoreSlider label="Flavor (風味)" value={flavor} onChange={setFlavor} description="口に含んだときに感じる味と香り" />
            <ScoreSlider label="Sweetness (甘み)" value={sweetness} onChange={setSweetness} description="甘さの強さと持続性" />
            
            {/* Acidity split */}
            <ScoreSlider label="Acidity Intensity (酸の強さ)" value={acidityIntensity} onChange={setAcidityIntensity} description="酸のボリューム感" />
            <ScoreSlider label="Acidity Quality (酸の質)" value={acidityQuality} onChange={setAcidityQuality} description="フルーティーで澄んだ綺麗な酸か" />
            
            <ScoreSlider label="Body (コク・口当たり)" value={body} onChange={setBody} description="口に含んだときの粘り気や重さ" />
            <ScoreSlider label="Aftertaste (後味の余韻)" value={aftertaste} onChange={setAftertaste} description="飲み込んだ後に残る風味の良さ" />
            <ScoreSlider label="Balance (バランス)" value={balance} onChange={setBalance} description="酸、甘、コクの調和度" />
            <ScoreSlider label="Clean Cup (クリーンさ)" value={cleanCup} onChange={setCleanCup} description="雑味や不快な味のなさ" />
          </div>
          
          <div className="md:col-span-2">
            <ScoreSlider label="Overall (総合評価)" value={overall} onChange={setOverall} description="個人の好み、総合的な完成度" />
          </div>
        </div>

        {/* Right Side: Flavor Wheel, Negatives, Recommendations, Photos */}
        <div className="w-full lg:w-2/5 p-6 space-y-6 bg-[#0E0E10]/20 overflow-y-auto">
          {/* Recommendation rating stars */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-3">
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
              おすすめ度（もう一回このプロファイルで焼きたいか）
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transition-transform active:scale-90"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'text-[#D09B6A] fill-[#D09B6A]' : 'text-[#232326] fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Hierarchical Flavor Wheel Selector */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              フレーバー選択 (階層ホイール)
            </h3>

            {/* Selected Tags list */}
            {selectedFlavors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#1A1A1E] rounded-lg border border-[#232326]">
                {selectedFlavors.map(fl => (
                  <span
                    key={fl}
                    onClick={() => toggleFlavor(fl)}
                    className="text-[10px] font-bold bg-[#D09B6A]/10 border border-[#D09B6A]/20 text-[#D09B6A] py-1 px-2 rounded-full cursor-pointer hover:bg-[#EF4444]/10 hover:text-[#EF4444] hover:border-[#EF4444]/20 transition-all flex items-center gap-1"
                  >
                    {fl}
                    <span className="text-[8px]">×</span>
                  </span>
                ))}
              </div>
            )}

            {/* Wheel Interface */}
            <div className="space-y-3">
              {/* Step 1: Base Categories */}
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(FLAVOR_WHEEL).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(activeCategory === cat ? null : cat);
                      setActiveSubcategory(null);
                    }}
                    className={`text-[11px] font-medium py-1 px-2.5 rounded-lg border transition-all cursor-pointer ${
                      activeCategory === cat 
                        ? 'bg-[#D09B6A] text-[#0B0B0C] border-[#D09B6A]' 
                        : 'bg-[#1C1C1F] text-[#8E8E93] border-[#232326] hover:text-[#F4F4F6]'
                    }`}
                  >
                    {cat.replace('_', ' / ')}
                  </button>
                ))}
              </div>

              {/* Step 2: Subcategories */}
              {activeCategory && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#1C1C1F]/60 rounded-lg border border-[#232326]">
                  {Object.keys(FLAVOR_WHEEL[activeCategory as keyof typeof FLAVOR_WHEEL]).map(subcat => (
                    <button
                      key={subcat}
                      type="button"
                      onClick={() => setActiveSubcategory(activeSubcategory === subcat ? null : subcat)}
                      className={`text-[10px] font-semibold py-1 px-2 rounded-full transition-all cursor-pointer ${
                        activeSubcategory === subcat 
                          ? 'bg-[#8E8E93] text-[#0B0B0C]' 
                          : 'bg-[#232326] text-[#A1A1AA]'
                      }`}
                    >
                      {subcat}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Specific Flavors */}
              {activeCategory && activeSubcategory && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#1C1C1F]/30 rounded-lg border border-[#232326]">
                  {(FLAVOR_WHEEL[activeCategory as keyof typeof FLAVOR_WHEEL] as any)[activeSubcategory].map((fl: string) => {
                    const isSelected = selectedFlavors.includes(fl);
                    return (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => toggleFlavor(fl)}
                        className={`text-[10px] py-1 px-2 rounded transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-[#D09B6A]/20 text-[#D09B6A] border border-[#D09B6A]/40' 
                            : 'bg-[#18181B] text-[#8E8E93] border border-[#232326] hover:bg-[#1E1E22]'
                        }`}
                      >
                        {fl}
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Flavor Search & Add */}
            <form onSubmit={handleAddCustomFlavor} className="flex gap-2">
              <input
                type="text"
                placeholder="その他のフレーバーを追加..."
                value={customFlavor}
                onChange={(e) => setCustomFlavor(e.target.value)}
                className="flex-1 bg-[#1A1A1E] border border-[#232326] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F6] placeholder-[#8E8E93]"
              />
              <button
                type="submit"
                className="py-1 px-3 rounded-lg bg-[#1C1C1F] hover:bg-[#232326] border border-[#232326] text-xs font-semibold cursor-pointer"
              >
                追加
              </button>
            </form>
          </div>

          {/* Negatives */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider">
              ネガティブ欠点（ワンタップ選択）
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {NEGATIVE_DESCRIPTOR_OPTIONS.map(neg => {
                const isSelected = selectedNegatives.includes(neg);
                return (
                  <button
                    key={neg}
                    type="button"
                    onClick={() => toggleNegative(neg)}
                    className={`text-[10px] py-1 px-2.5 rounded-full border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444] font-bold' 
                        : 'bg-[#1C1C1F] border-[#232326] text-[#8E8E93] hover:text-[#F4F4F6]'
                    }`}
                  >
                    {neg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-4">
            <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center justify-between">
              <span>写真を追加</span>
              <span className="text-[10px] text-[#8E8E93] font-normal">（抽出・豆など）</span>
            </h3>

            {/* Photo List */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#232326] group">
                    <img src={src} alt="tasting photo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute inset-0 bg-[#0B0B0C]/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#EF4444] font-bold text-xs transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Input Trigger */}
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload-input"
              />
              <label
                htmlFor="photo-upload-input"
                className="flex items-center justify-center gap-2 border border-dashed border-[#232326] hover:bg-[#1C1C1F] rounded-xl py-5 text-xs text-[#8E8E93] hover:text-[#F4F4F6] cursor-pointer transition-colors"
              >
                <Camera className="w-4.5 h-4.5" />
                カメラを起動 または 画像を選択
              </label>
            </div>
          </div>

          {/* Improvement Notes */}
          <div className="bg-[#131315] p-5 rounded-xl border border-[#232326] space-y-2">
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
              次回焙煎への改善案・調整プラン
            </label>
            <textarea
              rows={3}
              placeholder="例: 火力ダウンを10秒遅らせる、あるいはデベロップメント比率を16.5%に延ばしてボディを強調する..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
