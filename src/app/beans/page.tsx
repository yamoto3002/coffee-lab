'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DBService } from '@/lib/db';
import { Bean, Roast } from '@/types';
import Modal from '@/components/Modal';
import { Search, Plus, Coffee, Calendar, MapPin, Layers, Coins, ChevronRight, Edit2, Trash2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

// Validation Schema
const beanSchema = z.object({
  name: z.string().min(1, '豆名は必須です'),
  country: z.string().min(1, '生産国は必須です'),
  region: z.string().optional(),
  farm: z.string().optional(),
  producer: z.string().optional(),
  altitude: z.coerce.number().optional(),
  variety: z.string().optional(),
  process: z.string().min(1, '精製方法は必須です'),
  cropYear: z.string().optional(),
  purchaseShop: z.string().optional(),
  purchaseDate: z.string().min(1, '購入日は必須です'),
  purchasePrice: z.coerce.number().optional(),
  initialWeight: z.coerce.number().min(1, '内容量は1g以上で入力してください'),
  recommendedRoastDegree: z.string().optional(),
  notes: z.string().optional(),
});

type BeanFormValues = z.infer<typeof beanSchema>;

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [selectedBeanId, setSelectedBeanId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  
  // Mobile detail view toggle
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setRoasts(DBService.getRoasts());
    if (allBeans.length > 0 && !selectedBeanId) {
      setSelectedBeanId(allBeans[0].id);
    }
  };

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<BeanFormValues>({
    resolver: zodResolver(beanSchema) as any,
    defaultValues: {
      purchaseDate: new Date().toISOString().split('T')[0],
      initialWeight: 250,
      process: 'Washed',
      recommendedRoastDegree: 'Medium-Light',
    }
  });

  const onSubmit = (data: BeanFormValues) => {
    const nextId = editingBean ? editingBean.id : DBService.generateNextBeanId();
    const currentWeight = editingBean 
      ? editingBean.currentWeight + (data.initialWeight - editingBean.initialWeight)
      : data.initialWeight;

    const newBean: Bean = {
      id: nextId,
      name: data.name,
      country: data.country,
      region: data.region || '',
      farm: data.farm || '',
      producer: data.producer || '',
      altitude: data.altitude || 0,
      variety: data.variety || '',
      process: data.process,
      cropYear: data.cropYear || '',
      purchaseShop: data.purchaseShop || '',
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice || 0,
      initialWeight: data.initialWeight,
      currentWeight: Math.max(0, currentWeight),
      recommendedRoastDegree: data.recommendedRoastDegree || 'Medium-Light',
      notes: data.notes || '',
      photoUrl: editingBean?.photoUrl || '',
      createdAt: editingBean?.createdAt || new Date().toISOString()
    };

    DBService.saveBean(newBean);
    loadData();
    setSelectedBeanId(newBean.id);
    setIsAddModalOpen(false);
    setEditingBean(null);
    reset();
  };

  const handleEditClick = (bean: Bean, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBean(bean);
    reset({
      name: bean.name,
      country: bean.country,
      region: bean.region,
      farm: bean.farm,
      producer: bean.producer,
      altitude: bean.altitude || undefined,
      variety: bean.variety,
      process: bean.process,
      cropYear: bean.cropYear,
      purchaseShop: bean.purchaseShop,
      purchaseDate: bean.purchaseDate,
      purchasePrice: bean.purchasePrice || undefined,
      initialWeight: bean.initialWeight,
      recommendedRoastDegree: bean.recommendedRoastDegree,
      notes: bean.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('この生豆データを削除しますか？紐づく焙煎履歴の整合性が失われる可能性があります。')) {
      DBService.deleteBean(id);
      setSelectedBeanId(null);
      loadData();
    }
  };

  const handleOpenAddModal = () => {
    setEditingBean(null);
    reset({
      purchaseDate: new Date().toISOString().split('T')[0],
      initialWeight: 250,
      process: 'Washed',
      recommendedRoastDegree: 'Medium-Light',
    });
    setIsAddModalOpen(true);
  };

  // Filter beans
  const filteredBeans = beans.filter(bean => {
    const query = searchQuery.toLowerCase();
    return (
      bean.name.toLowerCase().includes(query) ||
      bean.country.toLowerCase().includes(query) ||
      bean.process.toLowerCase().includes(query) ||
      bean.variety.toLowerCase().includes(query)
    );
  });

  const selectedBean = beans.find(b => b.id === selectedBeanId);
  const selectedBeanRoasts = roasts.filter(r => r.beanId === selectedBeanId);

  // Common quick choices for form
  const countryChips = ['エチオピア', 'ケニア', 'コロンビア', 'グアテマラ', 'ブラジル', 'インドネシア'];
  const varietyChips = ['Typica', 'Bourbon', 'Geisha', 'SL28', 'Kurume', 'Caturra'];
  const processChips = ['Washed', 'Natural', 'Honey', 'Anaerobic'];

  return (
    <div className="flex flex-col h-screen md:h-auto md:min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">生豆管理</h1>
          <p className="text-xs text-[#8E8E93]">保有中のコーヒー生豆データベースと在庫管理</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          生豆を追加
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Bean List */}
        <div className="w-full md:w-2/5 border-r border-[#232326] bg-[#0B0B0C] flex flex-col h-full overflow-y-auto">
          {/* Search Bar */}
          <div className="p-4 border-b border-[#232326]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#8E8E93]" />
              <input
                type="text"
                placeholder="豆名、生産国、精製方法で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#131315] border border-[#232326] rounded-lg text-sm text-[#F4F4F6] placeholder-[#8E8E93]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-[#232326] flex-1">
            {filteredBeans.length === 0 ? (
              <div className="py-12 text-center text-[#8E8E93] text-sm">
                該当する生豆が見つかりません
              </div>
            ) : (
              filteredBeans.map((bean) => {
                const isSelected = bean.id === selectedBeanId;
                const weightRatio = bean.currentWeight / bean.initialWeight;
                const progressColor = 
                  bean.currentWeight === 0 ? 'bg-[#EF4444]' :
                  weightRatio < 0.25 ? 'bg-amber-600' : 'bg-[#D09B6A]';

                return (
                  <div
                    key={bean.id}
                    onClick={() => {
                      setSelectedBeanId(bean.id);
                      setIsMobileDetailOpen(true);
                    }}
                    className={`p-4 flex flex-col gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#18181B]' : 'hover:bg-[#131315]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#232326] text-[#8E8E93] px-1.5 py-0.5 rounded font-mono">
                            {bean.id}
                          </span>
                          <span className="text-xs text-[#8E8E93]">{bean.country}</span>
                        </div>
                        <h3 className="font-semibold text-sm mt-1 text-[#F4F4F6] line-clamp-1">{bean.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => handleEditClick(bean, e)} 
                          className="p-1 hover:bg-[#232326] rounded text-[#8E8E93] hover:text-[#F4F4F6] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(bean.id, e)} 
                          className="p-1 hover:bg-[#EF4444]/20 rounded text-[#8E8E93] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stock indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#8E8E93]">残り在庫</span>
                        <span className={bean.currentWeight === 0 ? 'text-[#EF4444]' : 'text-[#F4F4F6]'}>
                          {bean.currentWeight}g / {bean.initialWeight}g
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1C1C1F] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressColor} transition-all duration-300`}
                          style={{ width: `${Math.min(100, weightRatio * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10px] text-[#8E8E93]">
                      <span className="bg-[#1C1C1F] px-2 py-0.5 rounded-full">{bean.process}</span>
                      {bean.variety && <span className="bg-[#1C1C1F] px-2 py-0.5 rounded-full">{bean.variety}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Bean Detail (Desktop) */}
        <div className="hidden md:block md:w-3/5 bg-[#0E0E10]/30 h-full overflow-y-auto p-6">
          {selectedBean ? (
            <div className="space-y-6">
              {/* Main title section */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-[#D09B6A] bg-[#D09B6A]/10 px-2 py-0.5 rounded">
                      {selectedBean.id}
                    </span>
                    <span className="text-sm text-[#8E8E93]">{selectedBean.country}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#F4F4F6]">{selectedBean.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] block">現在の残量</span>
                  <span className="text-3xl font-extrabold text-[#D09B6A] font-mono">
                    {selectedBean.currentWeight}
                    <span className="text-sm font-normal text-[#8E8E93] ml-1">g</span>
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">地域 / 農園</span>
                  <p className="text-sm font-semibold truncate text-[#E4E4E7]">
                    {selectedBean.region || '-'} {selectedBean.farm ? `/ ${selectedBean.farm}` : ''}
                  </p>
                </div>
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">精製方法</span>
                  <p className="text-sm font-semibold text-[#E4E4E7]">{selectedBean.process}</p>
                </div>
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">品種</span>
                  <p className="text-sm font-semibold text-[#E4E4E7]">{selectedBean.variety || '-'}</p>
                </div>
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">標高</span>
                  <p className="text-sm font-semibold font-mono text-[#E4E4E7]">
                    {selectedBean.altitude ? `${selectedBean.altitude}m` : '-'}
                  </p>
                </div>
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">クロップ年度</span>
                  <p className="text-sm font-semibold font-mono text-[#E4E4E7]">{selectedBean.cropYear || '-'}</p>
                </div>
                <div className="bg-[#131315] p-3 rounded-lg border border-[#232326]">
                  <span className="text-[10px] text-[#8E8E93] block mb-1">推奨焙煎度</span>
                  <p className="text-sm font-semibold text-[#D09B6A]">{selectedBean.recommendedRoastDegree || '-'}</p>
                </div>
              </div>

              {/* Purchase Details */}
              <div className="bg-[#131315]/50 border border-[#232326] rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[#8E8E93] block mb-0.5">購入店</span>
                  <span className="font-medium text-[#E4E4E7]">{selectedBean.purchaseShop || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-[#8E8E93] block mb-0.5">購入日</span>
                  <span className="font-mono font-medium text-[#E4E4E7]">{selectedBean.purchaseDate}</span>
                </div>
                <div>
                  <span className="text-xs text-[#8E8E93] block mb-0.5">購入価格</span>
                  <span className="font-mono font-medium text-[#E4E4E7]">
                    {selectedBean.purchasePrice ? `¥${selectedBean.purchasePrice.toLocaleString()}` : '-'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedBean.notes && (
                <div className="bg-[#131315] p-4 rounded-xl border border-[#232326] space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">生豆メモ</h4>
                  <p className="text-sm leading-relaxed text-[#E4E4E7] whitespace-pre-wrap">{selectedBean.notes}</p>
                </div>
              )}

              {/* Roast History for this bean */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">この生豆の焙煎履歴</h4>
                  <span className="text-xs text-[#8E8E93]">{selectedBeanRoasts.length} 回の焙煎</span>
                </div>
                {selectedBeanRoasts.length === 0 ? (
                  <div className="border border-dashed border-[#232326] rounded-xl p-6 text-center text-sm text-[#8E8E93]">
                    まだこの豆での焙煎記録はありません。
                    <Link
                      href={`/roasts/new?beanId=${selectedBean.id}`}
                      className="block mt-2 text-[#D09B6A] hover:underline"
                    >
                      最初の焙煎を登録 ➔
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedBeanRoasts.map(roast => (
                      <Link
                        key={roast.id}
                        href={`/roasts/${roast.id}`}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#232326] bg-[#131315] hover:bg-[#1E1E22] transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[#8E8E93]">{roast.id}</span>
                            <span className="text-[10px] bg-[#1E1E22] text-[#A1A1AA] px-1.5 py-0.5 rounded uppercase font-mono">
                              {roast.status}
                            </span>
                            <span className="text-xs text-[#8E8E93]">{roast.roastDate}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-[#A1A1AA]">
                            <span>投入: <strong className="font-mono text-[#F4F4F6]">{roast.greenWeight}g</strong></span>
                            <span>減少率: <strong className="font-mono text-[#F4F4F6]">{roast.lossRatio}%</strong></span>
                            <span>Dev比率: <strong className="font-mono text-[#F4F4F6]">{roast.developmentRatio}%</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#8E8E93] group-hover:text-[#D09B6A] transition-colors">
                          <span className="text-xs font-semibold">詳細を見る</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8E8E93] text-sm">
              生豆を選択すると詳細が表示されます
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Detail view overlay */}
      {isMobileDetailOpen && selectedBean && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0B0B0C] flex flex-col h-full">
          <div className="border-b border-[#232326] bg-[#0E0E10] px-4 py-4 flex items-center justify-between">
            <h2 className="font-bold text-base">生豆詳細: {selectedBean.id}</h2>
            <button
              onClick={() => setIsMobileDetailOpen(false)}
              className="py-1 px-3 rounded bg-[#1C1C1F] text-xs text-[#F4F4F6]"
            >
              閉じる
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
            {/* Same detail fields inside drawer */}
            <div>
              <span className="text-xs text-[#8E8E93]">{selectedBean.country}</span>
              <h1 className="text-xl font-bold mt-0.5">{selectedBean.name}</h1>
              <div className="mt-3 flex justify-between items-center bg-[#131315] p-3 rounded-lg border border-[#232326]">
                <span className="text-xs text-[#8E8E93]">残り在庫</span>
                <span className="text-lg font-bold font-mono text-[#D09B6A]">{selectedBean.currentWeight}g / {selectedBean.initialWeight}g</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-sm">
              <div className="bg-[#131315] p-2.5 rounded border border-[#232326]">
                <span className="text-[10px] text-[#8E8E93] block">精製方法</span>
                <span className="font-medium text-[#E4E4E7]">{selectedBean.process}</span>
              </div>
              <div className="bg-[#131315] p-2.5 rounded border border-[#232326]">
                <span className="text-[10px] text-[#8E8E93] block">品種</span>
                <span className="font-medium text-[#E4E4E7]">{selectedBean.variety || '-'}</span>
              </div>
              <div className="bg-[#131315] p-2.5 rounded border border-[#232326]">
                <span className="text-[10px] text-[#8E8E93] block">標高</span>
                <span className="font-medium text-[#E4E4E7]">{selectedBean.altitude ? `${selectedBean.altitude}m` : '-'}</span>
              </div>
              <div className="bg-[#131315] p-2.5 rounded border border-[#232326]">
                <span className="text-[10px] text-[#8E8E93] block">クロップ</span>
                <span className="font-medium text-[#E4E4E7]">{selectedBean.cropYear || '-'}</span>
              </div>
            </div>

            {selectedBean.notes && (
              <div className="bg-[#131315] p-3 rounded border border-[#232326]">
                <span className="text-xs text-[#8E8E93] block mb-1">メモ</span>
                <p className="text-sm whitespace-pre-wrap text-[#E4E4E7]">{selectedBean.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">焙煎履歴 ({selectedBeanRoasts.length})</h3>
              {selectedBeanRoasts.map(roast => (
                <Link
                  key={roast.id}
                  href={`/roasts/${roast.id}`}
                  className="block p-3 rounded border border-[#232326] bg-[#131315] active:bg-[#1E1E22]"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[#D09B6A]">{roast.id}</span>
                    <span className="text-[#8E8E93]">{roast.roastDate}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[#8E8E93]">
                    <span>投入: {roast.greenWeight}g</span>
                    <span>減少: {roast.lossRatio}%</span>
                    <span>Dev: {roast.developmentRatio}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form for Add / Edit */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBean(null);
        }}
        title={editingBean ? '生豆データを編集' : '新しい生豆を登録'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93]">豆名 <span className="text-[#EF4444]">*</span></label>
            <input
              type="text"
              placeholder="例: Sigri Estate Peaberry"
              {...register('name')}
              className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
            />
            {errors.name && <p className="text-xs text-[#EF4444] mt-0.5">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">生産国 <span className="text-[#EF4444]">*</span></label>
              <input
                type="text"
                placeholder="例: パプアニューギニア"
                {...register('country')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              />
              {errors.country && <p className="text-xs text-[#EF4444] mt-0.5">{errors.country.message}</p>}
              
              {/* Quick Country chips */}
              {!watch('country') && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {countryChips.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('country', c)}
                      className="text-[10px] bg-[#1C1C1F] hover:bg-[#232326] px-1.5 py-0.5 rounded text-[#8E8E93] cursor-pointer"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">地域 / 農園</label>
              <input
                type="text"
                placeholder="例: Wahgi Valley"
                {...register('region')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">精製方法 <span className="text-[#EF4444]">*</span></label>
              <select
                {...register('process')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              >
                {processChips.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">品種</label>
              <input
                type="text"
                placeholder="例: Typica"
                {...register('variety')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              />
              {!watch('variety') && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {varietyChips.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue('variety', v)}
                      className="text-[10px] bg-[#1C1C1F] hover:bg-[#232326] px-1.5 py-0.5 rounded text-[#8E8E93] cursor-pointer"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">標高 (m)</label>
              <input
                type="number"
                placeholder="例: 1600"
                {...register('altitude')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">クロップ年度</label>
              <input
                type="text"
                placeholder="例: 2025"
                {...register('cropYear')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">推奨焙煎度</label>
              <select
                {...register('recommendedRoastDegree')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              >
                <option value="Light">Light</option>
                <option value="Medium-Light">Medium-Light</option>
                <option value="Medium">Medium</option>
                <option value="Medium-Dark">Medium-Dark</option>
                <option value="Dark">Dark</option>
              </select>
            </div>
          </div>

          <div className="border-t border-[#232326] my-4 pt-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">購入店</label>
              <input
                type="text"
                placeholder="例: Green Coffee Shop"
                {...register('purchaseShop')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">購入日 <span className="text-[#EF4444]">*</span></label>
              <input
                type="date"
                {...register('purchaseDate')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">購入価格 (円)</label>
              <input
                type="number"
                placeholder="例: 2500"
                {...register('purchasePrice')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8E8E93]">内容量 (g) <span className="text-[#EF4444]">*</span></label>
              <input
                type="number"
                placeholder="例: 500"
                {...register('initialWeight')}
                className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] font-mono"
              />
              {errors.initialWeight && <p className="text-xs text-[#EF4444] mt-0.5">{errors.initialWeight.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8E8E93]">メモ</label>
            <textarea
              rows={3}
              placeholder="生豆の特徴や焙煎の目標など..."
              {...register('notes')}
              className="w-full bg-[#1A1A1E] border border-[#232326] rounded-lg px-3 py-2 text-sm text-[#F4F4F6] resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#232326]">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingBean(null);
              }}
              className="px-4 py-2 rounded-lg bg-[#1C1C1F] hover:bg-[#232326] text-sm text-[#8E8E93] hover:text-[#F4F4F6] cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-sm cursor-pointer"
            >
              {editingBean ? '変更を保存' : '登録する'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
