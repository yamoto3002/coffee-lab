'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { DBService } from '@/lib/db';
import { Bean, Roast } from '@/types';

type BeanFormValues = {
  name: string;
  country: string;
  region: string;
  farm: string;
  producer: string;
  altitude: number;
  variety: string;
  process: string;
  cropYear: string;
  purchaseShop: string;
  purchaseDate: string;
  purchasePrice: number;
  initialWeight: number;
  weightLossPercentage: number;
  recommendedRoastDegree: string;
  notes: string;
};

const emptyForm = (): BeanFormValues => ({
  name: '',
  country: '',
  region: '',
  farm: '',
  producer: '',
  altitude: 0,
  variety: '',
  process: 'Washed',
  cropYear: '',
  purchaseShop: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: 0,
  initialWeight: 250,
  weightLossPercentage: 15,
  recommendedRoastDegree: 'Medium-Light',
  notes: '',
});

const processOptions = ['Washed', 'Natural', 'Honey', 'Anaerobic'];
const roastDegreeOptions = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>(() => DBService.getBeans());
  const [roasts, setRoasts] = useState<Roast[]>(() => DBService.getRoasts());
  const [selectedBeanId, setSelectedBeanId] = useState<string | null>(() => DBService.getBeans()[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  const [form, setForm] = useState<BeanFormValues>(emptyForm());
  const [syncStatus, setSyncStatus] = useState('ローカル準備完了');
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadLocalData = useCallback(() => {
    const allBeans = DBService.getBeans();
    setBeans(allBeans);
    setRoasts(DBService.getRoasts());
    setSelectedBeanId(current => current ?? allBeans[0]?.id ?? null);
  }, []);

  const syncFromCloud = useCallback(async () => {
    const result = await DBService.syncFromCloud();
    if (result.ok) {
      loadLocalData();
      setSyncError('');
      setSyncStatus(`同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`);
    } else if (result.pending) {
      setSyncStatus('未同期の変更があります');
      setSyncError(result.error || 'Googleスプレッドシートへの保存待ちです。');
    } else {
      setSyncStatus('同期エラー');
      setSyncError(result.error || 'Googleスプレッドシートからの読み込みに失敗しました。');
    }
  }, [loadLocalData]);

  useEffect(() => {
    window.setTimeout(syncFromCloud, 0);
    const timer = window.setInterval(syncFromCloud, 5000);
    return () => window.clearInterval(timer);
  }, [syncFromCloud]);

  const selectedBean = beans.find(bean => bean.id === selectedBeanId) ?? null;
  const selectedBeanRoasts = roasts.filter(roast => roast.beanId === selectedBeanId);

  const filteredBeans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return beans;
    return beans.filter(bean =>
      [bean.name, bean.country, bean.region, bean.process, bean.variety]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [beans, searchQuery]);

  const updateForm = (key: keyof BeanFormValues, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

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
      altitude: bean.altitude,
      variety: bean.variety,
      process: bean.process,
      cropYear: bean.cropYear,
      purchaseShop: bean.purchaseShop,
      purchaseDate: bean.purchaseDate,
      purchasePrice: bean.purchasePrice,
      initialWeight: bean.initialWeight,
      weightLossPercentage: bean.weightLossPercentage ?? 15,
      recommendedRoastDegree: bean.recommendedRoastDegree,
      notes: bean.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.country.trim() || !form.purchaseDate || form.initialWeight <= 0) {
      alert('生豆名、生産国、購入日、内容量を入力してください。');
      return;
    }

    const currentWeight = editingBean
      ? Math.max(0, editingBean.currentWeight + (form.initialWeight - editingBean.initialWeight))
      : form.initialWeight;

    const bean: Bean = {
      id: editingBean?.id ?? DBService.generateNextBeanId(),
      name: form.name.trim(),
      country: form.country.trim(),
      region: form.region.trim(),
      farm: form.farm.trim(),
      producer: form.producer.trim(),
      altitude: Number(form.altitude) || 0,
      variety: form.variety.trim(),
      process: form.process,
      cropYear: form.cropYear.trim(),
      purchaseShop: form.purchaseShop.trim(),
      purchaseDate: form.purchaseDate,
      purchasePrice: Number(form.purchasePrice) || 0,
      initialWeight: Number(form.initialWeight) || 0,
      currentWeight,
      weightLossPercentage: Number(form.weightLossPercentage) || 15,
      recommendedRoastDegree: form.recommendedRoastDegree,
      notes: form.notes.trim(),
      photoUrl: editingBean?.photoUrl || '',
      createdAt: editingBean?.createdAt || new Date().toISOString(),
    };

    setIsSaving(true);
    setSyncError('');
    DBService.saveBean(bean, false);
    loadLocalData();
    setSelectedBeanId(bean.id);
    setSyncStatus('保存しました。Google Sheetsへ同期中');

    const result = await DBService.saveBeanToCloud(bean);
    setIsSaving(false);

    if (result.ok) {
      setIsModalOpen(false);
      setEditingBean(null);
      setSyncStatus('Google Sheetsへ保存済み');
      setSyncError('');
      await syncFromCloud();
      return;
    }

    setSyncStatus('保存失敗（ローカルには保持）');
    setSyncError(result.error || 'Googleスプレッドシートへの保存に失敗しました。通信環境を確認してください。');
  };

  const deleteBean = async (bean: Bean) => {
    if (!confirm(`${bean.name} を削除しますか？焙煎履歴は残ります。`)) return;
    setSyncError('');
    DBService.deleteBean(bean.id, false);
    loadLocalData();
    setSelectedBeanId(null);
    setSyncStatus('削除しました。Google Sheetsへ同期中');
    const result = await DBService.deleteBeanFromCloud(bean.id);
    if (result.ok) {
      setSyncStatus('Google Sheetsから削除済み');
    } else {
      setSyncStatus('削除同期失敗（ローカルには反映済み）');
      setSyncError(result.error || 'Googleスプレッドシートへの削除同期に失敗しました。');
    }
  };

  const retryPendingSync = async () => {
    setSyncStatus('未同期データを再送中');
    const result = await DBService.retryPendingSync();
    if (result.ok) {
      setSyncError('');
      setSyncStatus('未同期データを再送しました');
      await syncFromCloud();
    } else {
      setSyncStatus('再送失敗');
      setSyncError(result.error || 'Googleスプレッドシートへの再送に失敗しました。');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0C] text-[#F4F4F6]">
      <header className="flex items-center justify-between border-b border-[#232326] bg-[#0E0E10] px-4 py-4 md:px-6">
        <div>
          <h1 className="text-xl font-bold tracking-wide">生豆管理</h1>
          <p className="text-xs text-[#8E8E93]">在庫、減耗率、焙煎履歴をGoogle Sheetsと同期</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[#8E8E93] md:inline">{syncStatus}</span>
          {DBService.getPendingSyncCount() > 0 && (
            <button type="button" onClick={retryPendingSync} className="hidden rounded-lg border border-[#D09B6A]/40 px-3 py-2 text-xs font-semibold text-[#D09B6A] md:inline">
              未同期を再送
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-[#D09B6A] px-4 py-2 text-sm font-semibold text-[#0B0B0C] transition hover:bg-[#B37B4D] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            生豆を追加
          </button>
        </div>
      </header>

      {syncError && (
        <div className="border-b border-[#7F1D1D] bg-[#450A0A] px-4 py-3 text-sm text-red-100 md:px-6">
          {syncError}
        </div>
      )}

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
                <button
                  key={bean.id}
                  type="button"
                  onClick={() => setSelectedBeanId(bean.id)}
                  className={`block w-full p-4 text-left transition ${selected ? 'bg-[#18181B]' : 'hover:bg-[#131315]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#232326] px-1.5 py-0.5 font-mono text-[10px] text-[#8E8E93]">{bean.id}</span>
                        <span className="text-xs text-[#8E8E93]">{bean.country}</span>
                      </div>
                      <h2 className="mt-1 line-clamp-1 text-sm font-semibold text-[#F4F4F6]">{bean.name}</h2>
                    </div>
                    <div className="flex gap-1">
                      <span className="rounded-md bg-[#D09B6A]/10 px-2 py-1 font-mono text-xs font-bold text-[#D09B6A]">-{bean.weightLossPercentage}%</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-[#8E8E93]">在庫</span>
                      <span>{bean.currentWeight}g / {bean.initialWeight}g</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1C1C1F]">
                      <div className="h-full bg-[#D09B6A]" style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredBeans.length === 0 && (
              <div className="p-10 text-center text-sm text-[#8E8E93]">生豆が見つかりません</div>
            )}
          </div>
        </section>

        <section className="overflow-y-auto p-4 md:p-6">
          {selectedBean ? (
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-[#D09B6A]/10 px-2 py-1 font-mono text-xs text-[#D09B6A]">{selectedBean.id}</span>
                    <span className="text-sm text-[#8E8E93]">{selectedBean.country}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{selectedBean.name}</h2>
                  <p className="mt-1 text-sm text-[#8E8E93]">{selectedBean.region || '-'} {selectedBean.farm ? `/ ${selectedBean.farm}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEditModal(selectedBean)} className="rounded-lg bg-[#1C1C1F] p-2 text-[#8E8E93] hover:text-[#F4F4F6]">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => deleteBean(selectedBean)} className="rounded-lg bg-[#1C1C1F] p-2 text-[#8E8E93] hover:text-[#EF4444]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="現在在庫" value={`${selectedBean.currentWeight}g`} />
                <Metric label="購入量" value={`${selectedBean.initialWeight}g`} />
                <Metric label="減耗率" value={`${selectedBean.weightLossPercentage}%`} accent />
                <Metric label="推奨焙煎度" value={selectedBean.recommendedRoastDegree || '-'} />
              </div>

              <div className="grid gap-3 rounded-xl border border-[#232326] bg-[#131315] p-4 text-sm md:grid-cols-3">
                <Info label="精製" value={selectedBean.process} />
                <Info label="品種" value={selectedBean.variety || '-'} />
                <Info label="標高" value={selectedBean.altitude ? `${selectedBean.altitude}m` : '-'} />
                <Info label="購入日" value={selectedBean.purchaseDate} />
                <Info label="購入店" value={selectedBean.purchaseShop || '-'} />
                <Info label="購入価格" value={selectedBean.purchasePrice ? `¥${selectedBean.purchasePrice.toLocaleString()}` : '-'} />
              </div>

              {selectedBean.notes && (
                <div className="rounded-xl border border-[#232326] bg-[#131315] p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">メモ</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#E4E4E7]">{selectedBean.notes}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">この生豆の焙煎履歴</h3>
                  <Link href={`/roasts/new?beanId=${selectedBean.id}`} className="text-sm font-semibold text-[#D09B6A] hover:underline">焙煎する</Link>
                </div>
                {selectedBeanRoasts.map(roast => (
                  <Link key={roast.id} href={`/roasts/${roast.id}`} className="flex items-center justify-between rounded-xl border border-[#232326] bg-[#131315] p-4 transition hover:bg-[#1E1E22]">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                        <span className="font-mono text-[#D09B6A]">{roast.id}</span>
                        <span>{roast.roastDate}</span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-[#A1A1AA]">
                        <span>投入: <strong className="font-mono text-[#F4F4F6]">{roast.greenWeight}g</strong></span>
                        <span>予想後: <strong className="font-mono text-[#F4F4F6]">{roast.roastedWeight}g</strong></span>
                        <span>Dev: <strong className="font-mono text-[#F4F4F6]">{roast.developmentRatio}%</strong></span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[#8E8E93]" />
                  </Link>
                ))}
                {selectedBeanRoasts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#232326] p-8 text-center text-sm text-[#8E8E93]">まだ焙煎履歴がありません</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#8E8E93]">生豆を選択してください</div>
          )}
        </section>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBean ? '生豆を編集' : '生豆を追加'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="生豆名" required value={form.name} onChange={value => updateForm('name', value)} placeholder="Sigri Estate Peaberry" />
            <Field label="生産国" required value={form.country} onChange={value => updateForm('country', value)} placeholder="Papua New Guinea" />
            <Field label="地域" value={form.region} onChange={value => updateForm('region', value)} placeholder="Wahgi Valley" />
            <Field label="農園 / Station" value={form.farm} onChange={value => updateForm('farm', value)} placeholder="Sigri Estate" />
            <Field label="生産者" value={form.producer} onChange={value => updateForm('producer', value)} placeholder="Producer" />
            <Field label="品種" value={form.variety} onChange={value => updateForm('variety', value)} placeholder="Typica" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="精製" value={form.process} options={processOptions} onChange={value => updateForm('process', value)} />
            <Field label="標高(m)" type="number" value={form.altitude} onChange={value => updateForm('altitude', Number(value))} />
            <Field label="クロップ年" value={form.cropYear} onChange={value => updateForm('cropYear', value)} placeholder="2026" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="購入店" value={form.purchaseShop} onChange={value => updateForm('purchaseShop', value)} />
            <Field label="購入日" required type="date" value={form.purchaseDate} onChange={value => updateForm('purchaseDate', value)} />
            <Field label="購入価格(円)" type="number" value={form.purchasePrice} onChange={value => updateForm('purchasePrice', Number(value))} />
            <Field label="内容量(g)" required type="number" value={form.initialWeight} onChange={value => updateForm('initialWeight', Number(value))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="減耗率(%)" required type="number" step="0.1" value={form.weightLossPercentage} onChange={value => updateForm('weightLossPercentage', Number(value))} />
            <SelectField label="推奨焙煎度" value={form.recommendedRoastDegree} options={roastDegreeOptions} onChange={value => updateForm('recommendedRoastDegree', value)} />
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

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#232326] bg-[#131315] p-4">
      <span className="block text-xs text-[#8E8E93]">{label}</span>
      <strong className={`mt-1 block font-mono text-xl ${accent ? 'text-[#D09B6A]' : 'text-[#F4F4F6]'}`}>{value}</strong>
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

function Field({ label, value, onChange, type = 'text', placeholder, required = false, step }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#8E8E93]">{label} {required && <span className="text-[#EF4444]">*</span>}</span>
      <input type={type} step={step} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm text-[#F4F4F6]" />
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




