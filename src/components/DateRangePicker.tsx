import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const presets = [
    { label: 'Today', getValue: () => ({ startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) }) },
    { label: 'Last 7 Days', getValue: () => ({ startDate: startOfDay(subDays(new Date(), 6)), endDate: endOfDay(new Date()) }) },
    { label: 'This Month', getValue: () => ({ startDate: startOfMonth(new Date()), endDate: endOfDay(new Date()) }) },
    { label: 'Year to Date', getValue: () => ({ startDate: startOfYear(new Date()), endDate: endOfDay(new Date()) }) },
    { label: 'All Time', getValue: () => ({ startDate: null, endDate: null }) },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const formatDateLabel = () => {
    if (!dateRange.startDate && !dateRange.endDate) return 'All Time';
    if (dateRange.startDate && dateRange.endDate) {
      return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
    }
    if (dateRange.startDate) {
      return `From ${format(dateRange.startDate, 'MMM d, yyyy')}`;
    }
    if (dateRange.endDate) {
      return `Until ${format(dateRange.endDate, 'MMM d, yyyy')}`;
    }
    return 'Select Date Range';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium focus:outline-none"
      >
        <Calendar size={16} className="text-gray-500" />
        <span className="w-[130px] sm:w-[150px] truncate text-left">{formatDateLabel()}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Presets</h3>
              <div className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Custom Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate ? format(dateRange.startDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({
                        ...dateRange,
                        startDate: val ? startOfDay(new Date(val)) : null
                      });
                    }}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate ? format(dateRange.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange({
                        ...dateRange,
                        endDate: val ? endOfDay(new Date(val)) : null
                      });
                    }}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
