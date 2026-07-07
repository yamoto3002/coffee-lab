'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Cloud, Download, FileText, RefreshCw, RotateCcw, Settings2, SlidersHorizontal, Upload } from 'lucide-react';
import { DBService } from '@/lib/db';
import { AppSettings, Bean, Roast, Tasting } from '@/types';

export default function SettingsPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => DBService.getSettings());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadStats = () => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
    setSettings(DBService.getSettings());
  };

  useEffect(() => {
    loadStats();
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4500);
  };

  const saveSettings = (patch: Partial<AppSettings>) => {
    const next = DBService.saveSettings({ ...settings, ...patch });
    setSettings(next);
    showMsg('success', '表示設定を保存しました。');
  };

  const applyPreset = (mode: AppSettings['displayMode']) => {
    if (mode === 'beginner') {
      saveSettings({
        displayMode: mode,
        showBeanDetails: false,
        showCropYear: false,
        showPurchaseAge: true,
        showProcess: true,
        showStock: true,
        showAnalysisCards: false,
        showHomeSuggestions: true,
        showLiveRoastDetails: false,
      });
      return;
    }
    if (mode === 'pro') {
      saveSettings({
        displayMode: mode,
        showBeanDetails: true,
        showCropYear: true,
        showPurchaseAge: true,
        showProcess: true,
        showStock: true,
        showAnalysisCards: true,
        showHomeSuggestions: true,
        showLiveRoastDetails: true,
      });
      return;
    }
    saveSettings({
      displayMode: mode,
      showBeanDetails: true,
      showCropYear: true,
      showPurchaseAge: true,
      showProcess: true,
      showStock: true,
      showAnalysisCards: true,
      showHomeSuggestions: true,
      showLiveRoastDetails: true,
    });
  };

  const handleExport = () => {
    const dataStr = DBService.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coffeelab_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMsg('success', 'JSONバックアップをダウンロードしました。');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = loadEvent => {
      const result = loadEvent.target?.result;
      if (typeof result !== 'string') return;
      if (DBService.importData(result)) {
        loadStats();
        showMsg('success', 'JSONバックアップから復元しました。');
      } else {
        showMsg('error', 'JSONの読み込みに失敗しました。ファイル形式を確認してください。');
      }
    };
    reader.readAsText(file);
  };

  const retryPendingSync = async () => {
    setIsBusy(true);
    const result = await DBService.retryPendingSync();
    setIsBusy(false);
    showMsg(result.ok ? 'success' : 'error', result.ok ? '未同期データを再送しました。' : result.error || '再送に失敗しました。');
  };

  const resetLocal = () => {
    if (!confirm('ローカルデータを削除します。Google Sheets上のデータは残ります。続行しますか？')) return;
    if (!confirm('本当にローカルのCoffee Labデータをリセットしますか？この操作は元に戻せません。')) return;
    DBService.resetLocalData();
    loadStats();
    showMsg('success', 'ローカルデータをリセットしました。');
  };

  const resetAll = async () => {
    if (!confirm('ローカルデータとGoogle Sheetsのbeans/roastsデータを削除します。続行しますか？')) return;
    if (!confirm('最終確認です。全リセットは元に戻せません。必要なら先にJSONバックアップを出力してください。')) return;
    setIsBusy(true);
    DBService.resetLocalData();
    const result = await DBService.resetCloudData();
    setIsBusy(false);
    loadStats();
    showMsg(result.ok ? 'success' : 'error', result.ok ? 'ローカルとGoogle Sheetsをリセットしました。' : result.error || 'Google Sheetsのリセットに失敗しました。ローカルは削除済みです。');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <h1 className="text-xl font-bold tracking-wide">設定</h1>
        <p className="text-xs text-[#8E8E93]">バックアップ、同期、表示カスタマイズ、データリセット</p>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 pb-24">
        {message && (
          <div className={`flex items-center gap-2 rounded-lg border p-4 text-sm ${message.type === 'success' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-red-800 bg-red-950/40 text-red-300'}`}>
            <AlertCircle className="h-5 w-5" />
            {message.text}
          </div>
        )}

        <section className="space-y-5 rounded-xl border border-[#232326] bg-[#131315] p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">
            <Cloud className="h-4 w-4 text-[#D09B6A]" />
            同期とバックアップ
          </h2>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-[#232326] bg-[#1A1A1E] p-3 text-center text-xs text-[#A1A1AA]">
            <Stat label="生豆" value={`${beans.length} 件`} />
            <Stat label="焙煎" value={`${roasts.length} 件`} />
            <Stat label="テイスティング" value={`${tastings.filter(t => t.status === 'completed').length} 件`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={retryPendingSync} disabled={isBusy} className="flex items-center justify-center gap-2 rounded-lg border border-[#232326] bg-[#1E1E22] px-4 py-2.5 text-sm font-semibold text-[#E4E4E7] disabled:opacity-60">
              <RefreshCw className="h-4 w-4" />
              未同期データを再送
            </button>
            <Link href="/report" className="flex items-center justify-center gap-2 rounded-lg bg-[#D09B6A] px-4 py-2.5 text-sm font-semibold text-[#0B0B0C]">
              <FileText className="h-4 w-4" />
              印刷用レポートを開く
            </Link>
            <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-lg border border-[#232326] bg-[#1E1E22] px-4 py-2.5 text-sm font-semibold text-[#E4E4E7]">
              <Download className="h-4 w-4" />
              JSONバックアップ
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#232326] bg-[#1E1E22] px-4 py-2.5 text-sm font-semibold text-[#E4E4E7]">
              <Upload className="h-4 w-4" />
              JSONから復元
              <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-[#232326] bg-[#131315] p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">
            <SlidersHorizontal className="h-4 w-4 text-[#D09B6A]" />
            表示カスタマイズ
          </h2>

          <div className="grid gap-2 sm:grid-cols-3">
            {(['beginner', 'detail', 'pro'] as const).map(mode => (
              <button key={mode} onClick={() => applyPreset(mode)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${settings.displayMode === mode ? 'border-[#D09B6A] bg-[#D09B6A]/10 text-[#D09B6A]' : 'border-[#232326] bg-[#1A1A1E] text-[#E4E4E7]'}`}>
                {mode === 'beginner' ? '初心者' : mode === 'detail' ? '詳細' : 'プロ'}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="生豆の詳細項目" checked={settings.showBeanDetails} onChange={value => saveSettings({ showBeanDetails: value })} />
            <Toggle label="クロップ年" checked={settings.showCropYear} onChange={value => saveSettings({ showCropYear: value })} />
            <Toggle label="購入日経過日数" checked={settings.showPurchaseAge} onChange={value => saveSettings({ showPurchaseAge: value })} />
            <Toggle label="精製方法" checked={settings.showProcess} onChange={value => saveSettings({ showProcess: value })} />
            <Toggle label="在庫情報" checked={settings.showStock} onChange={value => saveSettings({ showStock: value })} />
            <Toggle label="分析カード" checked={settings.showAnalysisCards} onChange={value => saveSettings({ showAnalysisCards: value })} />
            <Toggle label="ホーム提案カード" checked={settings.showHomeSuggestions} onChange={value => saveSettings({ showHomeSuggestions: value })} />
            <Toggle label="Live Roast詳細ログ" checked={settings.showLiveRoastDetails} onChange={value => saveSettings({ showLiveRoastDetails: value })} />
          </div>
        </section>

        <section className="space-y-5 rounded-xl border border-red-900/30 bg-red-950/10 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-300">
            <RotateCcw className="h-4 w-4" />
            データリセット
          </h2>
          <p className="text-sm leading-relaxed text-[#A1A1AA]">
            誤操作防止のため確認を2回表示します。全リセット前にはJSONバックアップを出力しておくと安心です。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={resetLocal} className="rounded-lg border border-[#232326] bg-[#1E1E22] px-4 py-2.5 text-sm font-semibold text-[#E4E4E7]">
              ローカルだけリセット
            </button>
            <button onClick={resetAll} disabled={isBusy} className="rounded-lg border border-red-800/50 bg-red-900/30 px-4 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-60">
              Sheetsも含めて全リセット
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#232326] bg-[#131315] p-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#8E8E93]">
            <Settings2 className="h-4 w-4 text-[#D09B6A]" />
            データベース
          </h2>
          <p className="text-sm text-[#A1A1AA]">現在の同期先は Google Sheets / Google Apps Script Web App です。</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] text-[#8E8E93]">{label}</span>
      <span className="font-mono text-lg font-bold text-[#F4F4F6]">{value}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-[#232326] bg-[#1A1A1E] px-3 py-2 text-sm text-[#E4E4E7]">
      {label}
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-5 w-5 accent-[#D09B6A]" />
    </label>
  );
}
