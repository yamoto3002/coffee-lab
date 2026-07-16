'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cloud, Download, FileText, RefreshCw, ShieldAlert, Upload } from 'lucide-react';
import SyncStatus from '@/components/SyncStatus';
import { DBService } from '@/lib/db';
import { Bean, Roast, Tasting } from '@/types';

type ViewMode = 'main' | 'data' | 'danger';

export default function SettingsPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [view, setView] = useState<ViewMode>('main');
  const [confirmText, setConfirmText] = useState('');

  const loadStats = useCallback(() => {
    setBeans(DBService.getBeans());
    setRoasts(DBService.getRoasts());
    setTastings(DBService.getTastings());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadStats, 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4500);
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

  const syncFromCloud = async () => {
    setIsBusy(true);
    const result = await DBService.syncFromCloud();
    setIsBusy(false);
    loadStats();
    showMsg(result.ok ? 'success' : 'error', result.ok ? 'Google Sheetsから同期しました。' : result.error || '同期に失敗しました。');
  };

  const resetLocal = () => {
    if (confirmText !== 'RESET') return;
    DBService.resetLocalData();
    setConfirmText('');
    loadStats();
    showMsg('success', 'ローカルデータをリセットしました。Google Sheetsのデータは残っています。');
  };

  const resetCloudAndLocal = async () => {
    if (confirmText !== 'RESET') return;
    setIsBusy(true);
    const result = await DBService.resetCloudData();
    if (result.ok) DBService.resetLocalData();
    setIsBusy(false);
    setConfirmText('');
    loadStats();
    showMsg(result.ok ? 'success' : 'error', result.ok ? 'ローカルとGoogle Sheetsをリセットしました。' : result.error || 'Google Sheetsのリセットに失敗したため、ローカルデータは保持しました。');
  };

  return (
    <div className="lab-shell flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          {view !== 'main' && (
            <button onClick={() => setView(view === 'danger' ? 'data' : 'main')} className="tap-button rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white" aria-label="戻る">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="page-title">設定</h1>
            <p className="text-sm text-[var(--muted-foreground)]">同期、バックアップ、データ管理</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-24 md:p-6">
        {message && <div className="lab-card-soft rounded-2xl px-4 py-3"><SyncStatus message={message.text} tone={message.type === 'success' ? 'success' : 'error'} /></div>}

        {view === 'main' && (
          <>
            <section className="lab-card-soft space-y-5 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Cloud className="h-4 w-4 text-[var(--accent)]" />
                同期とバックアップ
              </h2>

              <Stats beans={beans.length} roasts={roasts.length} tastings={tastings.filter(t => t.status === 'completed').length} />

              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={retryPendingSync} disabled={isBusy} className="tap-button flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-60">
                  <RefreshCw className="h-4 w-4" />
                  未同期データを再送
                </button>
                <button onClick={syncFromCloud} disabled={isBusy} className="tap-button flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-60">
                  <RefreshCw className="h-4 w-4" />
                  Google Sheetsから更新
                </button>
                <button onClick={handleExport} className="tap-button flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200">
                  <Download className="h-4 w-4" />
                  JSONバックアップ
                </button>
                <label className="tap-button flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200">
                  <Upload className="h-4 w-4" />
                  JSONから復元
                  <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </section>

            <section className="lab-card-soft rounded-xl p-6">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <FileText className="h-4 w-4 text-[var(--accent)]" />
                レポート
              </h2>
              <p className="text-sm text-slate-400">印刷向けの焙煎レポートを開きます。</p>
              <Link href="/report" className="btn-primary tap-button mt-4 inline-flex">レポートを開く</Link>
            </section>

            <section className="lab-card-soft rounded-xl p-6">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <ShieldAlert className="h-4 w-4 text-amber-200" />
                データ管理
              </h2>
              <p className="text-sm text-slate-400">危険な操作はこの先の専用画面に分けています。</p>
              <button onClick={() => setView('data')} className="tap-button mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100">データ管理を開く</button>
            </section>
          </>
        )}

        {view === 'data' && (
          <section className="lab-card-soft space-y-5 rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <ShieldAlert className="h-4 w-4 text-amber-200" />
              データ管理
            </h2>
            <Stats beans={beans.length} roasts={roasts.length} tastings={tastings.filter(t => t.status === 'completed').length} />
            <p className="text-sm leading-relaxed text-slate-400">
              通常はJSONバックアップと同期で十分です。リセットが必要な場合だけ、危険な操作の画面へ進んでください。
            </p>
            <button onClick={() => setView('danger')} className="tap-button rounded-lg border border-red-300/20 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200">危険な操作へ進む</button>
          </section>
        )}

        {view === 'danger' && (
          <section className="space-y-5 rounded-xl border border-red-300/25 bg-red-400/10 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-200">
              <ShieldAlert className="h-4 w-4" />
              データリセット
            </h2>
            <div className="rounded-xl border border-red-300/20 bg-[#080E14]/60 p-4 text-sm leading-relaxed text-red-100">
              <p>ローカルリセット: このブラウザのCoffee Labデータ、未同期queue、設定を削除します。Google Sheetsは残ります。</p>
              <p className="mt-2">Sheetsも含めてリセット: ローカルに加えてGoogle Sheetsのbeans / roasts / tastingsのデータ行を削除します。</p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-red-100">実行するには RESET と入力してください</span>
              <input value={confirmText} onChange={event => setConfirmText(event.target.value)} autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-red-300/30 bg-[#101827] px-3 py-2 text-base text-red-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={resetLocal} disabled={confirmText !== 'RESET' || isBusy} className="tap-button rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                ローカルだけリセット
              </button>
              <button onClick={resetCloudAndLocal} disabled={confirmText !== 'RESET' || isBusy} className="tap-button rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-100 disabled:cursor-not-allowed disabled:opacity-40">
                Sheetsも含めて全リセット
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stats({ beans, roasts, tastings }: { beans: number; roasts: number; tastings: number }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-center text-xs text-slate-400">
      <Stat label="生豆" value={`${beans}件`} />
      <Stat label="焙煎" value={`${roasts}件`} />
      <Stat label="味見" value={`${tastings}件`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs text-slate-400">{label}</span>
      <span className="block truncate font-mono text-lg font-bold text-[#F4F4F6]">{value}</span>
    </div>
  );
}
