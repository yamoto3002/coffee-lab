import { Bean, Roast, Tasting } from '@/types';
import { addDateDays, diffDateDays, todayDateString } from './date';
import { timeToSeconds } from './db';

export type CoachInsightType = 'roast' | 'tasting' | 'inventory' | 'learning' | 'warning' | 'experiment';
export type CoachPriority = 'high' | 'medium' | 'low';

export type CoachInsight = {
  id: string;
  type: CoachInsightType;
  priority: CoachPriority;
  title: string;
  message: string;
  observation?: string;
  interpretation?: string;
  nextExperiment?: string;
  reason?: string;
  actionLabel?: string;
  actionHref?: string;
  color?: string;
  relatedRoastId?: string;
};

export type CoachData = {
  beans: Bean[];
  roasts: Roast[];
  tastings: Tasting[];
  today?: string;
};

const COLORS: Record<CoachInsightType, string> = {
  roast: '#FFB86B',
  tasting: '#00F0FF',
  inventory: '#8C00FF',
  learning: '#33D69F',
  warning: '#FFD166',
  experiment: '#FF3D71',
};

const priorityOrder: Record<CoachPriority, number> = { high: 0, medium: 1, low: 2 };

function completedTastings(tastings: Tasting[]) {
  return tastings.filter(tasting => tasting.status === 'completed');
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function roastForId(roasts: Roast[], id: string) {
  return roasts.find(roast => roast.id === id);
}

function tastingHref(roast: Roast, days: number): string {
  return `/roasts/${roast.id}/tasting/${Math.max(1, days)}`;
}

/**
 * A deterministic coaching layer. It intentionally consumes only the local
 * domain records so a future API-backed coach can replace this module without
 * changing route components or the Sheets schema.
 */
export function getCoachInsights({ beans, roasts, tastings, today = todayDateString() }: CoachData): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const completed = completedTastings(tastings);
  const roastIdsWithTasting = new Set(completed.map(tasting => tasting.roastId));
  const newestFirst = [...roasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id));

  if (beans.length === 0) {
    insights.push({
      id: 'inventory-first-bean', type: 'inventory', priority: 'high', color: COLORS.inventory,
      title: '最初の生豆を登録しましょう',
      message: '生豆を登録すると、焙煎・テイスティング・比較の流れを始められます。',
      reason: '現在、生豆の記録がありません。', actionLabel: '生豆を追加', actionHref: '/beans',
    });
    return insights;
  }

  if (roasts.length === 0) {
    insights.push({
      id: 'experiment-first-roast', type: 'experiment', priority: 'high', color: COLORS.experiment,
      title: '最初の実験を始めましょう',
      message: '一度焙煎すると、次回の比較とテイスティングの提案が育ち始めます。',
      reason: `${beans.length}種類の生豆が登録されています。`, actionLabel: 'Live Roastを開始', actionHref: '/roasts/new',
    });
    return insights;
  }

  const dueTastings = newestFirst
    .map(roast => ({ roast, days: Math.max(0, diffDateDays(roast.roastDate, today)) }))
    .filter(({ roast, days }) => !roastIdsWithTasting.has(roast.id) && (days >= 6 && days <= 11));
  const daySeven = dueTastings.find(item => item.days >= 6 && item.days <= 8);
  const dayTen = dueTastings.find(item => item.days >= 9 && item.days <= 11);
  const tastingDue = daySeven || dayTen;

  if (tastingDue) {
    const target = tastingDue.days <= 8 ? 'Day7前後' : 'Day10前後';
    insights.push({
      id: `tasting-due-${tastingDue.roast.id}`, type: 'tasting', priority: 'high', color: COLORS.tasting,
      title: `${tastingDue.roast.id} は${target}です`,
      message: '香りや甘さの変化を、いまの印象として残してみませんか。',
      reason: `焙煎日 ${tastingDue.roast.roastDate}／本日で${tastingDue.days}日目。`,
      actionLabel: 'テイスティングを記録', actionHref: tastingHref(tastingDue.roast, tastingDue.days), relatedRoastId: tastingDue.roast.id,
    });
  } else {
    const untasted = newestFirst.find(roast => !roastIdsWithTasting.has(roast.id));
    if (untasted && completed.length === 0) {
      insights.push({
        id: `tasting-first-${untasted.id}`, type: 'tasting', priority: 'high', color: COLORS.tasting,
        title: '最初のテイスティングを残しましょう',
        message: `${untasted.id} の味を一度記録すると、焙煎条件と感覚を結び付けて見られるようになります。`,
        reason: `焙煎記録は${roasts.length}件ありますが、完了したテイスティングはまだありません。`,
        actionLabel: 'テイスティングを記録', actionHref: tastingHref(untasted, Math.max(1, diffDateDays(untasted.roastDate, today))), relatedRoastId: untasted.id,
      });
    }
  }

  const highScore = [...completed].sort((a, b) => b.score - a.score)[0];
  if (highScore && highScore.score > 0) {
    const roast = roastForId(roasts, highScore.roastId);
    if (roast) {
      insights.push({
        id: `recreate-${roast.id}`, type: 'experiment', priority: 'medium', color: COLORS.experiment,
        title: `${roast.id} の条件を見返す`,
        message: `${highScore.score}点だった記録です。次回、火力・風量の流れを比較の出発点にできます。`,
        reason: `Day ${highScore.dayAfterRoast} のテイスティングが、記録中で最も高いスコアです。`,
        actionLabel: '焙煎詳細を見る', actionHref: `/roasts/${roast.id}`, relatedRoastId: roast.id,
      });
    }
  }

  if (roasts.length < 3) {
    insights.push({
      id: 'learning-more-roasts', type: 'learning', priority: 'low', color: COLORS.learning,
      title: 'まだ判断材料を育てている段階です',
      message: '同じ豆をあと数回焼くと、LossやDev%の傾向を比較しやすくなります。',
      reason: `現在の焙煎記録は${roasts.length}件です。`, actionLabel: '次の焙煎を始める', actionHref: '/roasts/new',
    });
  }

  const lossValues = roasts.filter(roast => roast.lossRatio > 0).map(roast => roast.lossRatio);
  const latestWithLoss = newestFirst.find(roast => roast.lossRatio > 0);
  if (lossValues.length >= 3 && latestWithLoss) {
    const mean = average(lossValues);
    const delta = latestWithLoss.lossRatio - mean;
    if (Math.abs(delta) >= 1.2) {
      const direction = delta > 0 ? '高め' : '低め';
      insights.push({
        id: `loss-${latestWithLoss.id}`, type: delta > 0 ? 'warning' : 'roast', priority: 'medium', color: delta > 0 ? COLORS.warning : COLORS.roast,
        title: `${latestWithLoss.id} のLossはいつもより${direction}`,
        message: `直近の投入量・Drop時刻・焙煎後重量を見返し、次回は一つだけ条件を変えて比較すると違いを追えます。`,
        reason: `今回 ${formatNumber(latestWithLoss.lossRatio)}%／${lossValues.length}件平均 ${formatNumber(mean)}%。`,
        actionLabel: '焙煎詳細を見る', actionHref: `/roasts/${latestWithLoss.id}`, relatedRoastId: latestWithLoss.id,
      });
    }
  }

  const devRoasts = roasts.filter((roast): roast is Roast & { developmentRatio: number } => roast.developmentRatio !== null && roast.developmentRatio > 0);
  const latestWithDev = newestFirst.find((roast): roast is Roast & { developmentRatio: number } => roast.developmentRatio !== null && roast.developmentRatio > 0);
  if (devRoasts.length >= 3 && latestWithDev) {
    const mean = average(devRoasts.map(roast => roast.developmentRatio));
    const delta = latestWithDev.developmentRatio - mean;
    if (Math.abs(delta) >= 2) {
      insights.push({
        id: `dev-${latestWithDev.id}`, type: 'roast', priority: 'medium', color: COLORS.roast,
        title: `${latestWithDev.id} のDev%は平均から離れています`,
        message: `良し悪しの断定はせず、テイスティング時の甘さ・後味と一緒に見返すと次の仮説になります。`,
        reason: `今回 ${formatNumber(latestWithDev.developmentRatio)}%／${devRoasts.length}件平均 ${formatNumber(mean)}%。`,
        actionLabel: '焙煎詳細を見る', actionHref: `/roasts/${latestWithDev.id}`, relatedRoastId: latestWithDev.id,
      });
    }
  }

  const recentMissingFirst = newestFirst.slice(0, 3).filter(roast => !roast.firstCrackTime || roast.firstCrackStatus === 'not_detected' || roast.firstCrackStatus === 'unknown');
  if (recentMissingFirst.length >= 2) {
    insights.push({
      id: 'first-crack-observation', type: 'learning', priority: 'medium', color: COLORS.learning,
      title: '1st Crackの観察を少し増やしてみましょう',
      message: '音だけでなく、香り・煙・色の変化を短いメモで残すと、聞き取りにくい回でも比較しやすくなります。',
      reason: `直近3件のうち${recentMissingFirst.length}件で1st Crackが未記録です。`,
      actionLabel: 'Live Roastを開く', actionHref: '/roasts/new', relatedRoastId: recentMissingFirst[0]?.id,
    });
  }

  const unusedBean = beans.find(bean => !roasts.some(roast => roast.beanId === bean.id));
  if (unusedBean) {
    insights.push({
      id: `inventory-unused-${unusedBean.id}`, type: 'inventory', priority: 'low', color: unusedBean.themeColor || COLORS.inventory,
      title: `${unusedBean.name || unusedBean.id} を試してみませんか`,
      message: 'まだ焙煎記録がない豆です。最初の一回を基準プロファイルとして残せます。',
      reason: `登録済みの生豆 ${beans.length}種類のうち、未焙煎です。`,
      actionLabel: 'この豆で焙煎', actionHref: `/roasts/new?beanId=${unusedBean.id}`,
    });
  }

  const byBean = new Map<string, Roast[]>();
  roasts.forEach(roast => byBean.set(roast.beanId, [...(byBean.get(roast.beanId) || []), roast]));
  const varied = [...byBean.entries()].map(([beanId, beanRoasts]) => {
    const drops = beanRoasts.map(roast => timeToSeconds(roast.dropTime)).filter(value => value > 0);
    return { beanId, beanRoasts, drops, spread: drops.length >= 3 ? Math.max(...drops) - Math.min(...drops) : 0 };
  }).find(item => item.spread >= 45);
  if (varied) {
    const bean = beans.find(item => item.id === varied.beanId);
    const target = [...varied.beanRoasts].sort((a, b) => b.roastDate.localeCompare(a.roastDate))[0];
    insights.push({
      id: `drop-variation-${varied.beanId}`, type: 'experiment', priority: 'low', color: bean?.themeColor || COLORS.experiment,
      title: `${bean?.name || varied.beanId} のDropに幅があります`,
      message: '次回は火力・風量を大きく変えず、Dropの狙いだけを決めて比較してみるのもよさそうです。',
      reason: `${varied.drops.length}件のDrop時刻に${varied.spread}秒の幅があります。`,
      actionLabel: '直近の焙煎を見る', actionHref: `/roasts/${target.id}`, relatedRoastId: target.id,
    });
  }

  return insights
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 8);
}

export function getInsightsForRoast(data: CoachData, roastId: string): CoachInsight[] {
  return getCoachInsights(data).filter(insight => insight.relatedRoastId === roastId);
}

export function getLiveRoastCoachInsight(draft: Roast, previousRoasts: Roast[]): CoachInsight {
  const sameBean = previousRoasts
    .filter(roast => roast.beanId === draft.beanId && roast.id !== draft.id)
    .sort((a, b) => b.roastDate.localeCompare(a.roastDate) || b.id.localeCompare(a.id));

  if (!draft.firstCrackTime || draft.developmentRatio === null) {
    return {
      id: `live-observation-${draft.id}`, type: 'learning', priority: 'medium', color: COLORS.learning,
      title: 'Experiment Complete',
      message: '1st Crackは不明として保存されます。次回は音に加えて香り・煙・色の変化を短く残すと、比較の手がかりになります。',
      reason: '今回の1st Crack時刻が未記録のため、Dev%は計算していません。', relatedRoastId: draft.id,
      observation: '今回の1st Crack時刻は未記録です。Dev%は計算していません。',
      interpretation: 'この記録だけでは開発時間の長短を判断できません。焙煎自体の良し悪しを断定する材料も不足しています。',
      nextExperiment: '次回は音に加えて、香り・煙・豆表面の変化を1st Crack候補としてメモしてください。',
    };
  }

  const previous = sameBean.find(roast => roast.developmentRatio !== null && roast.developmentRatio > 0);
  if (previous?.developmentRatio !== null && previous?.developmentRatio !== undefined) {
    const delta = draft.developmentRatio - previous.developmentRatio;
    const direction = delta > 0 ? '長め' : delta < 0 ? '短め' : '同程度';
    return {
      id: `live-compare-${draft.id}`, type: 'experiment', priority: 'medium', color: COLORS.experiment,
      title: 'Experiment Complete',
      message: `1st CrackからDropまで ${draft.developmentTime}。${previous.id} と比べてDev%は${direction}です。テイスティングで甘さや後味を並べると違いを確かめられます。`,
      reason: `今回 ${formatNumber(draft.developmentRatio)}%／${previous.id} ${formatNumber(previous.developmentRatio)}%。`, relatedRoastId: draft.id,
      observation: `Dev%は今回 ${formatNumber(draft.developmentRatio)}%、直近の同じ豆 ${previous.id} は ${formatNumber(previous.developmentRatio)}%でした。`,
      interpretation: `開発区間は前回より${direction}です。ただし、味への影響はテイスティング前には断定できません。`,
      nextExperiment: 'Day7前後に甘さ・重さ・後味を同じ条件で評価し、前回との差を残してください。',
    };
  }

  return {
    id: `live-first-profile-${draft.id}`, type: 'roast', priority: 'low', color: COLORS.roast,
    title: 'Experiment Complete',
    message: `1st CrackからDropまで ${draft.developmentTime} を記録しました。Day7前後に味を残すと、このプロファイルを次の基準にできます。`,
    reason: `Dev% ${formatNumber(draft.developmentRatio)}%／Loss ${formatNumber(draft.lossRatio)}%。`, relatedRoastId: draft.id,
    observation: `Dev% ${formatNumber(draft.developmentRatio)}%、Loss ${formatNumber(draft.lossRatio)}%を記録しました。`,
    interpretation: '同じ豆の比較記録がまだ少ないため、現時点ではこの数値を基準候補として扱います。',
    nextExperiment: 'Day7前後にテイスティングし、甘さ・酸の明るさ・後味を記録してください。',
  };
}

export function getTastingCoachInsight(roast: Roast, tasting: Tasting): CoachInsight {
  if (tasting.flavors.length === 0) {
    return {
      id: `tasting-flavor-${tasting.id}`, type: 'learning', priority: 'low', color: COLORS.learning,
      title: 'Tasting logged',
      message: 'スコアを保存しました。次回、フレーバーを一つでも選ぶと、味の変化を言葉でも比較しやすくなります。',
      reason: `Day ${tasting.dayAfterRoast}／${formatNumber(tasting.score)}点。フレーバーは未選択です。`, relatedRoastId: roast.id,
      observation: `Day ${tasting.dayAfterRoast}、${formatNumber(tasting.score)}点として保存しました。フレーバーは未選択です。`,
      interpretation: '点数は比較できますが、味がどう変化したかを説明する材料はまだ不足しています。',
      nextExperiment: '次回は最も強く感じたフレーバーを一つだけでも選び、後味と一緒に残してください。',
    };
  }
  if (tasting.negatives.length > 0) {
    return {
      id: `tasting-note-${tasting.id}`, type: 'experiment', priority: 'medium', color: COLORS.experiment,
      title: 'Tasting logged',
      message: `「${tasting.negatives.slice(0, 2).join(' / ')}」をメモしました。次回は焙煎条件を一つだけ変えて、同じ観点で比べると実験になります。`,
      reason: `Day ${tasting.dayAfterRoast}／${formatNumber(tasting.score)}点／フレーバー ${tasting.flavors.slice(0, 3).join('、')}。`, relatedRoastId: roast.id,
      observation: `Day ${tasting.dayAfterRoast}、${formatNumber(tasting.score)}点。「${tasting.negatives.slice(0, 2).join(' / ')}」が記録されています。`,
      interpretation: 'ネガティブ要素の原因はこの1件だけでは断定できませんが、次の比較観点として使えます。',
      nextExperiment: '次回は焙煎条件を一つだけ変え、同じ抽出条件・同じ観点で再評価してください。',
    };
  }
  return {
    id: `tasting-complete-${tasting.id}`, type: 'tasting', priority: 'low', color: COLORS.tasting,
    title: 'Tasting logged',
    message: `Day ${tasting.dayAfterRoast} の印象を保存しました。次のテイスティングでも同じフレーバーや後味を見ていくと、エイジングの変化を追えます。`,
    reason: `${formatNumber(tasting.score)}点／フレーバー ${tasting.flavors.slice(0, 3).join('、')}。`, relatedRoastId: roast.id,
    observation: `Day ${tasting.dayAfterRoast}、${formatNumber(tasting.score)}点。主な印象は ${tasting.flavors.slice(0, 3).join('、')} です。`,
    interpretation: 'この記録が同じバッチの味の基準になります。次回と並べることでエイジングの変化を確認できます。',
    nextExperiment: '次回も同じ抽出条件で、今回のフレーバーと後味が強まるか弱まるかを確認してください。',
  };
}

export function nextTastingDate(roast: Roast, targetDay = 7): string {
  return addDateDays(roast.roastDate, targetDay);
}
