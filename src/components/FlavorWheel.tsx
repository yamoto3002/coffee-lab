'use client';

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
  const wheelBackground = `conic-gradient(${FLAVOR_CATEGORIES.map((item, index) => `${item.color} ${index * segment}deg ${(index + 1) * segment - 1.4}deg, #111821 ${(index + 1) * segment - 1.4}deg ${(index + 1) * segment}deg`).join(',')})`;

  return (
    <div className="flavor-lab" style={{ '--flavor-accent': category.color } as React.CSSProperties}>
      <div className="flavor-wheel-stage" aria-label="Coffee Lab フレーバーカテゴリ">
        <div className="flavor-wheel-ring" style={{ background: wheelBackground }} aria-hidden="true" />
        <div className="flavor-wheel-core">
          <span>TASTE MAP</span>
          <strong>{category.label}</strong>
          <small>{selected.length}/6 selected</small>
        </div>
        {FLAVOR_CATEGORIES.map((item, index) => {
          const angle = (index * segment - 90) * Math.PI / 180;
          const left = 50 + Math.cos(angle) * 42;
          const top = 50 + Math.sin(angle) * 42;
          const active = item.name === category.name;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onCategoryChange(item.name, item.subcategories[0].name)}
              className={`flavor-wheel-node tap-button ${active ? 'is-active' : ''}`}
              style={{ left: `${left}%`, top: `${top}%`, borderColor: item.color, color: active ? '#081016' : item.color, backgroundColor: active ? item.color : '#111821' }}
              aria-pressed={active}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" aria-label={`${category.label} サブカテゴリ`}>
        {category.subcategories.map(item => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSubcategoryChange(item.name)}
            className={`tap-button shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold ${item.name === subcategory.name ? 'text-white' : 'border-white/10 bg-white/[0.035] text-slate-400'}`}
            style={item.name === subcategory.name ? { borderColor: `${category.color}88`, backgroundColor: `${category.color}24`, color: category.color } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {subcategory.flavors.map(flavor => {
          const active = selected.includes(flavor.label);
          return (
            <button
              key={flavor.name}
              type="button"
              onClick={() => onToggle(flavor.label)}
              className={`tap-button min-h-12 min-w-0 rounded-xl border px-3 py-2 text-sm font-semibold ${active ? 'text-[#071015]' : 'text-slate-200'}`}
              style={{ borderColor: `${category.color}66`, backgroundColor: active ? category.color : `${category.color}12` }}
              aria-pressed={active}
            >
              <span className="block truncate">{flavor.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-8 flex-wrap gap-2" aria-live="polite">
        {selected.map(label => (
          <button key={label} type="button" onClick={() => onRemove(label)} className="tap-button inline-flex min-w-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: `${flavorColor(label)}66`, backgroundColor: `${flavorColor(label)}18`, color: flavorColor(label) }}>
            <span className="max-w-36 truncate">{label}</span><X className="h-3 w-3 shrink-0" />
          </button>
        ))}
        {selected.length === 0 && <span className="text-xs text-slate-500">カテゴリから、印象に近い言葉を最大6個選べます。</span>}
      </div>
    </div>
  );
}
