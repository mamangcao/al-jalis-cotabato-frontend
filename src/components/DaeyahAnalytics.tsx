import React, { useState, useEffect } from 'react';
import { DateRange } from './DateRangePicker';
import { Users, UserCheck, GraduationCap, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../services/api';

interface TopFacilitator {
  id: string | number;
  name: string;
  count: number;
}

interface ConversionSource {
  name: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  totalShahadahs: number;
  activeDaeyahsCount: number;
  mentorshipCoverage: {
    percentage: number;
    count: number;
    total: number;
  };
  topFacilitators: TopFacilitator[];
  conversionSources: ConversionSource[];
}

export default function DaeyahAnalytics({ 
  reverts = [], 
  dateRange, 
  members = [] 
}: { 
  reverts?: any[]; 
  dateRange: DateRange; 
  members?: any[]; 
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setIsLoading(true);

    const params: Record<string, string> = {
      preset: dateRange?.preset || 'all_time',
    };
    if (dateRange?.startDate) {
      const s = format(dateRange.startDate, 'yyyy-MM-dd');
      params.startDate = s;
      params.start_date = s;
    }
    if (dateRange?.endDate && dateRange?.preset !== 'all_time') {
      const e = format(dateRange.endDate, 'yyyy-MM-dd');
      params.endDate = e;
      params.end_date = e;
    }

    api.reverts.getDaeyahAnalytics(params, { signal: controller.signal })
      .then(res => {
        if (isMounted && res) {
          setData({
            totalShahadahs: res.totalShahadahs ?? res.total_shahadahs ?? 0,
            activeDaeyahsCount: res.activeDaeyahsCount ?? res.active_daeyahs_count ?? 0,
            mentorshipCoverage: {
              percentage: res.mentorshipCoverage?.percentage ?? res.mentorship_coverage?.percentage ?? 0,
              count: res.mentorshipCoverage?.count ?? res.mentorship_coverage?.count ?? 0,
              total: res.mentorshipCoverage?.total ?? res.mentorship_coverage?.total ?? 0,
            },
            topFacilitators: (res.topFacilitators ?? res.top_facilitators ?? []).map((fac: any) => ({
              id: fac.id ?? fac.facilitator_id ?? fac.name,
              name: fac.name ?? fac.facilitator_name ?? 'Unknown',
              count: fac.count ?? 0,
            })),
            conversionSources: res.conversionSources ?? res.conversion_sources ?? [],
          });
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch Daeyah Analytics:', err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dateRange]);

  const totalShahadahs = data?.totalShahadahs ?? 0;
  const activeDaeyahsCount = data?.activeDaeyahsCount ?? 0;
  const mentorshipCoverage = data?.mentorshipCoverage ?? { percentage: 0, count: 0, total: 0 };
  const topFacilitators = data?.topFacilitators ?? [];
  const conversionSources = data?.conversionSources ?? [];

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm text-gray-500 font-medium">Loading Da'eyah Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {isLoading && data && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-gray-200 shadow-xs text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
          <span>Updating...</span>
        </div>
      )}

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
          <div className="text-xs text-gray-500 mt-1">{mentorshipCoverage.count} out of {mentorshipCoverage.total || totalShahadahs}</div>
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
