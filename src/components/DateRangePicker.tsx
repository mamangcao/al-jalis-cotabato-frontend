import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayDate } from '../utils/dateUtils';

export type DateRangePreset = 
  | 'all_time' 
  | 'ytd' 
  | 'mtd' 
  | 'last_30_days' 
  | 'last_7_days' 
  | 'today' 
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
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

  const presets: { id: DateRangePreset; label: string; getValue: () => DateRange }[] = [
    { 
      id: 'all_time', 
      label: 'All Time', 
      getValue: () => ({ preset: 'all_time', startDate: null, endDate: endOfDay(new Date()) }) 
    },
    { 
      id: 'ytd', 
      label: 'Year to Date', 
      getValue: () => ({ preset: 'ytd', startDate: startOfYear(new Date()), endDate: endOfDay(new Date()) }) 
    },
    { 
      id: 'mtd', 
      label: 'Month to Date', 
      getValue: () => ({ preset: 'mtd', startDate: startOfMonth(new Date()), endDate: endOfDay(new Date()) }) 
    },
    { 
      id: 'last_30_days', 
      label: 'Last 30 Days', 
      getValue: () => ({ preset: 'last_30_days', startDate: startOfDay(subDays(new Date(), 29)), endDate: endOfDay(new Date()) }) 
    },
    { 
      id: 'last_7_days', 
      label: 'Last 7 Days', 
      getValue: () => ({ preset: 'last_7_days', startDate: startOfDay(subDays(new Date(), 6)), endDate: endOfDay(new Date()) }) 
    },
    { 
      id: 'today', 
      label: 'Today', 
      getValue: () => ({ preset: 'today', startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) }) 
    },
  ];

  const handlePresetClick = (presetItem: typeof presets[0]) => {
    onChange(presetItem.getValue());
    setIsOpen(false);
  };

  const formatDateLabel = () => {
    if (dateRange.preset === 'all_time' || (!dateRange.startDate && !dateRange.endDate)) return 'All Time';
    if (dateRange.preset === 'ytd') return 'Year to Date';
    if (dateRange.preset === 'mtd') return 'Month to Date';
    if (dateRange.preset === 'last_30_days') return 'Last 30 Days';
    if (dateRange.preset === 'last_7_days') return 'Last 7 Days';
    if (dateRange.preset === 'today') return 'Today';
    if (dateRange.startDate && dateRange.endDate) {
      return `${formatDisplayDate(dateRange.startDate)} - ${formatDisplayDate(dateRange.endDate)}`;
    }
    if (dateRange.startDate) {
      return `From ${formatDisplayDate(dateRange.startDate)}`;
    }
    if (dateRange.endDate) {
      return `Until ${formatDisplayDate(dateRange.endDate)}`;
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
                {presets.map((presetItem) => {
                  const isActive = dateRange.preset === presetItem.id;
                  return (
                    <button
                      key={presetItem.id}
                      onClick={() => handlePresetClick(presetItem)}
                      className={`flex items-center justify-between text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span>{presetItem.label}</span>
                      {isActive && <Check size={14} className="text-orange-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Range</h3>
                {dateRange.preset === 'custom' && (
                  <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-100 px-1.5 py-0.5 rounded">Active</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate ? format(dateRange.startDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const newStart = startOfDay(new Date(val));
                      let newEnd = dateRange.endDate;
                      if (newEnd && isBefore(newEnd, newStart)) {
                        newEnd = endOfDay(newStart);
                      }
                      onChange({
                        preset: 'custom',
                        startDate: newStart,
                        endDate: newEnd || endOfDay(newStart)
                      });
                    }}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate ? format(dateRange.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const newEnd = endOfDay(new Date(val));
                      let newStart = dateRange.startDate;
                      if (newStart && isAfter(newStart, newEnd)) {
                        newStart = startOfDay(newEnd);
                      }
                      onChange({
                        preset: 'custom',
                        startDate: newStart || startOfDay(newEnd),
                        endDate: newEnd
                      });
                    }}
                    className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
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
