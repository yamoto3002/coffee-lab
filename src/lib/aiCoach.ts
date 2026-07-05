/**
 * aiCoach.ts
 * Mock AI analysis engine for roast profiles.
 * Generates rule-based improvement suggestions based on roast metrics.
 */

import { Roast, Tasting } from '@/types';
import { timeToSeconds } from './db';

export interface AICoachResult {
  summary: string;
  score: 'excellent' | 'good' | 'needs_improvement';
  suggestions: AISuggestion[];
  nextProfileTips: string[];
}

export interface AISuggestion {
  aspect: string;
  icon: string;
  current: string;
  target: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Analyzes a roast profile and returns improvement suggestions.
 * Simulates a ~1 second AI response delay.
 */
export async function analyzeRoast(roast: Roast, tastings: Tasting[]): Promise<AICoachResult> {
  // Simulate async AI call
  await new Promise(resolve => setTimeout(resolve, 1200));

  const suggestions: AISuggestion[] = [];
  const nextProfileTips: string[] = [];

  const { lossRatio, developmentRatio, developmentTime, yellowTime, firstCrackTime, dropTime } = roast;

  const yellowSecs = timeToSeconds(yellowTime);
  const firstCrackSecs = timeToSeconds(firstCrackTime);
  const dropSecs = timeToSeconds(dropTime);
  const devSecs = timeToSeconds(developmentTime);
  const totalSecs = dropSecs;

  // ── 1. Loss Ratio Analysis ────────────────────────────────────────────────

  if (lossRatio > 18) {
    suggestions.push({
      aspect: '重量減少率',
      icon: '⚖️',
      current: `${lossRatio}%`,
      target: '14–17%',
      action: '焙煎度が深すぎる可能性があります。Dropタイムを15〜20秒早めるか、終盤の火力を1段階下げてください。',
      severity: 'warning',
    });
    nextProfileTips.push(`Dropを約15秒早める（現在: ${dropTime}）`);
  } else if (lossRatio < 10) {
    suggestions.push({
      aspect: '重量減少率',
      icon: '⚖️',
      current: `${lossRatio}%`,
      target: '14–17%',
      action: '焙煎度が浅すぎます。Dropタイムを10〜15秒遅らせるか、1st Crack後の火力を維持してください。',
      severity: 'warning',
    });
    nextProfileTips.push(`Dropを約10秒遅らせる（現在: ${dropTime}）`);
  } else {
    suggestions.push({
      aspect: '重量減少率',
      icon: '⚖️',
      current: `${lossRatio}%`,
      target: '14–17%',
      action: '理想的な重量減少率の範囲内です。このプロファイルを維持してください。',
      severity: 'info',
    });
  }

  // ── 2. Development Ratio Analysis ────────────────────────────────────────

  if (developmentRatio > 22) {
    suggestions.push({
      aspect: 'Development Ratio',
      icon: '📊',
      current: `${developmentRatio}%`,
      target: '14–20%',
      action: 'Dev比率が高すぎます（焼けすぎのリスク）。1st Crack時点で火力を1〜2段階下げ、早めにDropしてください。',
      severity: 'critical',
    });
    nextProfileTips.push(`1st Crack後の火力を1段下げる`);
    nextProfileTips.push(`Dropを${Math.round((developmentRatio - 18) * 2)}秒程度早める`);
  } else if (developmentRatio < 12) {
    suggestions.push({
      aspect: 'Development Ratio',
      icon: '📊',
      current: `${developmentRatio}%`,
      target: '14–20%',
      action: 'Dev比率が低すぎます（未発達の可能性）。1st Crack後の安定期間を15〜20秒延ばし、風量を1段階落としてみてください。',
      severity: 'warning',
    });
    nextProfileTips.push(`1st Crack後の風量を1段下げる（発達促進）`);
    nextProfileTips.push(`Dropを15〜20秒遅らせる`);
  } else {
    suggestions.push({
      aspect: 'Development Ratio',
      icon: '📊',
      current: `${developmentRatio}%`,
      target: '14–20%',
      action: 'Development Ratioは理想的な範囲です。プロファイルの一貫性を維持してください。',
      severity: 'info',
    });
  }

  // ── 3. Drying Phase (Yellow Time) ────────────────────────────────────────

  if (totalSecs > 0) {
    const dryingRatio = (yellowSecs / totalSecs) * 100;
    if (dryingRatio < 40) {
      suggestions.push({
        aspect: 'ドライングフェーズ',
        icon: '🌿',
        current: `${yellowTime} (総時間の${Math.round(dryingRatio)}%)`,
        target: '総時間の45〜55%',
        action: 'ドライングフェーズが短すぎます。投入時の火力を1段階下げるか、初期温度を5〜10℃下げることでドライングを延ばしてください。',
        severity: 'warning',
      });
    } else if (dryingRatio > 60) {
      suggestions.push({
        aspect: 'ドライングフェーズ',
        icon: '🌿',
        current: `${yellowTime} (総時間の${Math.round(dryingRatio)}%)`,
        target: '総時間の45〜55%',
        action: 'ドライングフェーズが長すぎます（フラットな焙煎プロファイルの原因になる可能性）。投入時の火力を1段上げてみてください。',
        severity: 'info',
      });
    }
  }

  // ── 4. 1st Crack Dev Time ─────────────────────────────────────────────────

  if (devSecs > 0) {
    if (devSecs < 60) {
      suggestions.push({
        aspect: '1st Crack後の発達時間',
        icon: '🔥',
        current: `${developmentTime}`,
        target: '1:10〜2:00',
        action: '1st Crack後の発達時間が60秒未満です。ドロップを遅らせるか、1st Crack付近の火力を維持してください。フレーバー発達が不十分な可能性があります。',
        severity: 'warning',
      });
    } else if (devSecs > 130) {
      suggestions.push({
        aspect: '1st Crack後の発達時間',
        icon: '🔥',
        current: `${developmentTime}`,
        target: '1:10〜2:00',
        action: '1st Crack後の発達時間が2分を超えています。焦げた風味やビターネスが増す可能性があります。次回はDropを15秒早めてください。',
        severity: 'critical',
      });
      nextProfileTips.push(`Dropを${Math.round((devSecs - 100) / 15) * 15}秒早める（現在: ${dropTime}）`);
    }
  }

  // ── 5. Tasting feedback integration ──────────────────────────────────────

  const completedTastings = tastings.filter(t => t.status === 'completed');
  if (completedTastings.length > 0) {
    const bestTasting = completedTastings.reduce((a, b) => a.score > b.score ? a : b);
    if (bestTasting.score >= 87) {
      nextProfileTips.push(`このプロファイルはDay ${bestTasting.tastingDay}で${bestTasting.score}点の高評価！基本的なパラメーターを維持してください`);
    } else if (bestTasting.score < 80) {
      nextProfileTips.push(`テイスティングスコアが低め(${bestTasting.score}点)。DevRatioを2〜3%上げることで風味の深みが増す可能性があります`);
    }

    // Low body analysis
    const avgBody = completedTastings.reduce((acc, t) => acc + t.body, 0) / completedTastings.length;
    if (avgBody < 7.0) {
      nextProfileTips.push(`ボディが薄め (平均${avgBody.toFixed(1)}点)。中盤の火力を1段上げてみてください`);
    }

    // Low sweetness
    const avgSweet = completedTastings.reduce((acc, t) => acc + t.sweetness, 0) / completedTastings.length;
    if (avgSweet < 7.5) {
      nextProfileTips.push(`甘さが不足 (平均${avgSweet.toFixed(1)}点)。ドライングフェーズを5〜10秒延ばすと改善する可能性があります`);
    }
  }

  // ── Score summary ─────────────────────────────────────────────────────────

  const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
  const warningCount = suggestions.filter(s => s.severity === 'warning').length;

  let score: AICoachResult['score'];
  let summary: string;

  if (criticalCount > 0) {
    score = 'needs_improvement';
    summary = `${criticalCount}件の重要な改善点と${warningCount}件の警告が見つかりました。次回の焙煎前に以下のアクションを確認してください。`;
  } else if (warningCount > 1) {
    score = 'good';
    summary = `全体的に良好なプロファイルです。${warningCount}件の軽微な改善で、より一貫した品質を実現できます。`;
  } else {
    score = 'excellent';
    summary = `優秀なプロファイルです！主要な指標がすべて目標範囲内に収まっています。このプロファイルをベースに継続してください。`;
  }

  return { summary, score, suggestions, nextProfileTips };
}
