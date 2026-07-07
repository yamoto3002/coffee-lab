'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Edit2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { DBService, getAgingDays, getYearsSince } from '@/lib/db';
import { AppSettings, Bean, Roast } from '@/types';

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
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: '',
  initialWeight: '250',
  weightLossPercentage: '15',
  notes: '',
});

function numberValue(value: string, fallback = 0) {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>(() => DBService.getBeans());
  const [roasts, setRoasts] = useState<Roast[]>(() => DBService.getRoasts());
  const [settings, setSettings] = useState<AppSettings>(() => DBService.getSettings());
  const [selectedBeanId, setSelectedBeanId] = useState<string | null>(() => DBService.getBeans()[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  const [form, setForm] = useState<BeanFormValues>(emptyForm());
  const [syncStatus, setSyncStatus] = useState('ローカル準備完了');
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => DBService.getPendingSyncCount());

  const loadLocalData = useCallback(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setRoasts(DBService.getRoasts());
    setSettings(DBService.getSettings());
    setPendingCount(DBService.getPendingSyncCount());
    setSelectedBeanId(current => current && allBeans.some(bean => bean.id === current) ? current : allBeans[0]?.id ?? null);
  }, []);

  const syncFromCloud = useCallback(async () => {
    const result = await DBService.syncFromCloud();
    if (result.ok) {
      loadLocalData();
      setSyncError('');
      setSyncStatus(`同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`);
      return;
    }
    setPendingCount(DBService.getPendingSyncCount());
    if (result.pending) {
      setSyncStatus('未同期の変更があります');
      setSyncError(result.error || 'Google Sheetsへの保存待ちです。');
    } else {
      setSyncStatus('同期エラー');
      setSyncError(result.error || 'Google Sheetsからの読み込みに失敗しました。');
    }
  }, [loadLocalData]);

  useEffect(() => {
    void syncFromCloud();
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
      notes: bean.notes,
    });
    setIsModalOpen(true);
  };

  const updateForm = (key: keyof BeanFormValues, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const initialWeight = numberValue(form.initialWeight);
    if (!form.name.trim() || !form.country.trim() || !form.purchaseDate || initialWeight <= 0) {
      alert('生豆名、生産国、購入日、内容量を入力してください。');
      return;
    }

    const process = form.process === 'Other' ? form.customProcess.trim() || 'Other' : form.process;
    const currentWeight = editingBean
      ? Math.max(0, editingBean.currentWeight + (initialWeight - editingBean.initialWeight))
      : initialWeight;

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
      currentWeight,
      weightLossPercentage: numberValue(form.weightLossPercentage, 15),
      notes: form.notes.trim(),
      photoUrl: editingBean?.photoUrl || '',
      createdAt: editingBean?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setSyncError('');
    DBService.saveBean(bean, false);
    loadLocalData();
    setSelectedBeanId(bean.id);
    setSyncStatus('保存しました。Google Sheetsへ同期中');

    const result = await DBService.saveBeanToCloud(bean);
    setIsSaving(false);
    setPendingCount(DBService.getPendingSyncCount());

    if (result.ok) {
      setIsModalOpen(false);
      setEditingBean(null);
      setSyncStatus('Google Sheetsへ保存済み');
      setSyncError('');
      return;
    }

    setSyncStatus('保存失敗（ローカルには保持）');
    setSyncError(result.error || 'Google Sheetsへの保存に失敗しました。未同期データとして保持しています。');
  };

  const deleteBean = async (bean: Bean) => {
    if (!confirm(`${bean.name} を削除しますか？焙煎履歴は残ります。`)) return;
    setSyncError('');
    DBService.deleteBean(bean.id, false);
    loadLocalData();
    setSyncStatus('削除しました。Google Sheetsへ同期中');
    const result = await DBService.deleteBeanFromCloud(bean.id);
    setPendingCount(DBService.getPendingSyncCount());
    if (result.ok) setSyncStatus('Google Sheetsから削除済み');
    else {
      setSyncStatus('削除同期失敗（ローカルには反映済み）');
      setSyncError(result.error || 'Google Sheetsへの削除同期に失敗しました。');
    }
  };

  const retryPendingSync = async () => {
    setSyncStatus('未同期データを再送中');
    const result = await DBService.retryPendingSync();
    setPendingCount(DBService.getPendingSyncCount());
    if (result.ok) {
      setSyncError('');
      setSyncStatus('未同期データを再送しました');
    } else {
      setSyncStatus('再送失敗');
      setSyncError(result.error || 'Google Sheetsへの再送に失敗しました。');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0C] text-[#F4F4F6]">
      <header className="flex items-center justify-between border-b border-[#232326] bg-[#0E0E10] px-4 py-4 md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">生豆管理</h1>
          <p className="text-xs text-[#8E8E93]">在庫、購入情報、精製方法をGoogle Sheetsと同期</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[#8E8E93] md:inline">{syncStatus}</span>
          {pendingCount > 0 && (
            <button type="button" onClick={retryPendingSync} className="rounded-lg border border-[#D09B6A]/40 px-3 py-2 text-xs font-semibold text-[#D09B6A]">
              未同期を再送
            </button>
          )}
          <button type="button" onClick={syncFromCloud} className="rounded-lg bg-[#1C1C1F] p-2 text-[#8E8E93] hover:text-[#F4F4F6]" aria-label="再同期">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C]">
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
      </header>

      {syncError && <div className="border-b border-[#7F1D1D] bg-[#450A0A] px-4 py-3 text-sm text-red-100 md:px-6">{syncError}</div>}

      <main className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(320px,40%)_1fr]">
        <section className="border-r border-[#232326] bg-[#0B0B0C]">
          <div className="border-b border-[#232326] p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#8E8E93]" />
              <input
                type="text"
                placeholder="生豆名、国、精製方法で検索"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-[#232326] bg-[#131315] py-2.5 pl-9 pr-4 text-sm text-[#F4F4F6] placeholder:text-[#8E8E93]"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-138px)] overflow-y-auto divide-y divide-[#232326]">
            {filteredBeans.map(bean => {
              const selected = bean.id === selectedBeanId;
              const ratio = bean.initialWeight > 0 ? bean.currentWeight / bean.initialWeight : 0;
              return (
                <button key={bean.id} type="button" onClick={() => setSelectedBeanId(bean.id)} className={`block w-full p-4 text-left transition ${selected ? 'bg-[#18181B]' : 'hover:bg-[#131315]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#232326] px-1.5 py-0.5 font-mono text-[10px] text-[#8E8E93]">{bean.id}</span>
                        <span className="text-xs text-[#8E8E93]">{bean.country}</span>
                      </div>
                      <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-[#F4F4F6]">{bean.name}</h2>
                      {settings.showProcess && <p className="mt-1 text-xs text-[#8E8E93]">{bean.process}</p>}
                    </div>
                    <span className="rounded-md bg-[#D09B6A]/10 px-2 py-1 font-mono text-xs font-bold text-[#D09B6A]">-{bean.weightLossPercentage}%</span>
                  </div>
                  {settings.showStock && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between font-mono text-xs">
                        <span className="text-[#8E8E93]">在庫</span>
                        <span>{bean.currentWeight}g / {bean.initialWeight}g</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1C1C1F]">
                        <div className="h-full bg-[#D09B6A]" style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
            {filteredBeans.length === 0 && <div className="p-10 text-center text-sm text-[#8E8E93]">まだ生豆がありません。最初の豆を登録しましょう。</div>}
          </div>
        </section>

        <section className="overflow-y-auto p-4 md:p-6">
          {selectedBean ? (
            <BeanDetail
              bean={selectedBean}
              roasts={selectedBeanRoasts}
              settings={settings}
              onEdit={() => openEditModal(selectedBean)}
              onDelete={() => deleteBean(selectedBean)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8E8E93]">生豆を選択してください</div>
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
            {form.process === 'Other' && <Field label="精製方法（自由入力）" value={form.customProcess} onChange={value => updateForm('customProcess', value)} />}
            <Field label="標高(m)" type="number" inputMode="numeric" value={form.altitude} onChange={value => updateForm('altitude', value)} />
            <Field label="クロップ年" type="number" inputMode="numeric" value={form.cropYear} onChange={value => updateForm('cropYear', value)} placeholder="2024" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="購入店" value={form.purchaseShop} onChange={value => updateForm('purchaseShop', value)} />
            <Field label="購入日" required type="date" value={form.purchaseDate} onChange={value => updateForm('purchaseDate', value)} />
            <Field label="購入価格(円)" type="number" inputMode="numeric" value={form.purchasePrice} onChange={value => updateForm('purchasePrice', value)} />
            <Field label="内容量(g)" required type="number" inputMode="decimal" value={form.initialWeight} onChange={value => updateForm('initialWeight', value)} />
            <Field label="減耗率(%)" required type="number" inputMode="decimal" step="0.1" value={form.weightLossPercentage} onChange={value => updateForm('weightLossPercentage', value)} />
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[#8E8E93]">メモ</span>
            <textarea value={form.notes} onChange={event => updateForm('notes', event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm text-[#F4F4F6]" />
          </label>

          <div className="flex justify-end gap-3 border-t border-[#232326] pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg bg-[#1C1C1F] px-4 py-2 text-sm text-[#E4E4E7]">キャンセル</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-bold text-[#0B0B0C] disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function BeanDetail({ bean, roasts, settings, onEdit, onDelete }: { bean: Bean; roasts: Roast[]; settings: AppSettings; onEdit: () => void; onDelete: () => void }) {
  const purchaseAge = getAgingDays(bean.purchaseDate);
  const cropAge = getYearsSince(bean.cropYear);
  const stockRatio = bean.initialWeight > 0 ? bean.currentWeight / bean.initialWeight : 0;
  const freshness = cropAge !== null && cropAge >= 3 ? '長期保管注意' : stockRatio < 0.25 ? 'そろそろ使い切りたい' : '良好';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-[#D09B6A]/10 px-2 py-1 font-mono text-xs text-[#D09B6A]">{bean.id}</span>
            <span className="text-sm text-[#8E8E93]">{bean.country}</span>
          </div>
          <h2 className="text-2xl font-bold">{bean.name}</h2>
          <p className="mt-1 text-sm text-[#8E8E93]">{bean.region || '-'} {bean.farm ? `/ ${bean.farm}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onEdit} className="rounded-lg bg-[#1C1C1F] p-2 text-[#8E8E93] hover:text-[#F4F4F6]" aria-label="編集">
            <Edit2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg bg-[#1C1C1F] p-2 text-[#8E8E93] hover:text-[#EF4444]" aria-label="削除">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="現在在庫" value={`${bean.currentWeight}g`} />
        <Metric label="購入量" value={`${bean.initialWeight}g`} />
        <Metric label="減耗率" value={`${bean.weightLossPercentage}%`} accent />
        <Metric label="鮮度メモ" value={freshness} />
      </div>

      <div className="grid gap-3 rounded-xl border border-[#232326] bg-[#131315] p-4 text-sm md:grid-cols-3">
        {settings.showProcess && <Info label="精製" value={bean.process || '-'} />}
        <Info label="品種" value={bean.variety || '-'} />
        <Info label="標高" value={bean.altitude ? `${bean.altitude}m` : '-'} />
        <Info label="購入日" value={bean.purchaseDate || '-'} />
        {settings.showPurchaseAge && <Info label="購入から" value={bean.purchaseDate ? `${Math.max(0, purchaseAge)}日` : '-'} />}
        {settings.showCropYear && <Info label="クロップ" value={bean.cropYear ? `Crop ${bean.cropYear}${cropAge !== null ? ` / 約${cropAge}年経過` : ''}` : '-'} />}
        {settings.showBeanDetails && <Info label="購入店" value={bean.purchaseShop || '-'} />}
        {settings.showBeanDetails && <Info label="購入価格" value={bean.purchasePrice ? `¥${bean.purchasePrice.toLocaleString()}` : '-'} />}
        {settings.showBeanDetails && <Info label="生産者" value={bean.producer || '-'} />}
      </div>

      {bean.notes && (
        <div className="rounded-xl border border-[#232326] bg-[#131315] p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">メモ</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#E4E4E7]">{bean.notes}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">この生豆の焙煎履歴</h3>
          <Link href={`/roasts/new?beanId=${bean.id}`} className="text-sm font-semibold text-[#D09B6A] hover:underline">焙煎する</Link>
        </div>
        {roasts.map(roast => (
          <Link key={roast.id} href={`/roasts/${roast.id}`} className="flex items-center justify-between rounded-xl border border-[#232326] bg-[#131315] p-4 transition hover:bg-[#1E1E22]">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                <span className="font-mono text-[#D09B6A]">{roast.id}</span>
                <span>{roast.roastDate}</span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-[#A1A1AA]">
                <span>投入: <strong className="font-mono text-[#F4F4F6]">{roast.greenWeight}g</strong></span>
                <span>焙煎後: <strong className="font-mono text-[#F4F4F6]">{roast.roastedWeight}g</strong></span>
                <span>Dev: <strong className="font-mono text-[#F4F4F6]">{roast.developmentRatio}%</strong></span>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-[#8E8E93]" />
          </Link>
        ))}
        {roasts.length === 0 && <div className="rounded-xl border border-dashed border-[#232326] p-8 text-center text-sm text-[#8E8E93]">まだ焙煎履歴がありません</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#232326] bg-[#131315] p-4">
      <span className="block text-xs text-[#8E8E93]">{label}</span>
      <strong className={`mt-1 block font-mono text-lg ${accent ? 'text-[#D09B6A]' : 'text-[#F4F4F6]'}`}>{value}</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-[#8E8E93]">{label}</span>
      <span className="font-medium text-[#E4E4E7]">{value}</span>
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
      <span className="text-xs font-semibold text-[#8E8E93]">{label} {required && <span className="text-[#EF4444]">*</span>}</span>
      <input type={type} step={step} inputMode={inputMode} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm text-[#F4F4F6]" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#8E8E93]">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm text-[#F4F4F6]">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
