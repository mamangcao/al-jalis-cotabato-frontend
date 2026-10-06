import { subDays, isAfter, isBefore } from 'date-fns';

export interface TrendResult {
  currentCount: number;
  previousCount: number;
  percentageChange: number | null;
  trendText: string;
  isPositive: boolean | null;
}

/**
 * Segments data into two buckets based on timestamps: 
 * "Current Period" (last X days) and "Previous Period" (the X days before that).
 * Calculates the percentage change and generates a display string.
 */
export function calculateTrend(
  items: any[],
  dateKey: string = 'createdAt',
  startDate?: Date | null,
  endDate?: Date | null
): TrendResult {
  const currentEnd = endDate || new Date();
  
  // If no start date, we can't calculate a meaningful "previous" period.
  // We'll just return the total count for the period (which is All Time up to currentEnd)
  if (!startDate) {
    let count = 0;
    items.forEach(item => {
      if (!item[dateKey]) return;
      const itemDate = new Date(item[dateKey]);
      if (isBefore(itemDate, currentEnd) || itemDate.getTime() === currentEnd.getTime()) {
        count++;
      }
    });
    return {
      currentCount: count,
      previousCount: 0,
      percentageChange: null,
      trendText: 'All time',
      isPositive: null
    };
  }

  const durationMs = currentEnd.getTime() - startDate.getTime();
  const previousStart = new Date(startDate.getTime() - durationMs);
  
  // For display text logic, figure out roughly what the period is
  const daysDiff = Math.round(durationMs / (1000 * 60 * 60 * 24));
  let periodText = 'period';
  if (daysDiff <= 1) periodText = 'yesterday';
  else if (daysDiff <= 7) periodText = 'last week';
  else if (daysDiff <= 31) periodText = 'last month';
  else if (daysDiff <= 366) periodText = 'last year';

  let currentCount = 0;
  let previousCount = 0;

  items.forEach(item => {
    if (!item[dateKey]) return;
    const itemDate = new Date(item[dateKey]);

    // Current period
    if ((isAfter(itemDate, startDate) || itemDate.getTime() === startDate.getTime()) && 
        (isBefore(itemDate, currentEnd) || itemDate.getTime() === currentEnd.getTime())) {
      currentCount++;
    } 
    // Previous period
    else if ((isAfter(itemDate, previousStart) || itemDate.getTime() === previousStart.getTime()) && 
             isBefore(itemDate, startDate)) {
      previousCount++;
    }
  });

  let percentageChange: number | null = null;
  let trendText = '';
  let isPositive: boolean | null = null;

  if (previousCount === 0) {
    if (currentCount === 0) {
      trendText = 'No change';
      isPositive = null;
    } else {
      trendText = `+${currentCount} this ${periodText === 'yesterday' ? 'today' : periodText.replace('last ', '')}`;
      isPositive = true;
    }
  } else {
    percentageChange = ((currentCount - previousCount) / previousCount) * 100;
    const rounded = Math.round(percentageChange);
    
    if (rounded === 0) {
      trendText = 'Stable';
      isPositive = null;
    } else if (rounded > 0) {
      trendText = `${rounded}% vs ${periodText}`;
      isPositive = true;
    } else {
      trendText = `${Math.abs(rounded)}% vs ${periodText}`;
      isPositive = false;
    }
  }

  return {
    currentCount,
    previousCount,
    percentageChange,
    trendText,
    isPositive
  };
}
