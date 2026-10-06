import toast from 'react-hot-toast';
import { canManageOperations } from '../lib/permissions';
import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingUp, TrendingDown, DollarSign, Plus, X, Search, Edit2, Trash2, Printer, Download, Receipt, HeartHandshake } from 'lucide-react';
import Tilt from '../components/Tilt';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

import { DateRange } from '../components/DateRangePicker';
import { startOfDay, endOfDay, format } from 'date-fns';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import EmptyState from '../components/EmptyState';
import DonationPrintTemplate from '../components/DonationPrintTemplate';
import { createPortal } from 'react-dom';
import { api } from '../services/api';

const mockCampaigns = [
  { id: '1', title: 'Zakat Fund', description: 'Annual Zakat collection for distribution to the needy in the community.', goalAmount: 100000, category: 'Zakat' },
  { id: '2', title: 'General Center Fund', description: 'Operations and maintenance of the Islamic Center facilities.', goalAmount: 50000, category: 'General' },
  { id: '3', title: 'Ramadan Iftar', description: 'Sponsor Iftar meals during the holy month of Ramadan.', goalAmount: 30000, category: 'Ramadan' },
];

const mockDonations = [
  { id: 'd1', date: '2026-08-30', donorName: 'Ahmad Abdullah', amount: 5000, category: 'Zakat', campaignId: '1' },
  { id: 'd2', date: '2026-08-28', donorName: 'Anonymous', amount: 1500, category: 'Sadaqah', campaignId: '2' },
  { id: 'd3', date: '2026-08-25', donorName: 'Fatima Reyes', amount: 3000, category: 'Zakat', campaignId: '1' },
  { id: 'd4', date: '2026-08-20', donorName: 'Anonymous', amount: 500, category: 'Sadaqah', campaignId: '3' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Zakat': return 'bg-emerald-500';
    case 'General': return 'bg-blue-500';
    case 'Ramadan': return 'bg-amber-500';
    default: return 'bg-gray-500';
  }
};

export default function Donations({ view, dateRange, campaigns, setCampaigns, donations, setDonations }: { view: string, dateRange: DateRange, campaigns: any[], setCampaigns: (v: any) => void, donations: any[], setDonations: (v: any) => void }) {
  const { currentUser } = useAuth();


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [donationToDelete, setDonationToDelete] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      if (!printRef.current) return;
      
      await new Promise(r => setTimeout(r, 150));
      const imgData = await toPng(printRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / ratio;
      
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = imgHeight * ratio;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save('Donation-Report.pdf');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsGeneratingPdf(true);
      if (!printRef.current) return;
      
      await new Promise(r => setTimeout(r, 150));
      const imgData = await toPng(printRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / ratio;
      
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = imgHeight * ratio;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    description: '',
    goalAmount: '',
    category: 'Zakat'
  });

  const [formData, setFormData] = useState({
    donorName: '',
    isAnonymous: false,
    amount: '',
    category: 'Zakat',
    campaignId: 'none',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    const amountNum = Number(formData.amount);
    const newCampaignId = formData.campaignId === 'none' ? null : Number(formData.campaignId);

    const donationPayload = {
      date: formData.date,
      donorName: formData.isAnonymous ? 'Anonymous' : formData.donorName,
      amount: amountNum,
      category: formData.category,
      campaignId: newCampaignId,
      paymentMethod: formData.paymentMethod || 'Cash'
    };

    if (editingDonation) {
      try {
        const updated = await api.donations.update(editingDonation.id, donationPayload);
        setDonations(donations.map(d => d.id === editingDonation.id ? { ...d, ...updated } : d));
      } catch (err) {
        console.warn('Backend update donation failed, updating locally:', err);
        setDonations(donations.map(d => 
          d.id === editingDonation.id 
            ? { ...d, ...donationPayload } 
            : d
        ));
      }
    } else {
      try {
        const created = await api.donations.create(donationPayload);
        setDonations([created, ...donations]);
      } catch (err) {
        console.warn('Backend create donation failed, saving locally:', err);
        const newDonation = {
          id: 'd' + Date.now(),
          ...donationPayload
        };
        setDonations([newDonation, ...donations]);
      }
    }

    setIsAddModalOpen(false);
    setEditingDonation(null);
    setFormData({
      donorName: '',
      isAnonymous: false,
      amount: '',
      category: 'Zakat',
      campaignId: 'none',
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEditDonation = (donation: any) => {
    setEditingDonation(donation);
    setFormData({
      donorName: donation.donorName === 'Anonymous' ? '' : donation.donorName,
      isAnonymous: donation.donorName === 'Anonymous',
      amount: donation.amount.toString(),
      category: donation.category,
      campaignId: donation.campaignId || 'none',
      paymentMethod: donation.paymentMethod || 'Cash',
      date: donation.date
    });
    setIsAddModalOpen(true);
  };

  const confirmDeleteDonation = async () => {
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    if (donationToDelete) {
      try {
        await api.donations.delete(donationToDelete);
      } catch (err) {
        console.warn('Backend delete donation failed, removing locally:', err);
      }
      setDonations(donations.filter(d => d.id !== donationToDelete));
      setDonationToDelete(null);
      toast.success('Donation deleted successfully!');
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    const goalAmountNum = Number(campaignFormData.goalAmount);
    const campaignPayload = {
      title: campaignFormData.title,
      description: campaignFormData.description,
      goalAmount: goalAmountNum,
      category: campaignFormData.category
    };
    
    if (editingCampaign) {
      try {
        const updated = await api.campaigns.update(editingCampaign.id, campaignPayload);
        setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { ...c, ...updated } : c));
      } catch (err) {
        console.warn('Backend update campaign failed, updating locally:', err);
        setCampaigns(campaigns.map(c => 
          c.id === editingCampaign.id 
            ? { ...c, ...campaignPayload }
            : c
        ));
      }
    } else {
      try {
        const created = await api.campaigns.create(campaignPayload);
        setCampaigns([created, ...campaigns]);
      } catch (err) {
        console.warn('Backend create campaign failed, saving locally:', err);
        const newCampaign = {
          id: 'c' + Date.now(),
          ...campaignPayload
        };
        setCampaigns([newCampaign, ...campaigns]);
      }
    }
    
    setIsCampaignModalOpen(false);
    setEditingCampaign(null);
    setCampaignFormData({
      title: '',
      description: '',
      goalAmount: '',
      category: 'Zakat'
    });
  };

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setCampaignFormData({
      title: campaign.title,
      description: campaign.description,
      goalAmount: campaign.goalAmount.toString(),
      category: campaign.category
    });
    setIsCampaignModalOpen(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    if (campaignToDelete) {
      try {
        await api.campaigns.delete(campaignToDelete);
      } catch (err) {
        console.warn('Backend delete campaign failed, removing locally:', err);
      }
      setCampaigns(campaigns.filter(c => c.id !== campaignToDelete));
      setCampaignToDelete(null);
    }
  };

  const filteredDonations = donations.filter(d => {
    const dDate = new Date(d.date);
    dDate.setHours(0, 0, 0, 0);

    if (dateRange.startDate) {
      const start = startOfDay(dateRange.startDate);
      if (dDate < start) return false;
    }
    if (dateRange.endDate) {
      const end = startOfDay(dateRange.endDate); // comparing normalized dates
      if (dDate > end) return false;
    }
    
    if (filterCategory !== 'All' && d.category !== filterCategory) return false;
    if (searchQuery && !d.donorName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalZakat = filteredDonations.filter(d => d.category === 'Zakat').reduce((sum, d) => sum + d.amount, 0);
  const totalSadaqah = filteredDonations.filter(d => d.category === 'Sadaqah').reduce((sum, d) => sum + d.amount, 0);
  const overallTotal = filteredDonations.reduce((sum, d) => sum + d.amount, 0);

  const totalContributions = filteredDonations.length;
  const averageDonation = totalContributions > 0 ? (overallTotal / totalContributions).toFixed(2) : 0;

  const dateSubtitle = dateRange.startDate && dateRange.endDate 
    ? `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`
    : 'All Time';

  const printDonations = filteredDonations.map(d => ({
    ...d,
    campaignTitle: campaigns.find(c => c.id === d.campaignId)?.title
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Hidden Print Template */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <DonationPrintTemplate 
          ref={printRef}
          donations={printDonations}
          dateSubtitle={dateSubtitle}
          totalAmount={overallTotal}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Donations</h1>
          <p className="text-[14px] text-gray-500">Manage fundraising campaigns and donation history.</p>
        </div>
        {view === 'campaigns' && canManageOperations(currentUser.role) && (
          <button 
            onClick={() => {
              setEditingCampaign(null);
              setCampaignFormData({ title: '', description: '', goalAmount: '', category: 'Zakat' });
              setIsCampaignModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            New Campaign
          </button>
        )}
      </div>

      <div>
        <AnimatePresence mode="wait">
          {view === 'campaigns' ? (
            <motion.div
              key="campaigns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={campaigns.length === 0 ? "w-full" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"}
            >
              {campaigns.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 w-full py-12">
                  <EmptyState 
                    icon={<Target size={32} />}
                    title="No active campaigns"
                    message="Create a new campaign to start tracking goals."
                  />
                </div>
              ) : (
                campaigns.map(campaign => {
                  const currentRaised = donations.filter(donation => donation.campaignId === campaign.id).reduce((sum, donation) => sum + Number(donation.amount), 0);
                  const percentage = Math.min((currentRaised / campaign.goalAmount) * 100, 100);
                  return (
                  <div key={campaign.id} className="relative bg-white shadow-sm border border-gray-200 rounded-lg p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl group flex flex-col">
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={(e) => { e.stopPropagation(); handleEditCampaign(campaign); }} className="p-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCampaignToDelete(campaign.id); }} className="p-1.5 text-gray-400 hover:text-rose-500 bg-gray-50 hover:bg-rose-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight pr-12">{campaign.title}</h3>
                      <span className={`px-2 py-1 rounded text-[11px] font-bold tracking-wide uppercase text-white transition-opacity duration-200 group-hover:opacity-0 ${getCategoryColor(campaign.category)}`}>
                        {campaign.category}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500 mb-6 flex-1">{campaign.description}</p>
                    
                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-[13px] mb-2">
                        <span>Goal: {formatCurrency(campaign.goalAmount)}</span>
                        <span className="font-bold text-right">Raised: {formatCurrency(currentRaised)}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-3 rounded-full mb-2 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-1000 ${getCategoryColor(campaign.category)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
                })
              )}

            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 w-full"
            >


              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Tilt className="h-full">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Zakat</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateSubtitle}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                        <DollarSign size={20} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2 text-right">{formatCurrency(totalZakat)}</div>
                  </div>
                </Tilt>

                <Tilt className="h-full">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Sadaqah</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateSubtitle}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                        <DollarSign size={20} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2 text-right">{formatCurrency(totalSadaqah)}</div>
                  </div>
                </Tilt>

                <Tilt className="h-full">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Overall Total</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateSubtitle}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2 text-right">{formatCurrency(overallTotal)}</div>
                  </div>
                </Tilt>

                <Tilt className="h-full">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Contributions</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateSubtitle}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                        <HeartHandshake size={20} />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1 text-right">{totalContributions}</div>
                    <div className="text-xs text-gray-400 text-right mt-auto">Avg. Gift: ₱{averageDonation}</div>
                  </div>
                </Tilt>
              </div>

              {/* Global Filter Bar & Actions */}
              <div className="flex flex-col xl:flex-row justify-between gap-4 mb-6">
                
                {/* Filter Group (Left) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full sm:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer">
                    <option value="All">All Categories</option>
                    <option value="Zakat">Zakat</option>
                    <option value="Sadaqah">Sadaqah</option>
                    <option value="Operations">Operations</option>
                  </select>
                  <div className="relative w-full sm:w-auto md:w-64 shrink-0">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search donor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>

                {/* Button Group (Right) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  <button
                    onClick={handlePrint}
                    disabled={isGeneratingPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 whitespace-nowrap rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.97] cursor-pointer disabled:opacity-50"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 whitespace-nowrap rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.97] cursor-pointer disabled:opacity-50"
                  >
                    <Download size={16} />
                    Export PDF
                  </button>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 whitespace-nowrap rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.97] cursor-pointer"
                  >
                    <Plus size={16} />
                    Record Donation
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Donation Records</h3>
                </div>
                <div className="w-full overflow-x-auto rounded-lg shadow-sm">
                  <table className="w-full text-left text-[14px] whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-[12px] uppercase font-bold tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Donor</th>
                        <th className="px-6 py-4 font-semibold">Category</th>
                        <th className="px-6 py-4 font-semibold">Campaign</th>
                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredDonations.length === 0 ? (
                        <tr>
                          <td colSpan={100} className="p-0">
                            <EmptyState 
                              icon={<Receipt size={32} />}
                              title="No donations found"
                              message="Adjust your date/category filters or record a new donation."
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredDonations.map(donation => {
                          const campaign = campaigns.find(c => c.id === donation.campaignId);
                          return (
                          <tr key={donation.id} className="transition-colors duration-200 ease-in-out hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{donation.date}</td>
                            <td className="px-6 py-4">{donation.donorName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-opacity-10 ${
                                donation.category === 'Zakat' ? 'bg-emerald-500 text-emerald-700' : 'bg-blue-500 text-blue-700'
                              }`}>
                                {donation.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">{campaign?.title || '-'}</td>
                            <td className="px-6 py-4 font-bold text-right text-gray-900">{formatCurrency(donation.amount)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditDonation(donation)} className="p-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => setDonationToDelete(donation.id)} className="p-1.5 text-gray-400 hover:text-rose-500 bg-gray-50 hover:bg-rose-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Donation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold text-gray-900">{editingDonation ? 'Edit Donation' : 'Record Donation'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:opacity-80 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form id="donation-form" onSubmit={handleSaveDonation} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-gray-700">Donor Name</label>
                <label className="flex items-center gap-2 text-[13px] text-gray-500 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Anonymous
                </label>
              </div>
              <input 
                type="text" 
                required={!formData.isAnonymous}
                disabled={formData.isAnonymous}
                value={formData.isAnonymous ? 'Anonymous' : formData.donorName}
                onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 disabled:opacity-50"
              />

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Amount (₱)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 cursor-pointer"
                  >
                    <option value="Zakat">Zakat</option>
                    <option value="Sadaqah">General Sadaqah</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Payment Method</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Gcash">Gcash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Campaign (Optional)</label>
                <select 
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 cursor-pointer"
                >
                  <option value="none">None / General Fund</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 cursor-pointer"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all hover:opacity-80 active:scale-[0.97] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="donation-form"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
              >
                {editingDonation ? 'Update Donation' : 'Save Donation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold text-gray-900">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button 
                onClick={() => setIsCampaignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:opacity-80 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form id="campaign-form" onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Campaign Title</label>
                <input 
                  type="text" 
                  required
                  value={campaignFormData.title}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                  placeholder="e.g. Mosque Expansion"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={campaignFormData.description}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                  placeholder="Short description of the campaign..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Goal Amount (₱)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={campaignFormData.goalAmount}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, goalAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={campaignFormData.category}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-gray-900 cursor-pointer"
                  >
                    <option value="Zakat">Zakat</option>
                    <option value="General">General</option>
                    <option value="Ramadan">Ramadan</option>
                    <option value="Sadaqah">Sadaqah</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setIsCampaignModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all hover:opacity-80 active:scale-[0.97] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="campaign-form"
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
              >
                Save Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={campaignToDelete !== null}
        onClose={() => setCampaignToDelete(null)}
        onConfirm={confirmDeleteCampaign}
        title="Delete Campaign"
        message="Are you sure you want to delete this campaign? The donations associated with it will remain in history."
      />

      <DeleteConfirmationModal
        isOpen={donationToDelete !== null}
        onClose={() => setDonationToDelete(null)}
        onConfirm={confirmDeleteDonation}
        title="Delete Donation Record"
        message="Are you sure you want to delete this donation record? This will decrement any associated campaign's total."
      />
    </div>
  );
}
