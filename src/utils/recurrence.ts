import { addDays, addWeeks, addMonths, addYears, isSameDay } from 'date-fns';

export const generateInstances = (events: any[], windowStart: Date, windowEnd: Date) => {
  const instances: any[] = [];
  const masters = events.filter(e => !e.exceptionType);
  const exceptions = events.filter(e => e.exceptionType);

  masters.forEach(master => {
    if (!master.isRecurring || !master.recurrence) {
      if (new Date(master.start) <= windowEnd && new Date(master.end) >= windowStart) {
        instances.push({
          ...master,
          start: new Date(master.start),
          end: new Date(master.end)
        });
      }
      return;
    }

    let currentStart = new Date(master.start);
    let currentEnd = new Date(master.end);
    let count = 0;
    const duration = currentEnd.getTime() - currentStart.getTime();

    while (true) {
      if (master.recurrence.endCondition === 'count' && count >= (master.recurrence.count || 1)) break;
      if (master.recurrence.endCondition === 'until' && master.recurrence.endDate) {
        // use endOfDay for the until condition to be inclusive
        const untilDate = new Date(master.recurrence.endDate);
        untilDate.setHours(23, 59, 59, 999);
        if (currentStart > untilDate) break;
      }
      if (currentStart > windowEnd) break;

      if (currentEnd >= windowStart && currentStart <= windowEnd) {
        const exception = exceptions.find(ex => ex.groupId === master.id && isSameDay(new Date(ex.originalStart), currentStart));
        
        if (!exception) {
          instances.push({
            ...master,
            id: `${master.id}_${currentStart.getTime()}`,
            start: new Date(currentStart),
            end: new Date(currentStart.getTime() + duration),
            masterId: master.id,
            isInstance: true,
            originalStart: new Date(currentStart)
          });
        } else if (exception.exceptionType === 'modified') {
          instances.push({
            ...exception,
            id: exception.id,
            masterId: master.id,
            isInstance: true,
            originalStart: new Date(currentStart),
            start: new Date(exception.start),
            end: new Date(exception.end)
          });
        }
      }

      const interval = parseInt(master.recurrence.interval) || 1;
      if (master.recurrence.frequency === 'daily') currentStart = addDays(currentStart, interval);
      else if (master.recurrence.frequency === 'weekly') currentStart = addWeeks(currentStart, interval);
      else if (master.recurrence.frequency === 'monthly') currentStart = addMonths(currentStart, interval);
      else if (master.recurrence.frequency === 'yearly') currentStart = addYears(currentStart, interval);
      else break;
      
      currentEnd = new Date(currentStart.getTime() + duration);
      count++;
      if (count > 730) break; // Hard limit for safety
    }
  });

  return instances.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
};
