'use client';

import { KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { FLAVOR_CATEGORIES, flavorColor } from '@/lib/flavorWheel';

type FlavorWheelProps = {
  activeCategory: string;
  activeSubcategory: string;
  selected: string[];
  onCategoryChange: (category: string, firstSubcategory: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  onToggle: (flavor: string) => void;
  onRemove: (flavor: string) => void;
};

function polarPoint(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) };
}

function donutPath(startAngle: number, endAngle: number, innerRadius = 25, outerRadius = 47) {
  const outerStart = polarPoint(outerRadius, startAngle);
  const outerEnd = polarPoint(outerRadius, endAngle);
  const innerEnd = polarPoint(innerRadius, endAngle);
  const innerStart = polarPoint(innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function activateWithKeyboard(event: KeyboardEvent<SVGPathElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
}

export default function FlavorWheel({
  activeCategory,
  activeSubcategory,
  selected,
  onCategoryChange,
  onSubcategoryChange,
  onToggle,
  onRemove,
}: FlavorWheelProps) {
  const category = FLAVOR_CATEGORIES.find(item => item.name === activeCategory) || FLAVOR_CATEGORIES[0];
  const subcategory = category.subcategories.find(item => item.name === activeSubcategory) || category.subcategories[0];
  const segment = 360 / FLAVOR_CATEGORIES.length;

  return (
    <div className="flavor-lab" style={{ '--flavor-accent': category.color } as React.CSSProperties}>
      <div className="flavor-wheel-stage">
        <svg className="flavor-wheel-svg" viewBox="0 0 100 100" role="group" aria-label="フレーバーカテゴリを選択">
          {FLAVOR_CATEGORIES.map((item, index) => {
            const start = index * segment + 0.8;
            const end = (index + 1) * segment - 0.8;
            const midpoint = start + (end - start) / 2;
            const labelPoint = polarPoint(36, midpoint);
            const active = item.name === category.name;
            const selectCategory = () => onCategoryChange(item.name, item.subcategories[0].name);
            return (
              <g key={item.name}>
                <path
                  d={donutPath(start, end)}
                  fill={item.color}
                  className={`flavor-wheel-segment ${active ? 'is-active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.label}カテゴリ`}
                  aria-pressed={active}
                  data-testid={`flavor-category-${item.name}`}
                  onClick={selectCategory}
                  onKeyDown={event => activateWithKeyboard(event, selectCategory)}
                />
                <text x={labelPoint.x} y={labelPoint.y} className="flavor-wheel-label" textAnchor="middle" dominantBaseline="middle">
                  {item.label.length > 10 ? item.label.slice(0, 8) : item.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flavor-wheel-core" aria-hidden="true">
          <span>FLAVOR</span>
          <strong>{category.label}</strong>
          <small>{selected.length} / 6</small>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">2. Character</p>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label={`${category.label}のサブカテゴリ`}>
          {category.subcategories.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() => onSubcategoryChange(item.name)}
              className={`tap-button shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold ${item.name === subcategory.name ? '' : 'border-white/10 bg-white/[0.025] text-slate-400'}`}
              style={item.name === subcategory.name ? { borderColor: `${category.color}88`, backgroundColor: `${category.color}1f`, color: category.color } : undefined}
              aria-pressed={item.name === subcategory.name}
              data-testid={`flavor-subcategory-${item.name}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">3. Note</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {subcategory.flavors.map(flavor => {
            const active = selected.includes(flavor.label);
            const limitReached = selected.length >= 6 && !active;
            return (
              <button
                key={flavor.name}
                type="button"
                onClick={() => onToggle(flavor.label)}
                disabled={limitReached}
                className={`tap-button min-h-12 min-w-0 rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'text-[#120d09]' : 'text-slate-200'}`}
                style={{ borderColor: `${category.color}58`, backgroundColor: active ? category.color : `${category.color}0e` }}
                aria-pressed={active}
                data-testid={`flavor-note-${flavor.name}`}
              >
                <span className="block truncate">{flavor.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 min-h-10 border-t border-white/[0.07] pt-4" aria-live="polite">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">Selected</p>
        <div className="flex flex-wrap gap-2">
          {selected.map(label => (
            <button key={label} type="button" onClick={() => onRemove(label)} className="tap-button inline-flex min-w-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: `${flavorColor(label)}55`, backgroundColor: `${flavorColor(label)}12`, color: flavorColor(label) }} aria-label={`${label}を削除`}>
              <span className="max-w-36 truncate">{label}</span><X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          {selected.length === 0 && <span className="text-xs text-slate-500">円をタップして、具体的な香味を最大6個選択できます。</span>}
        </div>
      </div>
    </div>
  );
}
