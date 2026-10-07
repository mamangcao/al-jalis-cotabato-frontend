import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Star, 
  Send, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles, 
  UserCheck, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Info,
  Building2,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import GlobalPillTabs, { TabItem } from '../components/ui/GlobalPillTabs';
import { canManagePersonnel } from '../lib/permissions';
import HrOverview from '../components/evaluations/HrOverview';
import { 
  getStoredEvaluations, 
  fetchEvaluationsFromApi,
  saveEvaluation, 
  isEndOfMonth,
  isLastWeekOfMonth,
  getRecentMonths,
  AnonymousEvaluation, 
  EvaluationRatings, 
  EvaluationFeedback 
} from '../utils/evaluations';

interface Member {
  id: string;
  name: string;
  role: string;
  department?: string;
  type?: string;
  email?: string;
}

interface EvaluationsPageProps {
  members: Member[];
}

const RATING_CATEGORIES: { key: keyof EvaluationRatings; label: string; description: string }[] = [
  { 
    key: 'teamwork', 
    label: 'Teamwork & Collaboration', 
    description: 'Cooperates well with peers, supports colleagues, and contributes to team harmony.' 
  },
  { 
    key: 'communication', 
    label: 'Communication & Active Listening', 
    description: 'Expresses ideas with clarity and adab, listens attentively, and responds constructively.' 
  },
  { 
    key: 'leadership', 
    label: 'Leadership & Initiative', 
    description: 'Takes ownership of tasks, suggests proactive solutions, and inspires others.' 
  },
  { 
    key: 'adherenceToValues', 
    label: 'Adherence to Values & Ethics', 
    description: 'Consistently demonstrates honesty, humility, fairness, and Islamic organizational ethics.' 
  }
];

const RATING_DESCRIPTORS: Record<number, string> = {
  1: 'Needs Significant Improvement',
  2: 'Developing / Inconsistent',
  3: 'Competent & Reliable',
  4: 'Commendable & Exceeds Expectations',
  5: 'Exceptional & Role Model'
};

export default function EvaluationsPage({ members }: EvaluationsPageProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('submit');
  const [evaluations, setEvaluations] = useState<AnonymousEvaluation[]>([]);

  const evalTabs: TabItem[] = [
    { id: 'submit', label: 'Submit Feedback' },
    { id: 'personal', label: 'My Feedback' }
  ];
  if (canManagePersonnel(currentUser.role)) {
    evalTabs.push({ id: 'hr_overview', label: 'Organization Overview (HR)' });
  }

  // Filter State for Feedback History: tracks selected month (Format: "YYYY-MM")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const monthOptions = useMemo(() => getRecentMonths(12), []);

  // 1. The "Last Week Only" Time Lock
  // In the Evaluations component, if !isLastWeekOfMonth() is true, replace the entire submission form
  // with a locked state UI: a padlock icon and a message saying, "Peer evaluations are currently closed. The feedback portal opens during the final week of every month."
  const isPortalOpen = isLastWeekOfMonth();

  // 1. Filter Out Current User (No Self-Evaluation)
  const allUsers = useMemo(() => members, [members]);

  // Strip currentUser immediately to prevent self-rating
  const eligibleTargets = useMemo(() => {
    return allUsers.filter(user => user.id !== currentUser.id);
  }, [allUsers, currentUser.id]);

  // 2. Enforce Once-Per-Month per Colleague
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const storageKey = `al_jalis_eval_submitted_${currentUser.id}_${currentMonthKey}`;

  // Mock state tracking (in production, fetch from user evaluation log for currentMonthKey)
  const [submittedTargetIds, setSubmittedTargetIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
      // Legacy fallback check
      const legacyKey = `al_jalis_eval_logs_${currentUser.id}_${new Date().getFullYear()}_${new Date().getMonth()}`;
      const legacyStored = localStorage.getItem(legacyKey);
      return legacyStored ? JSON.parse(legacyStored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(submittedTargetIds));
    } catch (e) {
      console.error(e);
    }
  }, [submittedTargetIds, storageKey]);

  // Exclude both self and already-evaluated peers
  const availableTargets = useMemo(() => {
    return eligibleTargets.filter(
      user => !submittedTargetIds.includes(user.id)
    );
  }, [eligibleTargets, submittedTargetIds]);

  // Form State
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [ratings, setRatings] = useState<EvaluationRatings>({
    teamwork: 5,
    communication: 5,
    leadership: 5,
    adherenceToValues: 5,
  });

  const [feedback, setFeedback] = useState<EvaluationFeedback>({
    strengths: '',
    areasToImprove: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync evaluations from API and storage
  useEffect(() => {
    const loadData = () => {
      setEvaluations(getStoredEvaluations());
    };
    loadData();
    fetchEvaluationsFromApi().then(data => {
      if (data && Array.isArray(data)) setEvaluations(data);
    });

    const handleStorageUpdate = () => loadData();
    window.addEventListener('evaluations-updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('evaluations-updated', handleStorageUpdate);
    };
  }, []);

  // Close target dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available targets based on search query
  const filteredTargets = useMemo(() => {
    const q = targetSearchQuery.toLowerCase().trim();
    return availableTargets.filter(m => {
      const matchName = m.name.toLowerCase().includes(q);
      const matchRole = m.role.toLowerCase().includes(q);
      const matchDept = m.department?.toLowerCase().includes(q) || false;
      return matchName || matchRole || matchDept;
    });
  }, [availableTargets, targetSearchQuery]);

  const selectedMember = useMemo(() => {
    return allUsers.find(m => m.id === selectedTargetId);
  }, [allUsers, selectedTargetId]);

  // 3. Strict Personal-Only Visibility (No Admin Bypass)
  // In the Evaluations component, data fetching or filtering strictly compares targetUserId to currentUser.id.
  // Do NOT add any canManagePersonnel overrides here. Even the Super Admin or Director should only see an array of feedback where they are the target.
  const myFeedback = useMemo(() => {
    return evaluations.filter(evalItem => evalItem.targetUserId === currentUser.id);
  }, [evaluations, currentUser.id]);

  // Personal feedback filtered by selected month
  const filteredPersonalFeedback = useMemo(() => {
    return evaluations.filter(evalItem => 
      evalItem.targetUserId === currentUser.id && 
      evalItem.createdAt.startsWith(selectedMonth)
    );
  }, [evaluations, currentUser.id, selectedMonth]);

  // Compute summary stats for current user
  const receivedStats = useMemo(() => {
    if (myFeedback.length === 0) return null;

    let totalScore = 0;
    const catSums: Record<keyof EvaluationRatings, number> = {
      teamwork: 0,
      communication: 0,
      leadership: 0,
      adherenceToValues: 0,
    };

    myFeedback.forEach(e => {
      catSums.teamwork += e.ratings.teamwork;
      catSums.communication += e.ratings.communication;
      catSums.leadership += e.ratings.leadership;
      catSums.adherenceToValues += e.ratings.adherenceToValues;

      const evalAvg = (e.ratings.teamwork + e.ratings.communication + e.ratings.leadership + e.ratings.adherenceToValues) / 4;
      totalScore += evalAvg;
    });

    const count = myFeedback.length;
    return {
      count,
      overallAvg: (totalScore / count).toFixed(1),
      teamworkAvg: (catSums.teamwork / count).toFixed(1),
      communicationAvg: (catSums.communication / count).toFixed(1),
      leadershipAvg: (catSums.leadership / count).toFixed(1),
      adherenceToValuesAvg: (catSums.adherenceToValues / count).toFixed(1),
    };
  }, [myFeedback]);

  // Submission handler with Anonymity Guard & Hard Submission Failsafe
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTargetId) {
      toast.error('Please select a colleague or director to evaluate.');
      return;
    }

    if (selectedTargetId === currentUser.id) {
      toast.error("Self-evaluations are not permitted.");
      return;
    }

    if (submittedTargetIds.includes(selectedTargetId)) {
      toast.error("You have already submitted feedback for this colleague this month.");
      return;
    }

    if (!feedback.strengths.trim()) {
      toast.error('Please provide at least one key strength.');
      return;
    }

    if (!feedback.areasToImprove.trim()) {
      toast.error('Please provide constructive feedback / areas to improve.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. The Anonymity Guard (Submission Logic)
      // Completely strip the currentUser.id from the payload.
      // Reviewer ID is explicitly set to null and never preserved in memory or payload.
      const evaluationPayload = {
        targetUserId: selectedTargetId, // Who is being reviewed
        reviewerId: null,              // STRIPPED FOR ANONYMITY
        isAnonymous: true as const,
        ratings: { ...ratings },
        feedback: { ...feedback },
        createdAt: new Date().toISOString()
      };

      await saveEvaluation(evaluationPayload);

      // Push to submitted targets to instantly remove from dropdown
      setSubmittedTargetIds(prev => [...prev, selectedTargetId]);

      toast.success('Evaluation submitted successfully.', { icon: '🔒' });

      // Reset form
      setSelectedTargetId('');
      setTargetSearchQuery('');
      setFeedback({ strengths: '', areasToImprove: '' });
      setRatings({
        teamwork: 5,
        communication: 5,
        leadership: 5,
        adherenceToValues: 5,
      });

      setEvaluations(getStoredEvaluations());
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* End of Month / Last Week Reminder Banner */}
      {(isLastWeekOfMonth() || isEndOfMonth()) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-blue-800 font-medium">Monthly Peer Evaluations are Due</h3>
            <p className="text-blue-600 text-sm">The feedback portal is open during the final week of the month. Please take a moment to submit anonymous feedback for your team.</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className="bg-blue-600 text-white px-3.5 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 transition shrink-0"
          >
            Submit Feedback Now
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0 mt-0.5">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Anonymous Peer Evaluation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Provide honest, constructive 360° feedback for any staff member, volunteer, or director. Reviewer identity is never collected or stored.
              </p>
            </div>
          </div>
          <span className="self-start md:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock size={11} /> 100% Anonymous
          </span>
        </div>

        {/* Informative Privacy Assurance Callout */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-3 text-xs text-gray-600 bg-gray-50/70 p-3 rounded-lg">
          <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <p>
            <strong className="font-semibold text-gray-900">Privacy Safeguard:</strong> Submissions strictly omit your account identity, IP address, and user metadata. Even system administrators cannot trace reviews back to their authors.
          </p>
        </div>
      </div>

      {/* Global Pill Navigation Tabs */}
      <GlobalPillTabs 
        tabs={evalTabs} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {activeTab === 'submit' && (
        /* 1. The "Last Week Only" Time Lock: */
        /* If !isLastWeekOfMonth() is true, replace the entire submission form with a locked state UI */
        !isPortalOpen ? (
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
              <Lock size={32} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Evaluation Period Locked</h2>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
              Peer evaluations are currently closed. The feedback portal opens during the final week of every month.
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
              <Clock size={15} className="text-gray-500" />
              <span>Portal automatically opens during the final 7 days of each month.</span>
            </div>
          </div>
        ) : availableTargets.length === 0 ? (
          /* When all available targets (including self) have already been evaluated this month */
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-8 sm:p-12 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              All Evaluations Completed for This Month!
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
              You have evaluated all {allUsers.length} staff members (including self-evaluation) for this monthly cycle. Thank you for your honest feedback.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                View My Received Feedback
              </button>
            </div>
          </div>
        ) : (
          /* The "Submit Feedback" UI */
          <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-4 md:p-6 lg:p-8">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Submit Anonymous Colleague Review</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select any colleague or director to provide candid feedback. ({availableTargets.length} remaining this month)
              </p>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="space-y-8">
              {/* 1. Target Selection */}
              <div>
                <label htmlFor="target-colleague-select" className="block text-sm font-semibold text-gray-800 mb-2">
                  1. Select Colleague to Evaluate <span className="text-rose-500">*</span>
                </label>

                {availableTargets.length === 0 && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 mb-3">
                    You have completed peer evaluations for all colleagues this month. Thank you!
                  </div>
                )}

                <div className="relative">
                  <select
                    id="target-colleague-select"
                    value={selectedTargetId}
                    disabled={availableTargets.length === 0}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">
                      {availableTargets.length === 0
                        ? 'No remaining colleagues to evaluate this month'
                        : 'Choose a colleague to evaluate...'}
                    </option>
                    {availableTargets.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {user.role}{user.department ? ` (${user.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMember && (
                  <div className="mt-3 p-3 bg-orange-50/60 border border-orange-200/70 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-xs">
                        {selectedMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{selectedMember.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {selectedMember.role} {selectedMember.department ? `• ${selectedMember.department}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                      Colleague Peer Review
                    </span>
                  </div>
                )}
              </div>

            {/* 2. Rating Scales (1-5) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-800">
                  2. Core Competency Ratings (1 - 5 Scale)
                </label>
                <span className="text-xs text-gray-500 font-normal">
                  Click stars or adjust values
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RATING_CATEGORIES.map((cat) => {
                  const currentVal = ratings[cat.key];
                  return (
                    <div 
                      key={cat.key}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{cat.label}</span>
                        <span className="text-xs font-bold text-orange-600 px-2 py-0.5 bg-orange-50 rounded">
                          {currentVal} / 5
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-3 line-clamp-2">
                        {cat.description}
                      </p>

                      {/* Interactive Star Selection */}
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatings(prev => ({ ...prev, [cat.key]: star }))}
                            className="p-1 hover:scale-110 transition-transform focus:outline-hidden"
                            title={`${star} - ${RATING_DESCRIPTORS[star]}`}
                          >
                            <Star 
                              size={20} 
                              className={
                                star <= currentVal 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-gray-300 hover:text-amber-200'
                              } 
                            />
                          </button>
                        ))}
                      </div>

                      {/* Range slider for accessibility */}
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={currentVal}
                        onChange={(e) => setRatings(prev => ({ ...prev, [cat.key]: parseInt(e.target.value) }))}
                        className="w-full accent-orange-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                      />

                      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                        <span>1: Needs Work</span>
                        <span className="text-gray-600 font-medium">{RATING_DESCRIPTORS[currentVal]}</span>
                        <span>5: Exceptional</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Honest Feedback (Text Areas) */}
            <div className="space-y-5">
              <label className="block text-sm font-semibold text-gray-800">
                3. Qualitative Assessment & Open Feedback
              </label>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Key Strengths <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={feedback.strengths}
                  onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
                  placeholder="What does this person do exceptionally well? Highlight their positive influence on the team, community members, or center operations..."
                  className="w-full min-h-[100px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Open/Honest Feedback (Areas to Improve) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={feedback.areasToImprove}
                  onChange={(e) => setFeedback({ ...feedback, areasToImprove: e.target.value })}
                  placeholder="Where could this person grow, improve communication, adjust workflow habits, or better support the team's mission? Be candid and constructive..."
                  className="w-full min-h-[100px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit Bar with Prominent Anonymous Badge */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold shadow-2xs">
                <Lock size={14} className="text-emerald-600" />
                <span>🔒 100% Anonymous Submission</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTargetId('');
                    setFeedback({ strengths: '', areasToImprove: '' });
                    setRatings({ teamwork: 5, communication: 5, leadership: 5, adherenceToValues: 5 });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableTargets.length === 0}
                  className="w-full md:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      ))}

      {/* 4. The "Received Feedback" View (Read-Only) */}
      {/* We always render or show this view when selected */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Summary Overview Card */}
          {receivedStats ? (
            <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-2xl border border-orange-100">
                    {receivedStats.overallAvg}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Overall Rating Score</h3>
                    <p className="text-xs text-gray-500">
                      Based on {receivedStats.count} anonymous evaluation{receivedStats.count > 1 ? 's' : ''} submitted by peers
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={14} 
                          className={s <= Math.round(Number(receivedStats.overallAvg)) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category averages grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="block text-[11px] text-gray-500">Teamwork</span>
                    <span className="text-sm font-bold text-gray-900">{receivedStats.teamworkAvg} / 5</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="block text-[11px] text-gray-500">Communication</span>
                    <span className="text-sm font-bold text-gray-900">{receivedStats.communicationAvg} / 5</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="block text-[11px] text-gray-500">Leadership</span>
                    <span className="text-sm font-bold text-gray-900">{receivedStats.leadershipAvg} / 5</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="block text-[11px] text-gray-500">Values</span>
                    <span className="text-sm font-bold text-gray-900">{receivedStats.adherenceToValuesAvg} / 5</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Evaluations for: <strong className="text-gray-900">{currentUser.name}</strong></span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Lock size={12} /> Reviewer identities hidden
                </span>
              </div>
            </div>
          ) : null}

          {/* Received Reviews List */}
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

            {filteredPersonalFeedback.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredPersonalFeedback.map((review) => {
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
                      {/* Review Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200">
                            <Lock size={16} className="text-gray-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">Anonymous Colleague</span>
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                Verified Peer
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
                          <span className="text-xs font-bold text-gray-900 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-100">
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

                      {/* Feedback Text Blocks */}
                      <div className="space-y-3 pt-1">
                        <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-xl p-3.5">
                          <span className="text-xs font-bold text-emerald-900 block mb-1 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-emerald-600" />
                            Key Strengths
                          </span>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {review.feedback.strengths}
                          </p>
                        </div>

                        <div className="bg-amber-50/40 border border-amber-100/80 rounded-xl p-3.5">
                          <span className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-amber-600" />
                            Open/Honest Feedback (Areas to Improve)
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
        </div>
      )}

      {/* 5. Organization Overview (HR) - Strictly Anonymized Reviewer Data */}
      {activeTab === 'hr_overview' && canManagePersonnel(currentUser.role) && (
        <HrOverview 
          members={allUsers}
          evaluations={evaluations}
        />
      )}
    </div>
  );
}
