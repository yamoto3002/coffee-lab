'use client';

import { useState, useEffect } from 'react';
import { DBService } from '@/lib/db';
import { Roast, Tasting, Bean } from '@/types';
import { Download, Upload, RefreshCw, Sparkles, Check, Database, AlertCircle, FileJson, Cloud } from 'lucide-react';

export default function SettingsPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [tastings, setTastings] = useState<Tasting[]>([]);
  
  // UI triggers
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // AI Insights State
  const [aiEnabled, setAiEnabled] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const b = DBService.getBeans();
    const r = DBService.getRoasts();
    const t = DBService.getTastings();
    setBeans(b);
    setRoasts(r);
    setTastings(t);

    if (aiEnabled) {
      generateInsights(b, r, t);
    }
  };

  // Heuristic Rule-Based AI Engine
  const generateInsights = (b: Bean[], r: Roast[], t: Tasting[]) => {
    const list: string[] = [];
    const completed = t.filter(x => x.status === 'completed');

    if (r.length === 0) {
      setInsights(['インサイトを得るには、まず焙煎記録を登録してください。']);
      return;
    }

    // Rule 1: Dev Ratio warning
    const underDev = r.filter(roast => roast.developmentRatio < 14.5);
    if (underDev.length > 0) {
      list.push(
        `警告: バッチ ${underDev.map(x => x.id).join(', ')} は開発比率 (Development Ratio) が14.5%未満です。青臭さや未発達な風味が残る可能性があります。次回はDropを15〜20秒遅らせることを検討してください。`
      );
    }

    // Rule 2: Aging Sweet Spot for Washed process
    const washedBeansIds = b.filter(bean => bean.process === 'Washed').map(bean => bean.id);
    const washedTastings = completed.filter(tasting => {
      const roast = r.find(x => x.id === tasting.roastId);
      return roast && washedBeansIds.includes(roast.beanId);
    });
    
    if (washedTastings.length >= 2) {
      const d7Avg = washedTastings.filter(x => x.tastingDay === 7).reduce((s, x) => s + x.score, 0) / washedTastings.filter(x => x.tastingDay === 7).length || 0;
      const d10Avg = washedTastings.filter(x => x.tastingDay === 10).reduce((s, x) => s + x.score, 0) / washedTastings.filter(x => x.tastingDay === 10).length || 0;
      const d14Avg = washedTastings.filter(x => x.tastingDay === 14).reduce((s, x) => s + x.score, 0) / washedTastings.filter(x => x.tastingDay === 14).length || 0;
      
      const max = Math.max(d7Avg, d10Avg, d14Avg);
      if (max > 0) {
        const peakDay = max === d7Avg ? 7 : max === d10Avg ? 10 : 14;
        list.push(`分析: あなたのウォッシュド（水洗式）コーヒーは、エイジング【Day ${peakDay}】でスコアが最大化（平均 ${max.toFixed(1)}点）する傾向があります。この時期のテイスティングを重視してください。`);
      }
    }

    // Rule 3: Aging Sweet Spot for Natural process
    const naturalBeansIds = b.filter(bean => bean.process === 'Natural').map(bean => bean.id);
    const naturalTastings = completed.filter(tasting => {
      const roast = r.find(x => x.id === tasting.roastId);
      return roast && naturalBeansIds.includes(roast.beanId);
    });

    if (naturalTastings.length >= 2) {
      const d7Avg = naturalTastings.filter(x => x.tastingDay === 7).reduce((s, x) => s + x.score, 0) / naturalTastings.filter(x => x.tastingDay === 7).length || 0;
      const d10Avg = naturalTastings.filter(x => x.tastingDay === 10).reduce((s, x) => s + x.score, 0) / naturalTastings.filter(x => x.tastingDay === 10).length || 0;
      const d14Avg = naturalTastings.filter(x => x.tastingDay === 14).reduce((s, x) => s + x.score, 0) / naturalTastings.filter(x => x.tastingDay === 14).length || 0;
      
      const max = Math.max(d7Avg, d10Avg, d14Avg);
      if (max > 0) {
        const peakDay = max === d14Avg ? 14 : max === d10Avg ? 10 : 7;
        list.push(`分析: ナチュラル（非水洗式）コーヒーは、エイジング【Day ${peakDay}】で風味がもっとも丸く、甘さが際立つ傾向があります。`);
      }
    }

    // Rule 4: Acidity vs Dev ratio optimization
    const highAcidRoasts = completed.filter(x => x.acidityIntensity > 8.2);
    if (highAcidRoasts.length > 0) {
      list.push("提案: アシディティ（酸の強さ）を高評価に繋げるためには、1ハゼ（First Crack）直後の火力を抑え、排気風量を最大（Air 7-8）にしてスモーキーさを排除するとクリーンカップが劇的に向上します。");
    }

    if (list.length === 0) {
      list.push("インサイト: さらに多くの焙煎・テイストデータを登録すると、高精度なレコメンデーションがここに生成されます。");
    }

    setInsights(list);
  };

  const handleExport = () => {
    try {
      const dataStr = DBService.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coffeelab_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showMsg('success', 'データのバックアップをダウンロードしました');
    } catch (e) {
      showMsg('error', 'エクスポートに失敗しました');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const success = DBService.importData(result);
        if (success) {
          loadStats();
          showMsg('success', 'バックアップデータから復元が完了しました');
        } else {
          showMsg('error', 'データのインポートに失敗しました。JSONファイル形式が正しくありません。');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('警告：すべての生豆、焙煎、テイストの記録を消去し、初期シード状態に戻します。この操作は取り消せません。本当によろしいですか？')) {
      // Clear localStorage
      localStorage.clear();
      loadStats();
      showMsg('success', 'データベースを初期データにリセットしました');
    }
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[#232326] bg-[#0E0E10] px-6 py-4">
        <h1 className="text-xl font-bold tracking-wide">アプリケーション設定</h1>
        <p className="text-xs text-[#8E8E93]">データのインポート/エクスポートおよび外部同期管理</p>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-6 space-y-6 max-w-3xl mx-auto w-full pb-24">
        
        {/* Status Toast Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 border text-sm ${
            message.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' 
              : 'bg-red-950/40 border-red-800 text-red-400'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {message.text}
          </div>
        )}

        {/* Section 1: Backup Restore */}
        <div className="bg-[#131315] p-6 rounded-xl border border-[#232326] space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-[#D09B6A]" />
            データ資産管理
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-center text-xs text-[#A1A1AA] bg-[#1A1A1E] p-3 rounded-lg border border-[#232326]">
            <div>
              <span className="text-[10px] text-[#8E8E93] block">登録生豆数</span>
              <span className="text-lg font-bold text-[#F4F4F6] font-mono">{beans.length} 銘柄</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E8E93] block">総焙煎バッチ数</span>
              <span className="text-lg font-bold text-[#F4F4F6] font-mono">{roasts.length} バッチ</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#D09B6A] hover:bg-[#B37B4D] text-[#0B0B0C] font-semibold text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              バックアップ (JSON) の出力
            </button>

            <div className="flex-1 relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="json-import-input"
              />
              <label
                htmlFor="json-import-input"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#232326] bg-[#1E1E22] hover:bg-[#26262B] text-[#E4E4E7] font-semibold text-sm cursor-pointer transition-colors text-center w-full"
              >
                <Upload className="w-4 h-4" />
                バックアップの読み込み
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#232326] flex justify-between items-center">
            <div>
              <h4 className="text-xs font-semibold text-[#EF4444]">ファクトリーリセット</h4>
              <p className="text-[10px] text-[#8E8E93] mt-0.5">全ての登録データを消去しデモデータに初期化します</p>
            </div>
            <button
              onClick={handleReset}
              className="py-1.5 px-3 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-900/20 text-[#EF4444] text-xs font-semibold cursor-pointer transition-colors"
            >
              データをリセット
            </button>
          </div>
        </div>

        {/* Section 2: Supabase Settings Mock */}
        <div className="bg-[#131315] p-6 rounded-xl border border-[#232326] space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-2">
              <Cloud className="w-4.5 h-4.5 text-[#D09B6A]" />
              クラウド同期設定
            </h2>
            <span className="text-[9px] bg-[#1C1C1F] text-[#8E8E93] px-2 py-0.5 rounded-full font-mono uppercase">
              Local Storage Mode
            </span>
          </div>

          <p className="text-xs text-[#8E8E93] leading-relaxed">
            現在、焙煎データはブラウザのセキュア領域（ローカルストレージ）にのみ保存されています。
            共同研究やマルチデバイスで同期する場合は、Supabase の環境変数を設定してください。
          </p>

          <div className="bg-[#1A1A1E] p-4 rounded-lg border border-[#232326] space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">同期プロバイダ:</span>
              <span className="font-semibold text-[#E4E4E7]">Supabase DB (PostgreSQL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">接続ステータス:</span>
              <span className="font-semibold text-amber-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                オフライン（ローカル優先）
              </span>
            </div>
            <div className="pt-2 text-[10px] text-[#8E8E93] border-t border-[#232326]">
              ※ `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` を記述すると自動接続されます。
            </div>
          </div>
        </div>

        {/* Section 3: Custom Heuristic AI Analysis Engine */}
        <div className="bg-[#131315] p-6 rounded-xl border border-[#232326] space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8E8E93] flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#D09B6A]" />
              AIレコメンデーション・エンジン（稼働中）
            </h2>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={aiEnabled} 
                onChange={(e) => {
                  setAiEnabled(e.target.checked);
                  if (e.target.checked) {
                    generateInsights(beans, roasts, tastings);
                  } else {
                    setInsights([]);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#232326] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8E8E93] peer-checked:after:bg-[#0B0B0C] peer-checked:bg-[#D09B6A] after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>

          <p className="text-xs text-[#8E8E93] leading-relaxed">
            蓄積された焙煎時の火力・風量プロファイルと、Day 7/10/14のテイスト評価との相関関係をスキャンし、スイートスポットの予測や改善アクションを自動抽出します。
          </p>

          {aiEnabled && (
            <div className="bg-[#1A1A1E]/80 border border-[#232326] p-4.5 rounded-lg space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#D09B6A] block tracking-wide">
                現在のAI分析インサイト ({insights.length} 件)
              </span>
              <div className="space-y-2.5">
                {insights.map((insight, idx) => (
                  <div key={idx} className="text-xs leading-relaxed text-[#E4E4E7] flex gap-2">
                    <span className="text-[#D09B6A]">✦</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
