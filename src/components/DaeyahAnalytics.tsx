import React, { useMemo } from 'react';
import { initialMembers } from '../data';
import { DateRange } from './DateRangePicker';
import { isAfter, isBefore } from 'date-fns';
import { Users, UserCheck, GraduationCap } from 'lucide-react';

export default function DaeyahAnalytics({ reverts, dateRange }: { reverts: any[], dateRange: DateRange }) {
  // Filter reverts by date range
  const filteredReverts = useMemo(() => {
    return reverts.filter(r => {
      const itemDate = new Date(r.reversionDate);
      const currentEnd = dateRange.endDate || new Date();
      return (isAfter(itemDate, dateRange.startDate) || itemDate.getTime() === dateRange.startDate.getTime()) && 
             (isBefore(itemDate, currentEnd) || itemDate.getTime() === currentEnd.getTime());
    });
  }, [reverts, dateRange]);

  // Card metrics
  const totalShahadahs = filteredReverts.length;
  
  const activeDaeyahsCount = useMemo(() => {
    const uniqueDaeyahs = new Set(filteredReverts.filter(r => r.facilitatorId).map(r => r.facilitatorId));
    return uniqueDaeyahs.size;
  }, [filteredReverts]);

  const mentorshipCoverage = useMemo(() => {
    if (totalShahadahs === 0) return { percentage: 0, count: 0 };
    const covered = filteredReverts.filter(r => 
      r.mentorshipStatus === 'Mentor Assigned' || r.mentorshipStatus === 'Completed Foundation Course'
    ).length;
    return {
      percentage: Math.round((covered / totalShahadahs) * 100),
      count: covered
    };
  }, [filteredReverts, totalShahadahs]);

  // Top Facilitators
  const topFacilitators = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReverts.forEach(r => {
      if (r.facilitatorId) {
        counts[r.facilitatorId] = (counts[r.facilitatorId] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([id, count]) => {
        const member = initialMembers.find(m => m.id === id);
        return {
          id,
          name: member ? member.name : 'Unknown',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredReverts]);

  // Conversion Sources
  const conversionSources = useMemo(() => {
    const counts: Record<string, number> = {
      "Walk-in": 0,
      "Street Da'wah": 0,
      "Social Media": 0,
      "Friend/Family": 0,
      "Other": 0
    };
    
    filteredReverts.forEach(r => {
      const source = r.source || 'Other';
      if (counts[source] !== undefined) {
        counts[source]++;
      } else {
        counts['Other']++;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalShahadahs > 0 ? (count / totalShahadahs) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReverts, totalShahadahs]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards (3-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Shahadahs</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-auto">{totalShahadahs}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Da'eyahs</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-auto">{activeDaeyahsCount}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Mentorship Coverage</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 mt-auto">{mentorshipCoverage.percentage}%</div>
          <div className="text-xs text-gray-500 mt-1">{mentorshipCoverage.count} out of {totalShahadahs}</div>
        </div>
      </div>

      {/* Analytics Visualizations (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Facilitators Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Top Facilitators</h3>
          </div>
          <div className="p-2">
            {topFacilitators.length > 0 ? (
              topFacilitators.map((fac, idx) => (
                <div key={fac.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {fac.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{fac.name}</div>
                      <div className="text-xs text-gray-500">Rank #{idx + 1}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{fac.count}</div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No facilitator data available for this period.</div>
            )}
          </div>
        </div>

        {/* Right Column: Conversion Sources Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Conversion Sources</h3>
          </div>
          <div className="p-6 space-y-5">
            {conversionSources.map((source) => (
              <div key={source.name}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{source.name}</span>
                  <span className="font-bold text-gray-900">{source.count}</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
