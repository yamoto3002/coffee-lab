'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Edit2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { DBService, getAgingDays, getYearsSince } from '@/lib/db';
import { formatDate, todayDateString } from '@/lib/date';
import { Bean, Roast } from '@/types';

type BeanFormValues = {
  name: string;
  country: string;
  region: string;
  farm: string;
  producer: string;
  altitude: string;
  variety: string;
  process: string;
  customProcess: string;
  cropYear: string;
  purchaseShop: string;
  purchaseDate: string;
  purchasePrice: string;
  initialWeight: string;
  weightLossPercentage: string;
  themeColor: string;
  notes: string;
};

const PROCESS_OPTIONS = [
  'Natural',
  'Washed',
  'Honey',
  'Pulped Natural',
  'Semi Washed',
  'Wet Hulled',
  'Anaerobic',
  'Anaerobic Natural',
  'Anaerobic Washed',
  'Carbonic Maceration',
  'Double Fermentation',
  'Extended Fermentation',
  'Thermal Shock',
  'Koji Fermentation',
  'Yeast Fermentation',
  'Winey',
  'Decaf',
  'Experimental',
  'Other',
];

const COUNTRY_FLAGS: Record<string, string> = {
  ethiopia: '🇪🇹',
  kenya: '🇰🇪',
  colombia: '🇨🇴',
  brazil: '🇧🇷',
  guatemala: '🇬🇹',
  panama: '🇵🇦',
  costa: '🇨🇷',
  peru: '🇵🇪',
  indonesia: '🇮🇩',
  rwanda: '🇷🇼',
  burundi: '🇧🇮',
  honduras: '🇭🇳',
  mexico: '🇲🇽',
};

const emptyForm = (): BeanFormValues => ({
  name: '',
  country: '',
  region: '',
  farm: '',
  producer: '',
  altitude: '',
  variety: '',
  process: 'Washed',
  customProcess: '',
  cropYear: '',
  purchaseShop: '',
  purchaseDate: todayDateString(),
  purchasePrice: '',
  initialWeight: '250',
  weightLossPercentage: '15',
  themeColor: '#00DFFF',
  notes: '',
});

function numberValue(value: string, fallback = 0) {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function flagForCountry(country: string) {
  const lower = country.toLowerCase();
  const key = Object.keys(COUNTRY_FLAGS).find(item => lower.includes(item));
  return key ? COUNTRY_FLAGS[key] : '';
}

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>(() => DBService.getBeans());
  const [roasts, setRoasts] = useState<Roast[]>(() => DBService.getRoasts());
  const [selectedBeanId, setSelectedBeanId] = useState<string | null>(() => DBService.getBeans()[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  const [form, setForm] = useState<BeanFormValues>(emptyForm());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'error'>('synced');
  const [syncMessage, setSyncMessage] = useState('ローカル準備完了');
  const [pendingCount, setPendingCount] = useState(() => DBService.getPendingSyncCount());

  const loadLocalData = useCallback(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setRoasts(DBService.getRoasts());
    setPendingCount(DBService.getPendingSyncCount());
    setSelectedBeanId(current => current && allBeans.some(bean => bean.id === current) ? current : allBeans[0]?.id ?? null);
  }, []);

  const syncFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('同期中');
    const result = await DBService.syncFromCloud();
    loadLocalData();
    if (result.ok) {
      setSyncStatus('synced');
      setSyncMessage(`同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`);
    } else if (result.pending) {
      setSyncStatus('pending');
      setSyncMessage(result.error || '未同期データがあります。');
    } else {
      setSyncStatus('error');
      setSyncMessage(result.error || 'Google Sheetsとの同期に失敗しました。');
    }
  }, [loadLocalData]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void syncFromCloud(), 0);
    const timer = window.setInterval(() => void syncFromCloud(), 60000);
    window.addEventListener('online', syncFromCloud);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener('online', syncFromCloud);
    };
  }, [syncFromCloud]);

  const selectedBean = beans.find(bean => bean.id === selectedBeanId) ?? null;
  const selectedBeanRoasts = roasts.filter(roast => roast.beanId === selectedBeanId);

  const filteredBeans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return beans;
    return beans.filter(bean =>
      [bean.name, bean.country, bean.region, bean.process, bean.variety, bean.cropYear]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [beans, searchQuery]);

  const openAddModal = () => {
    setEditingBean(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEditModal = (bean: Bean) => {
    setEditingBean(bean);
    setForm({
      name: bean.name,
      country: bean.country,
      region: bean.region,
      farm: bean.farm,
      producer: bean.producer,
      altitude: bean.altitude ? String(bean.altitude) : '',
      variety: bean.variety,
      process: PROCESS_OPTIONS.includes(bean.process) ? bean.process : 'Other',
      customProcess: PROCESS_OPTIONS.includes(bean.process) ? '' : bean.process,
      cropYear: bean.cropYear,
      purchaseShop: bean.purchaseShop,
      purchaseDate: bean.purchaseDate,
      purchasePrice: bean.purchasePrice ? String(bean.purchasePrice) : '',
      initialWeight: String(bean.initialWeight || ''),
      weightLossPercentage: String(bean.weightLossPercentage ?? 15),
      themeColor: bean.themeColor || '#00DFFF',
      notes: bean.notes,
    });
    setIsModalOpen(true);
  };

  const updateForm = (key: keyof BeanFormValues, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const initialWeight = numberValue(form.initialWeight);
    if (!form.name.trim() || !form.country.trim() || !form.purchaseDate || initialWeight <= 0) {
      alert('生豆名、国、購入日、購入量を入力してください。');
      return;
    }

    const process = form.process === 'Other' ? form.customProcess.trim() || 'Other' : form.process;
    const bean: Bean = {
      id: editingBean?.id ?? DBService.generateNextBeanId(),
      name: form.name.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      farm: form.farm.trim(),
      producer: form.producer.trim(),
      altitude: numberValue(form.altitude),
      variety: form.variety.trim(),
      process,
      cropYear: form.cropYear.trim(),
      purchaseShop: form.purchaseShop.trim(),
      purchaseDate: form.purchaseDate,
      purchasePrice: numberValue(form.purchasePrice),
      initialWeight,
      currentWeight: initialWeight,
      weightLossPercentage: numberValue(form.weightLossPercentage, 15),
      themeColor: form.themeColor,
      notes: form.notes.trim(),
      photoUrl: editingBean?.photoUrl || '',
      createdAt: editingBean?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DBService.saveBean(bean, false);
    loadLocalData();
    setSelectedBeanId(bean.id);
    setIsModalOpen(false);
    setEditingBean(null);
    setSyncStatus('syncing');
    setSyncMessage('ローカル保存済み。Google Sheetsへ同期中です。');

    void DBService.saveBeanToCloud(bean).then(result => {
      setPendingCount(DBService.getPendingSyncCount());
      if (result.ok) {
        setSyncStatus('synced');
        setSyncMessage('Google Sheetsへ保存済み');
      } else {
        setSyncStatus('pending');
        setSyncMessage(result.error || 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。');
      }
    });
  };

  const deleteBean = (bean: Bean) => {
    if (!confirm(`${bean.name} を削除しますか？焙煎履歴は残ります。`)) return;
    DBService.deleteBean(bean.id, false);
    loadLocalData();
    setSyncStatus('syncing');
    setSyncMessage('ローカルで削除しました。Google Sheetsへ同期中です。');
    void DBService.deleteBeanFromCloud(bean.id).then(result => {
      setPendingCount(DBService.getPendingSyncCount());
      if (result.ok) {
        setSyncStatus('synced');
        setSyncMessage('Google Sheetsから削除済み');
      } else {
        setSyncStatus('pending');
        setSyncMessage(result.error || 'Google Sheetsとの同期に失敗しました。バックグラウンドで再試行します。');
      }
    });
  };

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-white/10 bg-[#080E14]/95 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">生豆管理</h1>
          <p className="text-xs text-slate-400">購入日、購入量、テーマカラーをGoogle Sheetsと同期</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncPill status={syncStatus} message={syncMessage} pendingCount={pendingCount} />
          <button type="button" onClick={syncFromCloud} className="tap-button rounded-xl bg-white/[0.06] p-2 text-slate-300 hover:text-white" aria-label="再同期">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={openAddModal} className="tap-button flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-[#080E14]">
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(300px,38%)_1fr]">
        <section className="border-r border-white/10 bg-[#080E14]">
          <div className="border-b border-white/10 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="生豆名、国、精製方法で検索"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#101827] py-2.5 pl-9 pr-4 text-sm text-[#F4F4F6] placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-154px)] overflow-y-auto divide-y divide-white/10">
            {filteredBeans.map(bean => {
              const selected = bean.id === selectedBeanId;
              const color = bean.themeColor || '#00DFFF';
              return (
                <button key={bean.id} type="button" onClick={() => setSelectedBeanId(bean.id)} style={{ borderLeftColor: color }} className={`tap-button block w-full border-l-4 p-4 text-left ${selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.035]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{bean.id}</span>
                        <span className="truncate text-xs text-slate-400">{flagForCountry(bean.country)} {bean.country}</span>
                      </div>
                      <h2 className="mt-1 truncate text-sm font-semibold text-[#F4F4F6]">{bean.name}</h2>
                      <p className="mt-1 truncate text-xs text-slate-500">{bean.process || '-'} / {bean.region || '-'}</p>
                    </div>
                    <span className="shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold" style={{ backgroundColor: `${color}22`, color }}>{bean.initialWeight}g</span>
                  </div>
                </button>
              );
            })}
            {filteredBeans.length === 0 && <div className="p-10 text-center text-sm text-slate-500">生豆がありません。</div>}
          </div>
        </section>

        <section className="overflow-y-auto p-4 md:p-6">
          {selectedBean ? (
            <BeanDetail
              bean={selectedBean}
              roasts={selectedBeanRoasts}
              onEdit={() => openEditModal(selectedBean)}
              onDelete={() => deleteBean(selectedBean)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">生豆を選択してください</div>
          )}
        </section>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBean ? '生豆を編集' : '生豆を追加'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="生豆名" required value={form.name} onChange={value => updateForm('name', value)} placeholder="Chelbesa G1" />
            <Field label="生産国" required value={form.country} onChange={value => updateForm('country', value)} placeholder="Ethiopia" />
            <Field label="地域" value={form.region} onChange={value => updateForm('region', value)} placeholder="Yirgacheffe" />
            <Field label="農園 / Station" value={form.farm} onChange={value => updateForm('farm', value)} />
            <Field label="生産者" value={form.producer} onChange={value => updateForm('producer', value)} />
            <Field label="品種" value={form.variety} onChange={value => updateForm('variety', value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="精製" value={form.process} options={PROCESS_OPTIONS} onChange={value => updateForm('process', value)} />
            {form.process === 'Other' && <Field label="精製方法" value={form.customProcess} onChange={value => updateForm('customProcess', value)} />}
            <Field label="標高(m)" type="number" inputMode="numeric" value={form.altitude} onChange={value => updateForm('altitude', value)} />
            <Field label="クロップ年" type="number" inputMode="numeric" value={form.cropYear} onChange={value => updateForm('cropYear', value)} placeholder="2024" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="購入店" value={form.purchaseShop} onChange={value => updateForm('purchaseShop', value)} />
            <Field label="購入日" required type="date" value={form.purchaseDate} onChange={value => updateForm('purchaseDate', value)} />
            <Field label="購入価格(円)" type="number" inputMode="numeric" value={form.purchasePrice} onChange={value => updateForm('purchasePrice', value)} />
            <Field label="購入量(g)" required type="number" inputMode="decimal" value={form.initialWeight} onChange={value => updateForm('initialWeight', value)} />
            <Field label="想定Loss(%)" required type="number" inputMode="decimal" step="0.1" value={form.weightLossPercentage} onChange={value => updateForm('weightLossPercentage', value)} />
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-400">テーマカラー</span>
              <input type="color" value={form.themeColor} onChange={event => updateForm('themeColor', event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-2 py-1" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-400">メモ</span>
            <textarea value={form.notes} onChange={event => updateForm('notes', event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-[#F4F4F6]" />
          </label>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="tap-button rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-slate-200">キャンセル</button>
            <button type="submit" className="tap-button rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-[#080E14]">保存</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function BeanDetail({ bean, roasts, onEdit, onDelete }: { bean: Bean; roasts: Roast[]; onEdit: () => void; onDelete: () => void }) {
  const purchaseAge = getAgingDays(bean.purchaseDate);
  const cropAge = getYearsSince(bean.cropYear);
  const color = bean.themeColor || '#00DFFF';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-white/10 px-2 py-1 font-mono text-xs text-cyan-100">{bean.id}</span>
            <span className="text-sm text-slate-400">{flagForCountry(bean.country)} {bean.country}</span>
          </div>
          <h2 className="break-words text-2xl font-bold">{bean.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{bean.region || '-'} {bean.farm ? `/ ${bean.farm}` : ''}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="tap-button rounded-lg bg-white/[0.06] p-2 text-slate-300 hover:text-white" aria-label="編集">
            <Edit2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="tap-button rounded-lg bg-white/[0.06] p-2 text-slate-300 hover:text-red-300" aria-label="削除">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="購入量" value={`${bean.initialWeight}g`} color={color} />
        <Metric label="想定Loss" value={`${bean.weightLossPercentage}%`} color="#FF8A3D" />
        <Metric label="購入から" value={bean.purchaseDate ? `${Math.max(0, purchaseAge)}日` : '-'} color="#00DFFF" />
        <Metric label="クロップ" value={bean.cropYear ? `Crop ${bean.cropYear}${cropAge !== null ? ` / 約${cropAge}年` : ''}` : '-'} color="#8B5CF6" />
      </div>

      <div className="lab-card-soft grid gap-3 rounded-xl p-4 text-sm md:grid-cols-3">
        <Info label="精製" value={bean.process || '-'} />
        <Info label="品種" value={bean.variety || '-'} />
        <Info label="標高" value={bean.altitude ? `${bean.altitude}m` : '-'} />
        <Info label="購入日" value={formatDate(bean.purchaseDate)} />
        <Info label="購入店" value={bean.purchaseShop || '-'} />
        <Info label="購入価格" value={bean.purchasePrice ? `¥${bean.purchasePrice.toLocaleString()}` : '-'} />
        <Info label="生産者" value={bean.producer || '-'} />
      </div>

      {bean.notes && (
        <div className="lab-card-soft rounded-xl p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">メモ</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{bean.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">この豆の焙煎履歴</h3>
          <Link href={`/roasts/new?beanId=${bean.id}`} className="tap-button rounded-full bg-cyan-300 px-3 py-1.5 text-sm font-bold text-[#080E14]">焙煎する</Link>
        </div>
        {roasts.map(roast => (
          <Link key={roast.id} href={`/roasts/${roast.id}`} className="tap-button flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-cyan-100">{roast.id}</span>
                <span>{formatDate(roast.roastDate)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>投入 <strong className="font-mono text-[#F4F4F6]">{roast.greenWeight}g</strong></span>
                <span>焙煎後 <strong className="font-mono text-[#F4F4F6]">{roast.roastedWeight}g</strong></span>
                <span>Dev <strong className="font-mono text-[#F4F4F6]">{roast.developmentRatio === null ? '不明' : `${roast.developmentRatio}%`}</strong></span>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        ))}
        {roasts.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">まだ焙煎履歴がありません</div>}
      </div>
    </div>
  );
}

function SyncPill({ status, message, pendingCount }: { status: 'synced' | 'syncing' | 'pending' | 'error'; message: string; pendingCount: number }) {
  const color = status === 'synced' ? 'text-emerald-200 bg-emerald-400/10 border-emerald-300/20'
    : status === 'syncing' ? 'text-cyan-100 bg-cyan-300/10 border-cyan-300/20'
      : status === 'pending' ? 'text-amber-200 bg-amber-400/10 border-amber-300/20'
        : 'text-red-200 bg-red-400/10 border-red-300/20';
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${color}`}>
      {message}{pendingCount > 0 ? ` / 未同期 ${pendingCount}` : ''}
    </span>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="lab-card-soft min-w-0 rounded-xl p-4">
      <span className="block text-xs text-slate-500">{label}</span>
      <strong className="mt-1 block break-words font-mono text-lg" style={{ color }}>{value}</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="break-words font-medium text-slate-200">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required = false, step, inputMode }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-400">{label} {required && <span className="text-red-300">*</span>}</span>
      <input type={type} step={step} inputMode={inputMode} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-[#F4F4F6]" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#101827] px-3 py-2 text-sm text-[#F4F4F6]">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
