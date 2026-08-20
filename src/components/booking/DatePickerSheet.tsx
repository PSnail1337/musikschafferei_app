'use client';

import { useState } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isToday, startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useSettingsStore } from '@/store/settingsStore';
import { formatLocalizedMonthYear } from '@/lib/utils/dateUtils';
import { useT } from '@/lib/hooks/useTranslation';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  onClose:  () => void;
}

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePickerSheet({ selected, onSelect, onClose }: Props) {
  const locale = useSettingsStore((s) => s.locale);
  const t = useT();
  const WEEKDAYS = locale === 'de' ? WEEKDAYS_DE : WEEKDAYS_EN;
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  const days      = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDow  = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Monday-first offset

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[45]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Tap-outside backdrop */}
        <div className="absolute inset-0" />

        <motion.div
          className="absolute top-[56px] left-0 right-0 mx-auto max-w-sm bg-surface border-b border-border shadow-card-lg px-4 pt-3 pb-4"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="btn-ghost p-1.5"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-text-primary capitalize">
              {formatLocalizedMonthYear(viewMonth, locale)}
            </span>
            <button
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="btn-ghost p-1.5"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-text-tertiary py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const sel = isSameDay(day, selected);
              const tod = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => { onSelect(startOfDay(day)); onClose(); }}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 mx-auto rounded-full text-xs font-medium transition-all',
                    sel  ? 'bg-brand-500 text-white'
                    : tod ? 'text-brand-500 font-bold hover:bg-surface-3'
                          : 'text-text-primary hover:bg-surface-3',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Jump to today */}
          {!isToday(selected) && (
            <button
              onClick={() => { onSelect(startOfDay(new Date())); onClose(); }}
              className="mt-3 w-full text-xs text-brand-500 font-semibold py-1.5 hover:bg-brand-500/5 rounded-[8px] transition-colors"
            >
              {t('Heute')}
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
