import { Roast, Tasting } from '@/types';

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

export async function analyzeRoast(roast: Roast, tastings: Tasting[]): Promise<AICoachResult> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const suggestions: AISuggestion[] = [];
  const nextProfileTips: string[] = [];

  if (roast.lossRatio > 18) {
    suggestions.push({
      aspect: 'Loss',
      icon: 'scale',
      current: `${roast.lossRatio}%`,
      target: '14-17%',
      action: '減耗が高めです。次回はDropを少し早めるか、終盤の火力を控えめにして比較してみましょう。',
      severity: 'warning',
    });
  }

  if (roast.developmentRatio === null || !roast.firstCrackTime) {
    suggestions.push({
      aspect: '1st Crack',
      icon: 'ear',
      current: '不明',
      target: '記録できる範囲でOK',
      action: '1st Crackが不明なのでDev%は計算しません。次回は音に加えて香り、煙、色、豆表面の変化もメモしてみましょう。',
      severity: 'info',
    });
    nextProfileTips.push('小型焙煎機では1st Crackが聞き取りにくいことがあります。聞こえない場合も不明として残せば比較できます。');
  } else if (roast.developmentRatio > 22) {
    suggestions.push({
      aspect: 'Dev%',
      icon: 'timer',
      current: `${roast.developmentRatio}%`,
      target: '14-20%',
      action: 'Dev%が高めです。ビターや鈍さが出る場合はDropを少し早めて比較してください。',
      severity: 'warning',
    });
  } else if (roast.developmentRatio < 12) {
    suggestions.push({
      aspect: 'Dev%',
      icon: 'timer',
      current: `${roast.developmentRatio}%`,
      target: '14-20%',
      action: 'Dev%が低めです。酸が鋭い場合は1st Crack後を少し伸ばしてみましょう。',
      severity: 'warning',
    });
  }

  const completed = tastings.filter(tasting => tasting.status === 'completed');
  if (completed.length > 0) {
    const best = completed.reduce((a, b) => a.score > b.score ? a : b);
    nextProfileTips.push(`一番高い評価はDay ${best.dayAfterRoast}の${best.score}点です。近い条件を再現候補にできます。`);
  } else {
    nextProfileTips.push('テイスティング記録がまだ少ないため、分析精度は低めです。飲んだ日に短いメモだけでも残すと傾向が見えます。');
  }

  const warningCount = suggestions.filter(item => item.severity === 'warning').length;
  const score: AICoachResult['score'] = warningCount >= 2 ? 'needs_improvement' : warningCount === 1 ? 'good' : 'excellent';
  const summary = warningCount > 0
    ? '改善候補があります。次回は一度に変える条件を少なくすると比較しやすくなります。'
    : '大きな警告はありません。テイスティングの変化を追加すると、次の仮説が立てやすくなります。';

  return { summary, score, suggestions, nextProfileTips };
}
