import React, { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<K extends string> {
  key: K;
  direction: SortDirection;
}

type SortAccessors<T, K extends string> = Record<K, (item: T) => unknown>;

const parseDateValue = (value: unknown): number | null => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !trimmed.includes('/')) return null;

  const time = new Date(trimmed).getTime();
  return Number.isNaN(time) ? null : time;
};

export const compareSortValues = (left: unknown, right: unknown): number => {
  if (left === right) return 0;
  if (left === undefined || left === null || left === '') return 1;
  if (right === undefined || right === null || right === '') return -1;

  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);
  if (leftDate !== null && rightDate !== null) return leftDate - rightDate;

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), 'es-MX', {
    sensitivity: 'base',
    numeric: true
  });
};

export const useSortableData = <T, K extends string>(
  items: T[],
  accessors: SortAccessors<T, K>,
  initialSort: SortConfig<K>
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<K>>(initialSort);

  const sortedItems = useMemo(() => {
    const accessor = accessors[sortConfig.key];
    if (!accessor) return items;

    const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
    return [...items].sort((left, right) => {
      return compareSortValues(accessor(left), accessor(right)) * directionMultiplier;
    });
  }, [items, accessors, sortConfig]);

  const requestSort = (key: K) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return { sortedItems, sortConfig, requestSort };
};

interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  sortConfig: SortConfig<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const SortableTh = <K extends string>({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = '',
  align = 'left'
}: SortableThProps<K>) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive
    ? sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
    : 'unfold_more';
  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 ${justifyClass} text-inherit font-inherit uppercase tracking-inherit hover:text-slate-900 transition-colors`}
        aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        <span className={`material-symbols-outlined ui-icon text-sm ${isActive ? 'text-primary' : 'text-slate-300'}`} aria-hidden="true">
          {icon}
        </span>
      </button>
    </th>
  );
};
