import React, { useState, useEffect } from 'react';
import { DateRange } from './DateRangePicker';
import { Users, UserCheck, GraduationCap, Loader2, Award, HeartHandshake } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../services/api';

interface TopDaeyah {
  id: string | number;
  name: string;
  count: number;
}

interface TopFacilitator {
  id: string | number;
  name: string;
  role?: string;
  status?: string;
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
  topDaeyahs: TopDaeyah[];
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
            topDaeyahs: (res.topDaeyahs ?? res.top_daeyahs ?? []).map((d: any) => ({
              id: d.id ?? d.name,
              name: d.name ?? 'Unknown',
              count: d.count ?? 0,
            })),
            topFacilitators: (res.topFacilitators ?? res.top_facilitators ?? []).map((fac: any) => ({
              id: fac.id ?? fac.facilitatorId ?? fac.facilitator_id ?? fac.name,
              name: fac.name ?? fac.facilitator_name ?? 'Unknown',
              role: fac.role,
              status: fac.status,
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
  const topDaeyahs = data?.topDaeyahs ?? [];
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Staff Facilitators</h3>
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

      {/* Role Leaderboards (2-Column Grid: Da'eyahs vs Facilitators) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Da'eyahs (Shahada Preachers) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Top Da'eyahs</h3>
                <p className="text-xs text-gray-500">Preachers who administered the Shahada</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Shahada
            </span>
          </div>
          <div className="p-3 divide-y divide-gray-100 flex-1">
            {topDaeyahs.length > 0 ? (
              topDaeyahs.map((daeyah, idx) => (
                <div key={daeyah.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {daeyah.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{daeyah.name}</div>
                      <div className="text-xs text-gray-500">Rank #{idx + 1} • Preacher</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">{daeyah.count}</div>
                    <div className="text-[11px] text-gray-400">Shahadas</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No Da'eyah data recorded for this period.</div>
            )}
          </div>
        </div>

        {/* Right Column: Top Facilitators (Mentorship & Follow-up) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center">
                <HeartHandshake size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Top Facilitators</h3>
                <p className="text-xs text-gray-500">Personnel assigned for revert mentorship</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              Mentorship
            </span>
          </div>
          <div className="p-3 divide-y divide-gray-100 flex-1">
            {topFacilitators.length > 0 ? (
              topFacilitators.map((fac, idx) => (
                <div key={fac.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {fac.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{fac.name}</div>
                      <div className="text-xs text-gray-500">
                        Rank #{idx + 1} {fac.role ? `• ${fac.role}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">{fac.count}</div>
                    <div className="text-[11px] text-gray-400">Assigned</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No facilitator data available for this period.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Conversion Sources Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900 text-sm">Conversion Sources</h3>
          <p className="text-xs text-gray-500">Initial contact method through which reverts entered Islam</p>
        </div>
        <div className="p-6 space-y-5">
          {conversionSources.map((source) => (
            <div key={source.name}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">{source.name}</span>
                <span className="font-bold text-gray-900">{source.count} <span className="text-xs font-normal text-gray-500">({source.percentage}%)</span></span>
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
  );
}
