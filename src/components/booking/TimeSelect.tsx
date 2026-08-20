'use client';

import { useState } from 'react';
import { SLOT_MINUTES } from '@/lib/utils/constants';
import type { Locale } from '@/lib/utils/constants';
import { formatLocalizedShortDate } from '@/lib/utils/dateUtils';
import { DatePickerSheet } from './DatePickerSheet';

interface Props {
  label:    string;
  value:    Date;
  onChange: (date: Date) => void;
  locale:   Locale;
}

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 / SLOT_MINUTES }, (_, i) => i * SLOT_MINUTES);

/**
 * Locale-safe replacement for `<input type="datetime-local">` — that native control
 * renders its picker/value using the OS/browser locale (not the app's locale setting),
 * which is what caused German users to see mm/dd/yyyy + AM/PM. Rendering the option
 * text ourselves removes that leak entirely and enforces SLOT_MINUTES granularity.
 */
export function TimeSelect({ label, value, onChange, locale }: Props) {
  const [showDate, setShowDate] = useState(false);

  function setHour(h: number) {
    const d = new Date(value);
    d.setHours(h);
    onChange(d);
  }

  function setMinute(m: number) {
    const d = new Date(value);
    d.setMinutes(m, 0, 0);
    onChange(d);
  }

  function setDate(day: Date) {
    const d = new Date(day);
    d.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(d);
  }

  const roundedMinute = Math.floor(value.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES;

  return (
    <div>
      <label className="block text-sm font-semibold text-text-primary mb-1.5">{label}</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setShowDate(true)}
          className="input-base text-sm flex-1 text-left truncate"
        >
          {formatLocalizedShortDate(value, locale)}
        </button>
        <select
          className="input-base text-sm w-[4.5rem] flex-shrink-0"
          value={value.getHours()}
          onChange={(e) => setHour(Number(e.target.value))}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className="input-base text-sm w-[4.5rem] flex-shrink-0"
          value={roundedMinute}
          onChange={(e) => setMinute(Number(e.target.value))}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>

      {showDate && (
        <DatePickerSheet
          selected={value}
          onSelect={setDate}
          onClose={() => setShowDate(false)}
        />
      )}
    </div>
  );
}
