'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FLAVOR_CATEGORIES, FlavorLeaf, FlavorSubcategory, flavorColor } from '@/lib/flavorWheel';

type FlavorWheelProps = {
  activeCategory: string;
  activeSubcategory: string;
  selected: string[];
  onCategoryChange: (category: string, firstSubcategory: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  onToggle: (flavor: string) => void;
  onRemove: (flavor: string) => void;
};

type RingItem = {
  key: string;
  label: string;
  color: string;
  selected: boolean;
  testId: string;
  ariaLabel: string;
  onSelect: () => void;
};

type Ring = {
  innerRadius: number;
  outerRadius: number;
  items: RingItem[];
  name: string;
};

function polarPoint(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) };
}

function donutPath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) {
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

function splitLabel(label: string) {
  if (label.length <= 9) return [label];
  const words = label.split(/[\s/]+/).filter(Boolean);
  if (words.length >= 2) {
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
  }
  return [label.slice(0, Math.ceil(label.length / 2)), label.slice(Math.ceil(label.length / 2))];
}

function RingLayer({ ring }: { ring: Ring }) {
  const segmentSize = 360 / ring.items.length;
  const labelRadius = ring.name === 'flavor'
    ? ring.outerRadius - 3.2
    : (ring.innerRadius + ring.outerRadius) / 2;
  const fontSize = ring.name === 'category' ? 2.85 : ring.name === 'subcategory' ? 3.1 : 3.2;

  return (
    <g className={`flavor-ring flavor-ring-${ring.name}`} aria-label={`${ring.name} ring`}>
      {ring.items.map((item, index) => {
        const gap = ring.items.length > 8 ? 0.7 : 1.1;
        const start = index * segmentSize + gap;
        const end = (index + 1) * segmentSize - gap;
        const midpoint = start + (end - start) / 2;
        const point = polarPoint(labelRadius, midpoint);
        const lines = splitLabel(item.label);
        const widest = Math.max(...lines.map(line => line.length));
        const frameWidth = Math.min(18, Math.max(7, widest * fontSize * 0.52 + 2));
        const frameHeight = lines.length === 1 ? 5.6 : 8.1;

        return (
          <g key={item.key} className={item.selected ? 'is-selected' : undefined}>
            <path
              d={donutPath(start, end, ring.innerRadius, ring.outerRadius)}
              fill={item.color}
              className="flavor-wheel-segment"
              role="button"
              tabIndex={0}
              aria-label={item.ariaLabel}
              aria-pressed={item.selected}
              data-testid={item.testId}
              style={{ outline: 'none' }}
              onClick={item.onSelect}
              onKeyDown={event => activateWithKeyboard(event, item.onSelect)}
            />
            <rect
              x={point.x - frameWidth / 2}
              y={point.y - frameHeight / 2}
              width={frameWidth}
              height={frameHeight}
              rx="1.1"
              className="flavor-label-frame"
              aria-hidden="true"
            />
            <text
              x={point.x}
              y={point.y}
              className="flavor-wheel-label"
              style={{ fontSize: `${fontSize}px` }}
              textAnchor="middle"
              dominantBaseline="middle"
              aria-hidden="true"
            >
              {lines.map((line, lineIndex) => (
                <tspan
                  key={line}
                  x={point.x}
                  dy={lines.length === 1 ? 0 : lineIndex === 0 ? '-0.58em' : '1.16em'}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </g>
  );
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
  const [depth, setDepth] = useState<1 | 2 | 3>(1);
  const category = FLAVOR_CATEGORIES.find(item => item.name === activeCategory) || FLAVOR_CATEGORIES[0];
  const subcategory = category.subcategories.find(item => item.name === activeSubcategory) || category.subcategories[0];

  useEffect(() => {
    if (!category.subcategories.some(item => item.name === activeSubcategory)) {
      onSubcategoryChange(category.subcategories[0].name);
    }
  }, [activeSubcategory, category, onSubcategoryChange]);

  const selectCategory = (name: string, subcategories: FlavorSubcategory[]) => {
    onCategoryChange(name, subcategories[0].name);
    setDepth(current => current === 1 ? 2 : 1);
  };

  const selectSubcategory = (item: FlavorSubcategory) => {
    onSubcategoryChange(item.name);
    setDepth(current => current === 2 ? 3 : 2);
  };

  const selectFlavor = (item: FlavorLeaf) => {
    if (!selected.includes(item.label)) onToggle(item.label);
  };

  const rings: Ring[] = (() => {
    const categoryRadius = depth === 1
      ? { innerRadius: 16, outerRadius: 48 }
      : depth === 2
        ? { innerRadius: 34, outerRadius: 48 }
        : { innerRadius: 33, outerRadius: 48 };

    const output: Ring[] = [{
      name: 'category',
      ...categoryRadius,
      items: FLAVOR_CATEGORIES.map(item => ({
        key: item.name,
        label: item.label,
        color: item.color,
        selected: depth > 1 && item.name === category.name,
        testId: `flavor-category-${item.name}`,
        ariaLabel: `${item.label}カテゴリ${depth > 1 ? '。タップするとカテゴリ選択へ戻ります' : ''}`,
        onSelect: () => selectCategory(item.name, item.subcategories),
      })),
    }];

    if (depth >= 2) {
      output.push({
        name: 'subcategory',
        innerRadius: depth === 2 ? 10 : 17,
        outerRadius: depth === 2 ? 32 : 31.5,
        items: category.subcategories.map(item => ({
          key: item.name,
          label: item.label,
          color: category.color,
          selected: depth === 3 && item.name === subcategory.name,
          testId: `flavor-subcategory-${item.name}`,
          ariaLabel: `${item.label}${depth === 3 ? '。タップすると印象選択へ戻ります' : ''}`,
          onSelect: () => selectSubcategory(item),
        })),
      });
    }

    if (depth === 3) {
      output.push({
        name: 'flavor',
        innerRadius: 2,
        outerRadius: 15.5,
        items: subcategory.flavors.map(item => ({
          key: item.name,
          label: item.label,
          color: category.color,
          selected: selected.includes(item.label),
          testId: `flavor-note-${item.name}`,
          ariaLabel: `${item.label}${selected.includes(item.label) ? '、選択済み' : 'を選択'}`,
          onSelect: () => selectFlavor(item),
        })),
      });
    }

    return output;
  })();

  return (
    <div className="flavor-lab" style={{ '--flavor-accent': category.color } as React.CSSProperties}>
      <div className="flavor-wheel-stage">
        <svg className="flavor-wheel-svg" viewBox="0 0 100 100" role="group" aria-label={`${depth}層のフレーバーホイール`}>
          <circle cx="50" cy="50" r="48.6" className="flavor-wheel-outline" aria-hidden="true" />
          {rings.map(ring => <RingLayer key={ring.name} ring={ring} />)}
          {depth === 1 && <circle cx="50" cy="50" r="12.5" className="flavor-wheel-core-mark" aria-hidden="true" />}
        </svg>
        <div className="flavor-depth" aria-live="polite">
          <span>{depth} / 3</span>
          <strong>{depth === 1 ? 'カテゴリ' : depth === 2 ? category.label : subcategory.label}</strong>
        </div>
      </div>

      <div className="selected-flavors" aria-live="polite">
        <div className="selected-flavors-head">
          <p>選択した香味</p>
          {selected.length > 0 && <span>{selected.length}</span>}
        </div>
        <div className="selected-flavor-list">
          {selected.map(label => (
            <button
              key={label}
              type="button"
              onClick={() => onRemove(label)}
              className="tap-button selected-flavor"
              style={{ '--chip-color': flavorColor(label) } as React.CSSProperties}
              aria-label={`${label}を削除`}
            >
              <span>{label}</span><X className="h-3.5 w-3.5 shrink-0" />
            </button>
          ))}
          {selected.length === 0 && <span className="selected-flavors-empty">香味はまだ選択されていません。</span>}
        </div>
      </div>
    </div>
  );
}
