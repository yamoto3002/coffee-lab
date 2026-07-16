import { Scale, TriangleAlert } from 'lucide-react';
import { Bean, Roast, Tasting } from '@/types';
import { getRoastBatchBalance } from '@/lib/db';

const grams = (value: number) => `${value.toFixed(1)}g`;

export default function BatchBalance({ roast, tastings, bean }: { roast: Roast; tastings: Tasting[]; bean?: Bean | null }) {
  const balance = getRoastBatchBalance(roast, tastings, bean);
  return (
    <section className="batch-balance" aria-label="焙煎豆の予想残量">
      <div className="batch-balance-main">
        <span className="batch-balance-label"><Scale className="h-4 w-4" />予想残量</span>
        <strong>{grams(balance.remainingGrams)}</strong>
        <span>{balance.remainingRatio}% · 約{balance.estimatedServings}回分</span>
      </div>
      <dl className="batch-balance-facts">
        <div><dt>{balance.baseKind === 'measured' ? '実測焙煎後重量' : '予想焙煎後重量'}</dt><dd>{grams(balance.baseWeight)}</dd></div>
        <div><dt>使用済み</dt><dd>{grams(balance.usedGrams)}</dd></div>
        <div><dt>1回の目安</dt><dd>{grams(balance.servingDose)}</dd></div>
      </dl>
      {balance.missingDoseCount > 0 && <p className="batch-balance-note"><TriangleAlert className="h-4 w-4" />使用量未入力の記録が{balance.missingDoseCount}件あります。残量は暫定値です。</p>}
      {balance.overageGrams > 0 && <p className="batch-balance-note is-error"><TriangleAlert className="h-4 w-4" />記録された使用量が焙煎後重量を{grams(balance.overageGrams)}上回っています。記録を確認してください。</p>}
    </section>
  );
}
