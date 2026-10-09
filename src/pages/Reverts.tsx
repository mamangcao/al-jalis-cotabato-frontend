import DaeyahAnalytics from '../components/DaeyahAnalytics';
import { initialMembers } from '../data';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import GlobalPillTabs from '../components/ui/GlobalPillTabs';
import { differenceInYears, isAfter, isBefore, startOfDay, endOfDay, startOfYear, startOfMonth, format } from 'date-fns';
import { Search, Plus, Filter, MoreHorizontal, X, TrendingUp, TrendingDown, Minus, Printer, Edit2, Download, Trash2, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { calculateTrend } from '../utils/trends';
import { DateRange } from '../components/DateRangePicker';
import RevertPrintTemplate from '../components/RevertPrintTemplate';
import EmptyState from '../components/EmptyState';
import { createPortal } from 'react-dom';
import { generateRevertSerial, getChapterCode } from '../utils/revertSerial';
import { formatDisplayDate } from '../utils/dateUtils';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

function PrintPreviewModal({ revert, onClose }: { revert: any, onClose: () => void }) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      console.log('Starting PDF generation...');
      if (!documentRef.current) {
        throw new Error('Reference is null. Ensure the component is mounted.');
      }
      
      // Slight delay to ensure UI states settle before capture
      await new Promise(r => setTimeout(r, 150));
      
      const element = documentRef.current;
      
      console.log('Capturing HTML to Image...');
      const imgData = await toPng(element, { 
        quality: 1,
        pixelRatio: 2, // High quality for text
        backgroundColor: '#ffffff',
      });
      
      console.log('Image generated. Converting to PDF...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / ratio;
      
      // Scale to fit if taller than A4 height
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = imgHeight * ratio;
      }
      
      // Center horizontally and vertically (if scaled down)
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`revert-${revert.name.replace(/\s+/g, '-').toLowerCase()}-${revert.reversionDate}.pdf`);
      console.log('PDF saved successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:p-0 print:block print:inset-auto">
      {/* Modal Backdrop (hidden during print) */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-neutral-100 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:w-full print:shadow-none print:rounded-none print:bg-white print:h-auto print:overflow-visible"
      >
        {/* Modal Header (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white print:hidden shrink-0">
          <h3 className="text-[16px] font-semibold text-gray-900">Print Preview</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:opacity-80">
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Body / Scrollable Area */}
        <div className="overflow-auto p-4 sm:p-8 bg-neutral-200 flex-1 flex justify-center print:p-0 print:bg-white print:block print:overflow-visible">
          {/* The RevertPrintTemplate handles its own max-width and background for the A4 page */}
          <div ref={documentRef} className="shrink-0 print:m-0 print:w-full">
            <RevertPrintTemplate revert={revert} />
          </div>
        </div>
        
        {/* Modal Footer (hidden during print) */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 mt-auto shrink-0 print:hidden">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors cursor-pointer hover:opacity-80">
            Close
          </button>
          <button type="button" onClick={handleDownloadPdf} disabled={isGenerating} className="px-4 py-2 text-[14px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md">
            {isGenerating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Download size={16} />
            )}
            {isGenerating ? 'Saving...' : 'Save PDF'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const defaultFormData = {
  serialNumber: '',
  name: '',
  birthdate: '',
  gender: 'Male',
  ethnicity: '',
  civilStatus: 'Single',
  completeAddress: '',
  contactNumber: '',
  facebookAccount: '',
  emailAddress: '',
  educationalBackground: 'High School',
  profession: '',
  muslimName: '',
  reversionDate: '',
  previousReligion: '',
  daeyahName: '',
  islamicCenter: '',
  witness1: '',
  witness2: '',
  witness3: '',
  status: 'Active',
  profilePic: null as string | null,
  facilitatorId: "",
  source: "Walk-in",
  mentorshipStatus: "Pending Assignment"
};

export default function Reverts({ reverts, setReverts, dateRange, members = [] }: { reverts: any[], setReverts: (r: any[]) => void, dateRange: DateRange, members?: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("directory");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRevert, setEditingRevert] = useState<any>(null);
  const [printRevert, setPrintRevert] = useState<any>(null);
  const [revertToDelete, setRevertToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenPrintModal = (revert: any) => {
    setPrintRevert(revert);
    setIsPrintModalOpen(true);
  };

  const handleClosePrintModal = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => setPrintRevert(null), 200);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [paginatedReverts, setPaginatedReverts] = useState<any[]>([]);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [approvedDaeyahs, setApprovedDaeyahs] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    gender: '',
    previousReligion: ''
  });

  const fetchStats = async () => {
    try {
      const res = await api.reverts.getStats();
      if (res) setStats(res);
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    api.personnel.getFacilitators()
      .then(res => {
        if (Array.isArray(res)) setFacilitators(res);
      })
      .catch(err => {
        console.warn('Failed to fetch facilitators from personnel API:', err);
      });

    api.reverts.getApprovedDaeyahs()
      .then(res => {
        if (Array.isArray(res)) setApprovedDaeyahs(res);
      })
      .catch(err => {
        console.warn('Failed to fetch approved daeyahs:', err);
      });
  }, []);

  const fetchReverts = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: perPage,
        sort: 'id',
        direction: 'desc',
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.status) params.status = filters.status;
      if (filters.gender) params.gender = filters.gender;
      if (filters.previousReligion) params.previousReligion = filters.previousReligion;
      if (dateRange?.startDate) params.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      if (dateRange?.preset !== 'all_time' && dateRange?.endDate) params.endDate = format(dateRange.endDate, 'yyyy-MM-dd');

      const res = await api.reverts.getAll(params);
      if (res && res.data) {
        setPaginatedReverts(res.data);
        setPaginationMeta({
          total: res.total ?? res.data.length,
          lastPage: res.last_page ?? 1,
          from: res.from ?? 1,
          to: res.to ?? res.data.length,
        });
        if (setReverts) setReverts(res.data);
      } else if (Array.isArray(res)) {
        setPaginatedReverts(res);
        setPaginationMeta({
          total: res.length,
          lastPage: 1,
          from: res.length > 0 ? 1 : 0,
          to: res.length,
        });
        if (setReverts) setReverts(res);
      }
    } catch (err) {
      console.error('Failed to load reverts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReverts();
  }, [currentPage, perPage, debouncedSearch, filters, dateRange]);

  const handleDeleteRevert = (id: string) => {
    setRevertToDelete(id);
  };

  const confirmDeleteRevert = async () => {
    if (revertToDelete) {
      setIsDeleting(true);
      try {
        await api.reverts.delete(revertToDelete);
        setRevertToDelete(null);
        toast.success("Revert deleted successfully.");
        await fetchReverts();
        await fetchStats();
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete revert.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isCertified, setIsCertified] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Inactive': return 'bg-rose-100 text-rose-700';
      case 'Under Bio': return 'bg-orange-100 text-orange-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const handleOpenModal = async () => {
    setEditingId(null);
    setEditingRevert(null);
    let nextSerial = '';
    try {
      const res = await api.reverts.getNextSerial();
      if (res && res.serialNumber) nextSerial = res.serialNumber;
    } catch {
      nextSerial = await generateRevertSerial(paginatedReverts);
    }
    setFormData({
      ...defaultFormData,
      serialNumber: nextSerial || await generateRevertSerial(paginatedReverts),
    });
    setIsCertified(false);
    setIsModalOpen(true);
  };
  
  const handleEdit = (revert: any) => {
    setEditingId(revert.id);
    setEditingRevert(revert);
    const resolvedFacilitatorId = revert.facilitatorId ? String(revert.facilitatorId) : (revert.facilitator_id ? String(revert.facilitator_id) : '');
    setFormData({
      ...defaultFormData,
      ...revert,
      facilitatorId: resolvedFacilitatorId,
      serialNumber: revert.serialNumber || `AAI-${getChapterCode()}-26-${String(revert.id).padStart(4, '0')}`,
    });
    setIsCertified(true);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingRevert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        facilitatorId: formData.facilitatorId ? formData.facilitatorId : null,
      };
      if (editingId) {
        await api.reverts.update(editingId, payload);
        toast.success("Revert updated successfully.");
      } else {
        await api.reverts.create(payload);
        toast.success("Revert created successfully.");
      }
      handleCloseModal();
      await fetchReverts();
      await fetchStats();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save revert.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statData = useMemo(() => {
    return {
      totalCount: stats?.totalReverts ?? paginationMeta.total,
      yearCount: stats?.revertsThisYear ?? 0,
      monthCount: stats?.shahadahsThisMonth ?? 0,
      topReligion: stats?.topReligion ?? { name: 'None', count: 0 },
      religionsList: stats?.religionsList ?? [],
    };
  }, [stats, paginationMeta.total]);

  return (
    <>
    <div className="space-y-6 print:hidden">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Reverts Directory</h1>
            <p className="text-neutral-500 mt-1">Manage and view all reverted community members.</p>
          </div>
          <button 
            onClick={handleOpenModal}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Add New Revert
          </button>
        </div>

        {/* Stats Grid */}
        <GlobalPillTabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          tabs={[
            { id: 'directory', label: 'Directory' },
            { id: 'analytics', label: "Da'eyah Analytics" }
          ]} 
        />

        {activeTab === 'directory' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200 shadow-custom transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 truncate">Total Reverts</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{statData.totalCount}</div>
            <div className="text-[12px] mt-1 flex items-center gap-1 text-gray-500">
              — All time
            </div>
          </div>
          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200 shadow-custom transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 truncate">Reverts This Year</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{statData.yearCount}</div>
            <div className="text-[12px] mt-1 flex items-center gap-1 text-gray-500">
              — This calendar year
            </div>
          </div>
          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200 shadow-custom transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 truncate">Reverts This Month</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{statData.monthCount}</div>
            <div className="text-[12px] mt-1 flex items-center gap-1 text-emerald-600">
              <TrendingUp size={14} />
              Current month
            </div>
          </div>
          <div className="bg-white p-3 sm:p-5 rounded-xl border border-gray-200 shadow-custom flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 truncate">Top Previous Religion</div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 truncate">{statData.topReligion.name}</div>
            <div className="text-[12px] mt-1 flex items-center gap-1 text-gray-500">
               {statData.topReligion.count > 0 ? `${statData.topReligion.count} converts` : 'No data'}
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom overflow-hidden">
          <div className="p-4 px-5 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h3 className="text-[16px] font-semibold text-gray-900">Recent Reverts</h3>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-hidden transition-all text-gray-900"
                />
              </div>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer hover:opacity-80 ${isFilterOpen ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Filter size={16} />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-gray-200 bg-gray-50/50 px-5 py-4 overflow-hidden"
              >
                <div className="flex flex-wrap items-end gap-4">
                   <div className="space-y-1">
                      <label className="text-[12px] font-medium text-gray-600">Status</label>
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full sm:w-40 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Under Bio">Under Bio</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[12px] font-medium text-gray-600">Gender</label>
                      <select 
                        value={filters.gender}
                        onChange={(e) => setFilters({...filters, gender: e.target.value})}
                        className="w-full sm:w-40 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[12px] font-medium text-gray-600">Previous Religion</label>
                      <select 
                        value={filters.previousReligion}
                        onChange={(e) => setFilters({...filters, previousReligion: e.target.value})}
                        className="w-full sm:w-48 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">All Religions</option>
                        {statData.religionsList && statData.religionsList.length > 0 ? (
                          statData.religionsList.map((rel: string) => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))
                        ) : (
                          Array.from(new Set(paginatedReverts.map(r => r.previousReligion))).filter(Boolean).map(rel => (
                            <option key={rel} value={rel}>{rel}</option>
                          ))
                        )}
                      </select>
                   </div>
                   <div className="flex-1 flex justify-end">
                      <button 
                        onClick={() => { setFilters({ status: '', gender: '', previousReligion: '' }); setSearchTerm(''); }}
                        className="px-4 py-2 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm cursor-pointer hover:opacity-80"
                      >
                        Clear Filters
                      </button>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="w-full overflow-x-auto rounded-lg shadow-sm min-h-[400px]">
            <table className="w-full text-left text-[13px] text-gray-900 whitespace-nowrap">
              <thead className="bg-[#F9FAFB] border-b border-gray-200 text-gray-500 font-semibold">
                <tr>
                  <th className="px-5 py-3 font-semibold">Serial No.</th>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Age</th>
                  <th className="px-5 py-3 font-semibold">Gender</th>
                  <th className="px-5 py-3 font-semibold">Prev. Religion</th>
                  <th className="px-5 py-3 font-semibold">Rev. Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={100} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <span className="text-xs text-gray-500 font-medium">Loading reverts...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReverts.length === 0 ? (
                  <tr>
                    <td colSpan={100} className="p-0">
                      <EmptyState 
                        icon={<Users size={32} />}
                        title="No reverts found"
                        message="Add a new revert record to get started."
                      />
                    </td>
                  </tr>
                ) : paginatedReverts.map((person) => {
                  const age = person.birthdate ? differenceInYears(new Date(), new Date(person.birthdate)) : '-';
                  return (
                    <tr key={person.id} className="transition-colors duration-200 ease-in-out hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                          {person.serialNumber || `AAI-${getChapterCode()}-26-${String(person.id).padStart(4, '0').slice(-4)}`}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          {person.profilePic ? (
                            <img src={person.profilePic} alt={person.name} className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-100" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 text-[11px] font-bold">
                              {person.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{person.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{age}</td>
                      <td className="px-5 py-3">{person.gender}</td>
                      <td className="px-5 py-3">{person.previousReligion}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{formatDisplayDate(person.reversionDate)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-[20px] text-[11px] font-semibold ${
                          person.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' :
                          person.status === 'Under Bio' ? 'bg-[#FFFBEB] text-[#D97706]' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {person.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleOpenPrintModal(person); }} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Print">
                             <Printer size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEdit(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                             <Edit2 size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteRevert(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                             <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            lastPage={paginationMeta.lastPage}
            perPage={perPage}
            total={paginationMeta.total}
            from={paginationMeta.from}
            to={paginationMeta.to}
            isLoading={isLoading}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(pp) => {
              setPerPage(pp);
              setCurrentPage(1);
            }}
          />
        </div>
      </motion.div>
      )}

      {activeTab === 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <DaeyahAnalytics reverts={reverts} dateRange={dateRange} members={members} />
        </motion.div>
      )}

    </div>
      {/* Add New Revert Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <h3 className="text-[16px] font-semibold text-gray-900">{editingId ? 'Edit Revert' : 'Add New Revert'}</h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:opacity-80">
                  <X size={18} />
                </button>
              </div>
              
              <div className="overflow-y-auto px-6 py-4 max-h-full">
                <form id="add-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wide">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* System-Generated Serial Number Banner */}
                      <div className="md:col-span-2 bg-gradient-to-r from-orange-50/70 to-amber-50/50 p-3.5 rounded-xl border border-orange-200/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                                Assigned Serial Number
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-200/80 text-orange-900 rounded-full border border-orange-300">
                                Chapter: {getChapterCode()}
                              </span>
                            </div>
                            <div className="font-mono text-base font-black text-gray-900 tracking-wide">
                              {formData.serialNumber || 'AAI-' + getChapterCode() + '-26-0001'}
                            </div>
                          </div>
                          <span className="text-[11px] text-gray-500 max-w-[220px] sm:text-right">
                            Auto-stamped by chapter environment variable (<code className="font-semibold text-gray-700">AAI-[CHAPTER]-YY-XXXX</code>).
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-medium text-gray-600 mb-2">Profile Picture (Optional)</label>
                        <div className="flex items-center gap-4">
                          {formData.profilePic && (
                            <img src={formData.profilePic} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                try {
                                  toast.loading('Uploading photo...', { id: 'upload-revert-photo' });
                                  const res = await api.uploadFile(file);
                                  setFormData({ ...formData, profilePic: res.url });
                                  toast.success('Photo uploaded successfully', { id: 'upload-revert-photo' });
                                } catch (err: any) {
                                  console.error(err);
                                  setFormData({ ...formData, profilePic: URL.createObjectURL(file) });
                                  toast.error(err.message || 'Upload failed, using local preview', { id: 'upload-revert-photo' });
                                }
                              }
                            }}
                            className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[13px] file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer transition-colors"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Full Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 outline-hidden transition-all text-gray-900" placeholder="e.g. John Doe" />
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Date of Birth</label>
                        <input required type="date" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Sex</label>
                        <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900">
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Ethnicity</label>
                        <input type="text" value={formData.ethnicity} onChange={e => setFormData({...formData, ethnicity: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="e.g. Maguindanaon" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Civil Status</label>
                        <select value={formData.civilStatus} onChange={e => setFormData({...formData, civilStatus: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900">
                          <option>Single</option>
                          <option>Married</option>
                          <option>Widowed</option>
                          <option>Divorced</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Complete Address</label>
                        <input type="text" value={formData.completeAddress} onChange={e => setFormData({...formData, completeAddress: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Street, Barangay, City/Municipality, Province" />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Contact Number</label>
                        <input type="tel" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="e.g. 09123456789" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Facebook Account</label>
                        <input type="text" value={formData.facebookAccount} onChange={e => setFormData({...formData, facebookAccount: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Facebook name or link" />
                      </div>

                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Email Address</label>
                        <input type="email" value={formData.emailAddress} onChange={e => setFormData({...formData, emailAddress: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Email address" />
                      </div>
                      <div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[13px] font-medium text-gray-600 mb-1">Educational Background</label>
                              <select value={formData.educationalBackground} onChange={e => setFormData({...formData, educationalBackground: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900">
                                <option>Elementary</option>
                                <option>High School</option>
                                <option>College Graduate</option>
                                <option>Postgraduate</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-[13px] font-medium text-gray-600 mb-1">Profession (Job)</label>
                              <input type="text" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Current job" />
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Islamic Information */}
                  <div>
                    <h4 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wide">Islamic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Muslim Name</label>
                        <input type="text" value={formData.muslimName} onChange={e => setFormData({...formData, muslimName: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Adopted Muslim name" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Date of Embracing Islam</label>
                        <input required type="date" value={formData.reversionDate} onChange={e => setFormData({...formData, reversionDate: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Previous Religion</label>
                        <input required type="text" value={formData.previousReligion} onChange={e => setFormData({...formData, previousReligion: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="e.g. Christianity" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Da'eyah's Name (Preacher)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            list="approved-daeyahs-list"
                            value={formData.daeyahName} 
                            onChange={e => setFormData({...formData, daeyahName: e.target.value})} 
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" 
                            placeholder="Select or enter Da'eyah name..." 
                          />
                          <datalist id="approved-daeyahs-list">
                            {approvedDaeyahs.map(dName => (
                              <option key={dName} value={dName} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Islamic Center</label>
                        <input type="text" value={formData.islamicCenter} onChange={e => setFormData({...formData, islamicCenter: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Location/Center of embracing Islam" />
                      </div>
                    </div>
                  </div>

                  {/* Witnesses */}
                  <div>
                    <h4 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wide">Witnesses</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Witness 1</label>
                        <input type="text" value={formData.witness1} onChange={e => setFormData({...formData, witness1: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Name of witness" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Witness 2</label>
                        <input type="text" value={formData.witness2} onChange={e => setFormData({...formData, witness2: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Name of witness" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-600 mb-1">Witness 3 (Optional)</label>
                        <input type="text" value={formData.witness3} onChange={e => setFormData({...formData, witness3: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="Name of witness" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Da'eyah & Mentorship Details */}
                  <div>
                     <h4 className="text-[14px] font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wide">Da'eyah & Mentorship Details</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-medium text-gray-600 mb-1">Facilitator</label>
                          <select 
                            value={formData.facilitatorId || ''} 
                            onChange={e => {
                              setFormData({
                                ...formData, 
                                facilitatorId: e.target.value,
                              });
                            }} 
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900 cursor-pointer"
                          >
                            <option value="">Unassigned (No Facilitator)</option>
                            {facilitators.map(fac => (
                              <option key={fac.id} value={String(fac.id)}>
                                {fac.name} {fac.department ? `(${fac.department})` : ''}
                              </option>
                            ))}
                            {formData.facilitatorId && !facilitators.some(f => String(f.id) === String(formData.facilitatorId)) && (
                              <option value={formData.facilitatorId}>
                                {editingRevert?.facilitator?.person?.name || `Staff #${formData.facilitatorId}`}
                              </option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-gray-600 mb-1">Source</label>
                          <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900 cursor-pointer">
                            <option value="Walk-in">Walk-in</option>
                            <option value="Street Da'wah">Street Da'wah</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Friend/Family">Friend/Family</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-gray-600 mb-1">Mentorship Status</label>
                          <select value={formData.mentorshipStatus} onChange={e => setFormData({...formData, mentorshipStatus: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900 cursor-pointer">
                            <option value="Pending Assignment">Pending Assignment</option>
                            <option value="Mentor Assigned">Mentor Assigned</option>
                            <option value="Completed Foundation Course">Completed Foundation Course</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-gray-600 mb-1">Status</label>
                          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900 cursor-pointer">
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Under Bio</option>
                          </select>
                        </div>
                     </div>
                  </div>

                  {/* Certification */}
                  <div>
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <input 
                        type="checkbox" 
                        id="certification" 
                        checked={isCertified}
                        onChange={(e) => setIsCertified(e.target.checked)}
                        className="mt-1 w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer" 
                      />
                      <label htmlFor="certification" className="text-[13px] text-gray-700 font-medium cursor-pointer">
                        I hereby certify that the above information is true and correct to the best of my knowledge.
                      </label>
                    </div>
                  </div>

                </form>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 bg-[#F9FAFB] flex justify-end gap-3 mt-auto shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors cursor-pointer hover:opacity-80">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="add-form" 
                  disabled={!isCertified || isSubmitting} 
                  className="px-4 py-2 text-[14px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Save Record'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {isPrintModalOpen && printRevert && (
          <PrintPreviewModal revert={printRevert} onClose={handleClosePrintModal} />
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={revertToDelete !== null}
        onClose={() => setRevertToDelete(null)}
        onConfirm={confirmDeleteRevert}
        title="Delete Revert Record"
        message="WARNING: Are you sure you want to permanently delete this revert record? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </>
  );
}
