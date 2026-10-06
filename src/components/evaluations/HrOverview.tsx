import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Lock, 
  ShieldCheck, 
  Star, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  Award
} from 'lucide-react';
import { DEPARTMENTS } from '@/utils/constants';
import { AnonymousEvaluation, EvaluationRatings, getRecentMonths } from '../../utils/evaluations';

interface Member {
  id: string;
  name: string;
  role: string;
  department?: string;
  type?: string;
  email?: string;
}

interface HrOverviewProps {
  members?: Member[];
  allUsers?: Member[];
  allStaffAndOfficers?: Member[];
  evaluations: AnonymousEvaluation[];
}

export default function HrOverview({ 
  members, 
  allUsers: propAllUsers, 
  allStaffAndOfficers, 
  evaluations 
}: HrOverviewProps) {
  const allUsers = propAllUsers || allStaffAndOfficers || members || [];

  // List of all valid staff across the official departments
  const allValidStaff = useMemo(() => {
    return allUsers.filter(user => DEPARTMENTS.includes(user.department));
  }, [allUsers]);

  // 1. Department Filter State
  const [filterDept, setFilterDept] = useState('All');

  // 2. Filter the Staff List strictly validated against official DEPARTMENTS
  const filteredStaff = useMemo(() => {
    return allUsers.filter(user => {
      const isValidDept = DEPARTMENTS.includes(user.department);
      if (!isValidDept) return false;
      if (filterDept === 'All') return true;
      return user.department === filterDept;
    });
  }, [allUsers, filterDept]);

  // Selected staff state (ID)
  const [selectedStaff, setSelectedStaff] = useState<string>(() => {
    return filteredStaff.length > 0 ? filteredStaff[0].id : '';
  });

  // Keep selectedStaff valid if list changes or selection is not in filtered list
  useEffect(() => {
    if (filteredStaff.length > 0) {
      if (!selectedStaff || !filteredStaff.some(s => s.id === selectedStaff)) {
        setSelectedStaff(filteredStaff[0].id);
      }
    }
  }, [filteredStaff, selectedStaff]);

  // Selected Month state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Format: "YYYY-MM"
  const monthOptions = useMemo(() => getRecentMonths(12), []);

  // Currently selected member object
  const selectedMember = useMemo(() => {
    return allValidStaff.find(m => m.id === selectedStaff) || null;
  }, [allValidStaff, selectedStaff]);

  // All reviews received specifically by the selected staff member
  const selectedStaffReviews = useMemo(() => {
    if (!selectedStaff) return [];
    return evaluations.filter(e => e.targetUserId === selectedStaff);
  }, [evaluations, selectedStaff]);

  // Reviews for selected staff member filtered by selected month
  const filteredHrFeedback = useMemo(() => {
    if (!selectedStaff) return [];
    return evaluations.filter(evalItem => 
      evalItem.targetUserId === selectedStaff && 
      evalItem.createdAt.startsWith(selectedMonth)
    );
  }, [evaluations, selectedStaff, selectedMonth]);

  // Compute stats for selected member
  const staffStats = useMemo(() => {
    if (selectedStaffReviews.length === 0) return null;

    let totalScore = 0;
    const catSums: Record<keyof EvaluationRatings, number> = {
      teamwork: 0,
      communication: 0,
      leadership: 0,
      adherenceToValues: 0,
    };

    selectedStaffReviews.forEach(e => {
      catSums.teamwork += e.ratings.teamwork;
      catSums.communication += e.ratings.communication;
      catSums.leadership += e.ratings.leadership;
      catSums.adherenceToValues += e.ratings.adherenceToValues;

      const avg = (e.ratings.teamwork + e.ratings.communication + e.ratings.leadership + e.ratings.adherenceToValues) / 4;
      totalScore += avg;
    });

    const count = selectedStaffReviews.length;
    return {
      count,
      overallAvg: (totalScore / count).toFixed(1),
      teamworkAvg: (catSums.teamwork / count).toFixed(1),
      communicationAvg: (catSums.communication / count).toFixed(1),
      leadershipAvg: (catSums.leadership / count).toFixed(1),
      adherenceToValuesAvg: (catSums.adherenceToValues / count).toFixed(1),
    };
  }, [selectedStaffReviews]);

  // Overall organization stats
  const orgStats = useMemo(() => {
    const totalEvals = evaluations.length;
    const validStaffIds = new Set(allValidStaff.map(s => s.id));
    const evaluatedUsersCount = new Set(
      evaluations.filter(e => validStaffIds.has(e.targetUserId)).map(e => e.targetUserId)
    ).size;

    let sumScore = 0;
    evaluations.forEach(e => {
      sumScore += (e.ratings.teamwork + e.ratings.communication + e.ratings.leadership + e.ratings.adherenceToValues) / 4;
    });
    const orgAvg = totalEvals > 0 ? (sumScore / totalEvals).toFixed(1) : '0.0';

    return {
      totalEvals,
      evaluatedUsersCount,
      totalStaff: allValidStaff.length,
      orgAvg
    };
  }, [evaluations, allValidStaff]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Organizational Scope & Anonymity Safeguard */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 text-white rounded-2xl p-6 shadow-sm border border-amber-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 mb-6">
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30 flex items-center gap-1.5">
                <ShieldCheck size={13} /> Exclusive HR & Executive Overview
              </span>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <Lock size={11} /> Reviewer Anonymity Strictly Preserved
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Organization-Wide Peer Feedback Dashboard</h2>
            <p className="text-xs text-amber-100/80 max-w-2xl mt-1 leading-relaxed">
              Consolidated feedback reports to support year-end performance reviews and December strategic planning. 
              Reviewer identities remain 100% anonymous to maintain psychological safety and candid peer insights.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/10 text-center">
              <span className="block text-[11px] text-amber-200 font-medium">Evaluated Staff</span>
              <span className="text-lg font-bold text-white">{orgStats.evaluatedUsersCount} / {orgStats.totalStaff}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/10 text-center">
              <span className="block text-[11px] text-amber-200 font-medium">Total Reviews</span>
              <span className="text-lg font-bold text-white">{orgStats.totalEvals}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/10 text-center">
              <span className="block text-[11px] text-amber-200 font-medium">Org Average</span>
              <span className="text-lg font-bold text-amber-300">{orgStats.orgAvg} <span className="text-xs font-normal text-amber-200">/ 5</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Pane Master-Detail Layout */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left Pane: Filter Dropdown + Staff List */}
        <div className="w-full md:w-1/3 lg:w-1/4 md:border-r border-gray-200 pr-0 md:pr-4">
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Filter by Department
            </label>
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full border border-gray-300 rounded-lg shadow-sm text-sm p-2 focus:ring-brand-orange focus:border-brand-orange bg-white text-gray-900"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <ul className="space-y-1 overflow-y-auto max-h-[300px] md:max-h-[500px] pr-2 md:pr-4 scrollbar-thin">
            {filteredStaff.length === 0 ? (
              <li className="text-sm text-gray-400 italic px-2 py-4">No staff found.</li>
            ) : (
              filteredStaff.map(staff => (
                <li 
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                    selectedStaff === staff.id 
                      ? 'bg-brand-orange text-white font-medium shadow-sm' 
                      : 'text-gray-700 hover:bg-orange-50'
                  }`}
                >
                  <div className="font-medium">{staff.name}</div>
                  {filterDept === 'All' && (
                    <div className="text-xs text-gray-400">{staff.department}</div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right Pane: Selected Staff Feedback Details */}
        <div className="w-full md:flex-1 space-y-4">
          {selectedMember ? (
            <>
              {/* Selected Staff Profile Header Card */}
              <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xl border border-orange-200 shadow-xs">
                      {selectedMember.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{selectedMember.name}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {selectedMember.department || selectedMember.type || 'Staff'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedMember.role} {selectedMember.email ? `• ${selectedMember.email}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Pill */}
                  {staffStats ? (
                    <div className="flex items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-xl p-3">
                      <div className="text-center pr-3 border-r border-orange-200">
                        <span className="block text-[10px] text-orange-700 font-semibold uppercase">Overall Avg</span>
                        <div className="text-xl font-extrabold text-orange-800 flex items-center justify-center gap-1">
                          {staffStats.overallAvg}
                          <Star size={16} className="fill-amber-400 text-amber-400" />
                        </div>
                      </div>
                      <div className="text-center pl-1">
                        <span className="block text-[10px] text-orange-700 font-semibold uppercase">Feedback Count</span>
                        <div className="text-xl font-extrabold text-gray-900">{staffStats.count}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                      No peer reviews submitted yet
                    </div>
                  )}
                </div>

                {/* Categories Breakdown */}
                {staffStats ? (
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="block text-[11px] text-gray-500 font-medium">Teamwork</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold text-gray-900">{staffStats.teamworkAvg}</span>
                        <span className="text-[11px] text-gray-400">/ 5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full transition-all" 
                          style={{ width: `${(Number(staffStats.teamworkAvg) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="block text-[11px] text-gray-500 font-medium">Communication</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold text-gray-900">{staffStats.communicationAvg}</span>
                        <span className="text-[11px] text-gray-400">/ 5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full transition-all" 
                          style={{ width: `${(Number(staffStats.communicationAvg) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="block text-[11px] text-gray-500 font-medium">Leadership</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold text-gray-900">{staffStats.leadershipAvg}</span>
                        <span className="text-[11px] text-gray-400">/ 5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full transition-all" 
                          style={{ width: `${(Number(staffStats.leadershipAvg) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="block text-[11px] text-gray-500 font-medium">Values & Ethics</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-bold text-gray-900">{staffStats.adherenceToValuesAvg}</span>
                        <span className="text-[11px] text-gray-400">/ 5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full transition-all" 
                          style={{ width: `${(Number(staffStats.adherenceToValuesAvg) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Feedback Submissions List for Selected Member */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Feedback History</h3>
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-brand-orange focus:border-brand-orange border bg-white text-gray-800 px-3 py-1.5"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredHrFeedback.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredHrFeedback.map((review) => {
                      const avg = (
                        (review.ratings.teamwork +
                          review.ratings.communication +
                          review.ratings.leadership +
                          review.ratings.adherenceToValues) /
                        4
                      ).toFixed(1);

                      const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });

                      return (
                        <div 
                          key={review.id}
                          className="bg-white rounded-xl shadow-xs border border-gray-100 p-6 space-y-4 transition-all hover:border-gray-200"
                        >
                          {/* Review Card Header - Author strictly "Anonymous Colleague" */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
                                <Lock size={16} className="text-gray-500" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  {/* Permanent Anonymous Colleague label */}
                                  <span className="text-sm font-bold text-gray-900">Anonymous Colleague</span>
                                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Lock size={10} /> Anonymous Author
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                  <Clock size={12} />
                                  <span>Submitted on {formattedDate}</span>
                                </div>
                              </div>
                            </div>

                            {/* Overall badge for review */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star 
                                    key={s} 
                                    size={14} 
                                    className={s <= Math.round(Number(avg)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} 
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-100">
                                {avg} / 5.0
                              </span>
                            </div>
                          </div>

                          {/* Ratings Breakdown Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">Teamwork</span>
                              <span className="font-semibold text-gray-800">{review.ratings.teamwork} / 5</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">Communication</span>
                              <span className="font-semibold text-gray-800">{review.ratings.communication} / 5</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">Leadership</span>
                              <span className="font-semibold text-gray-800">{review.ratings.leadership} / 5</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                              <span className="text-[10px] text-gray-500 block">Values & Ethics</span>
                              <span className="font-semibold text-gray-800">{review.ratings.adherenceToValues} / 5</span>
                            </div>
                          </div>

                          {/* Qualitative Feedback Text Blocks */}
                          <div className="space-y-3 pt-1">
                            <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-xl p-3.5">
                              <span className="text-xs font-bold text-emerald-900 block mb-1 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-emerald-600" />
                                Key Strengths Observed
                              </span>
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {review.feedback.strengths}
                              </p>
                            </div>

                            <div className="bg-amber-50/40 border border-amber-100/80 rounded-xl p-3.5">
                              <span className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                                <TrendingUp size={13} className="text-amber-600" />
                                Growth Opportunities & Constructive Notes
                              </span>
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {review.feedback.areasToImprove}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No feedback found for this month.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-12 text-center">
              <Users size={32} className="text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-gray-700">Select a staff member from the left</h4>
              <p className="text-xs text-gray-400 mt-1">
                Choose any colleague or officer to inspect their received peer evaluation reports.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
