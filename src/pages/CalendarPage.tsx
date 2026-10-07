import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, Printer, Download, ChevronDown, FileDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { addHours, startOfDay, endOfDay, subYears, addYears, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, isSameDay } from 'date-fns';
import { generateInstances } from '../utils/recurrence';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { createPortal } from 'react-dom';
import { useAuth } from '../AuthContext';
import { canManageOperations } from '../lib/permissions';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const CalendarExportContext = React.createContext<{
  handlePrint: () => void;
  handleDownloadPdf: () => Promise<void>;
} | null>(null);

const defaultFormData = {

  id: '',
  title: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  allDay: false,
  type: 'event',
  location: '',
  description: '',
  isRecurring: false,
  recurrence: {
    frequency: 'weekly',
    interval: '1',
    endCondition: 'never',
    endDate: '',
    count: '10'
  }
};

const eventColors = {
  meeting: 'bg-blue-500',
  event: 'bg-orange-500',
  class: 'bg-emerald-500',
  tournament: 'bg-purple-500'
};

const CustomToolbar = (toolbar: any) => {
  const { date, view, onNavigate, onView, label } = toolbar;
  const exportCtx = React.useContext(CalendarExportContext);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  console.log('CalendarExportContext in Toolbar:', exportCtx);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (view === 'month' && toolbar.setCurrentDate) {
      toolbar.setCurrentDate((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
    else if (view === 'week') onNavigate('PREV', subWeeks(date, 1));
    else onNavigate('PREV', subDays(date, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (view === 'month' && toolbar.setCurrentDate) {
      toolbar.setCurrentDate((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
    else if (view === 'week') onNavigate('NEXT', addWeeks(date, 1));
    else onNavigate('NEXT', addDays(date, 1));
  };

  const goToCurrent = () => {
    const now = new Date();
    if (view === 'month') {
      onNavigate('TODAY', new Date(now.getFullYear(), now.getMonth(), 1));
    } else {
      onNavigate('TODAY', now);
    }
  };

  const setView = (newView: any) => {
    onView(newView);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
      <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start print:hidden export-ignore">
        <button 
          onClick={goToCurrent}
          className="px-3 py-1.5 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          Today
        </button>
        <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <button 
            type="button"
            onClick={(e) => handlePrevMonth(e)} 
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-200"
          >
            <ChevronLeft size={18} className="pointer-events-none" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleNextMonth(e)} 
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={18} className="pointer-events-none" />
          </button>
        </div>
      </div>

      <div className="flex-1 text-center text-[16px] font-bold text-gray-900 min-w-[150px]">
        {label}
      </div>

      <div className="flex justify-center sm:justify-end flex-1 gap-3">
        <div className="flex items-center bg-gray-100 p-1 rounded-full print:hidden export-ignore">
          {['month', 'week', 'day', 'agenda'].map(viewName => (
            <button
              key={viewName}
              onClick={() => setView(viewName)}
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-full capitalize transition-all ${
                view === viewName 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {viewName}
            </button>
          ))}
        </div>
        
        <div className="relative print:hidden export-ignore">
          <button 
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
          >
            Export
            <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 print:hidden"
                >
                  <div className="p-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsExportMenuOpen(false);
                        if (exportCtx?.handleDownloadPdf) {
                          exportCtx.handleDownloadPdf().catch(err => console.error("Export PDF error:", err));
                        }
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                    >
                      <FileDown size={16} />
                      Save as PDF
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsExportMenuOpen(false);
                        if (exportCtx?.handlePrint) exportCtx.handlePrint();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                    >
                      <Printer size={16} />
                      Print
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default function CalendarPage({ events, setEvents }: { events: any[], setEvents: (e: any[]) => void }) {
  const { currentUser } = useAuth();
  const calendarRef = useRef<HTMLDivElement>(null);
  // 1. Standardize Date State Management
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 4. Dynamic Grid Calculations (Derived purely from currentDate state)
  const targetYear = currentDate.getFullYear();
  const activeMonthIndex = currentDate.getMonth();
  const startingDayOfWeek = new Date(targetYear, activeMonthIndex, 1).getDay();
  const totalDaysInMonth = new Date(targetYear, activeMonthIndex + 1, 0).getDate();
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  
  const handlePrint = () => {
    console.log('Opening native print dialog...');
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      console.log('Starting PDF generation...');
      if (!calendarRef.current) {
        throw new Error('Calendar reference is null. Ensure the component is mounted.');
      }
      
      // Slight delay to ensure UI states settle before capture
      await new Promise(r => setTimeout(r, 150));
      
      const element = calendarRef.current;
      
      console.log('Capturing HTML to Image...');
      const imgData = await toPng(element, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node?.classList?.contains('export-ignore')) {
            return false;
          }
          return true;
        }
      });
      
      console.log('Image generated. Converting to PDF...');
      
      const orientation = (currentView === 'month' || currentView === 'week') ? 'l' : 'p';
      const pdf = new jsPDF(orientation, 'pt', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add Header
      const viewTitle = currentView.charAt(0).toUpperCase() + currentView.slice(1);
      const dateTitle = format(currentDate, 'MMMM yyyy');
      
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Calendar Schedule', 40, 40);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${viewTitle} View - ${dateTitle}`, 40, 60);
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      // Calculate available space after header (startY = 80, margins = 40)
      const startY = 80;
      const marginX = 40;
      const marginY = 40;
      const availableWidth = pdfWidth - (marginX * 2);
      const availableHeight = pdfHeight - startY - marginY;
      
      let imgWidth = availableWidth;
      let imgHeight = availableWidth / ratio;
      
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * ratio;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = startY;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`calendar-${currentView}-${format(currentDate, 'yyyy-MM-dd')}.pdf`);
      console.log('PDF saved successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const [recurringAction, setRecurringAction] = useState<{
    isOpen: boolean;
    type: 'edit' | 'delete' | 'move';
    event: any;
    pendingData?: any;
  }>({ isOpen: false, type: 'edit', event: null });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const visibleEvents = React.useMemo(() => {
    const start = subYears(new Date(), 1);
    const end = addYears(new Date(), 2);
    return generateInstances(events, start, end);
  }, [events]);

  const handleOpenModal = (event?: any) => {
    if (event && event.id) {
      setIsEditing(true);
      setFormData({
        id: event.id,
        title: event.title,
        startDate: format(new Date(event.start), 'yyyy-MM-dd'),
        startTime: format(new Date(event.start), 'HH:mm'),
        endDate: format(new Date(event.end), 'yyyy-MM-dd'),
        endTime: format(new Date(event.end), 'HH:mm'),
        allDay: event.allDay || false,
        type: event.type || 'event',
        location: event.location || '',
        description: event.description || '',
        isRecurring: event.isRecurring || false,
        recurrence: event.recurrence || defaultFormData.recurrence
      });
    } else {
      setIsEditing(false);
      const start = event?.start || new Date();
      const end = event?.end || addHours(start, 1);
      setFormData({
        ...defaultFormData,
        startDate: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endDate: format(end, 'yyyy-MM-dd'),
        endTime: format(end, 'HH:mm'),
        allDay: event?.allDay || false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(defaultFormData);
    setIsEditing(false);
  };

  const processEventSubmission = async (pendingData: any, eventContext?: any) => {
    if (eventContext && (eventContext.isInstance || eventContext.isRecurring)) {
      setRecurringAction({ isOpen: true, type: 'edit', event: eventContext, pendingData });
      return;
    }
    
    setIsSubmitting(true);
    if (isEditing) {
      try {
        const updated = await api.events.update(pendingData.id, pendingData);
        setEvents(events.map(ev => ev.id === pendingData.id ? { ...ev, ...updated, start: new Date(updated.start), end: new Date(updated.end) } : ev));
        toast.success('Event updated successfully.');
        handleCloseModal();
      } catch (err: any) {
        toast.error(err.message || 'Unable to update event. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const created = await api.events.create(pendingData);
        setEvents([...events, { ...created, start: new Date(created.start), end: new Date(created.end) }]);
        toast.success('Event created successfully.');
        handleCloseModal();
      } catch (err: any) {
        toast.error(err.message || 'Unable to create event. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    if (!formData.title) return;

    let start = new Date(`${formData.startDate}T${formData.startTime}`);
    let end = new Date(`${formData.endDate}T${formData.endTime}`);

    if (formData.allDay) {
      start = startOfDay(new Date(formData.startDate));
      end = endOfDay(new Date(formData.endDate));
    }

    const newEvent = {
      id: isEditing ? formData.id : Date.now(),
      title: formData.title,
      start,
      end,
      allDay: formData.allDay,
      type: formData.type,
      location: formData.location,
      description: formData.description,
      isRecurring: formData.isRecurring,
      recurrence: formData.isRecurring ? formData.recurrence : undefined
    };

    // Find the original instance if editing
    const eventContext = isEditing ? visibleEvents.find(e => e.id === formData.id) : null;
    processEventSubmission(newEvent, eventContext);
  };

  const handleDelete = () => {
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    const eventContext = visibleEvents.find(e => e.id === formData.id);
    if (eventContext && (eventContext.isInstance || eventContext.isRecurring)) {
      setRecurringAction({ isOpen: true, type: 'delete', event: eventContext });
    } else {
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      await api.events.delete(formData.id);
      setEvents(events.filter(ev => ev.id !== formData.id));
      toast.success('Event deleted successfully.');
      setIsDeleteModalOpen(false);
      handleCloseModal();
    } catch (err: any) {
      toast.error(err.message || 'Unable to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResolveRecurring = (scope: 'this' | 'following' | 'all') => {
    const { type, event, pendingData } = recurringAction;
    const masterId = event.masterId || event.id;
    let newEvents = [...events];
    
    if (type === 'delete') {
      if (scope === 'this') {
        newEvents.push({ id: Date.now(), exceptionType: 'deleted', groupId: masterId, originalStart: event.originalStart });
      } else if (scope === 'following') {
        newEvents = newEvents.map(e => e.id === masterId ? { 
          ...e, 
          recurrence: { ...e.recurrence, endCondition: 'until', endDate: subDays(event.originalStart, 1) } 
        } : e);
      } else if (scope === 'all') {
        newEvents = newEvents.filter(e => e.id !== masterId && e.groupId !== masterId);
      }
    } else if (type === 'edit' || type === 'move') {
      const updatedEventData = {
        ...pendingData,
        id: Date.now(),
        exceptionType: 'modified',
        groupId: masterId,
        originalStart: event.originalStart
      };

      if (scope === 'this') {
        const existingExIdx = newEvents.findIndex(e => e.groupId === masterId && isSameDay(e.originalStart, event.originalStart));
        if (existingExIdx >= 0) newEvents[existingExIdx] = updatedEventData;
        else newEvents.push(updatedEventData);
      } else if (scope === 'following') {
        newEvents = newEvents.map(e => e.id === masterId ? { 
          ...e, 
          recurrence: { ...e.recurrence, endCondition: 'until', endDate: subDays(event.originalStart, 1) } 
        } : e);
        newEvents.push({
          ...pendingData,
          id: Date.now(),
          isRecurring: true,
          recurrence: pendingData.recurrence || event.recurrence
        });
      } else if (scope === 'all') {
        newEvents = newEvents.map(e => e.id === masterId ? { ...pendingData, id: masterId, isRecurring: true } : e);
        newEvents = newEvents.filter(e => e.groupId !== masterId);
      }
    }

    setEvents(newEvents);
    if (type === 'delete') {
      toast.success('Event deleted successfully.');
    } else {
      toast.success('Event updated successfully.');
    }
    setRecurringAction({ isOpen: false, type: 'edit', event: null });
    setIsModalOpen(false);
  };

  const onEventResize = useCallback(
    async ({ event, start, end }: any) => {
      if (!canManageOperations(currentUser.role)) {
        toast.error("Unauthorized: Operations access required.");
        return;
      }
      const updated = { ...event, start, end };
      if (event.isInstance || event.isRecurring) {
        setRecurringAction({ isOpen: true, type: 'move', event, pendingData: updated });
      } else {
        setEvents(events.map(ev => ev.id === event.id ? updated : ev));
        try {
          await api.events.update(event.id, updated);
          toast.success('Event schedule updated.');
        } catch {
          // Keep local state update
        }
      }
    },
    [events, setEvents, currentUser.role]
  );

  const onEventDrop = useCallback(
    async ({ event, start, end }: any) => {
      if (!canManageOperations(currentUser.role)) {
        toast.error("Unauthorized: Operations access required.");
        return;
      }
      const updated = { ...event, start, end };
      if (event.isInstance || event.isRecurring) {
        setRecurringAction({ isOpen: true, type: 'move', event, pendingData: updated });
      } else {
        setEvents(events.map(ev => ev.id === event.id ? updated : ev));
        try {
          await api.events.update(event.id, updated);
          toast.success('Event schedule updated.');
        } catch {
          // Keep local state update
        }
      }
    },
    [events, setEvents, currentUser.role]
  );

  const eventPropGetter = useCallback(
    (event: any) => ({
      className: `border-none text-white ${eventColors[event.type as keyof typeof eventColors] || 'bg-orange-500'}`
    }),
    []
  );

  return (
    <div className="space-y-6 pb-6 h-full flex flex-col print:space-y-0 print:pb-0 print:block">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0 print:hidden">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Calendar</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage events, classes, meetings and tournaments.</p>
        </div>
        {canManageOperations(currentUser.role) && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Event
          </button>
        )}
      </div>

      <CalendarExportContext.Provider value={{ handlePrint, handleDownloadPdf }}>
        <div ref={calendarRef} className="bg-white rounded-xl shadow-custom border border-gray-200 overflow-hidden flex-1 min-h-[600px] flex flex-col p-4 print:border-none print:shadow-none print:p-0 print:block print:min-h-0">
          <style>{`
            .rbc-btn-group button.rbc-active {
              background-color: #f97316;
              color: white;
              border-color: #f97316;
              box-shadow: none;
            }
            .rbc-btn-group button:hover:not(.rbc-active) {
              background-color: #fff7ed;
            }
            .rbc-today {
              background-color: #fff7ed;
            }
            .rbc-event {
              padding: 2px 5px;
              font-size: 12px;
              font-weight: 500;
            }
            
            @media print {
              @page {
                size: landscape;
                margin: 1cm;
              }
              body, html, #root {
                height: auto !important;
                overflow: visible !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .rbc-calendar {
                height: 100vh !important;
                max-height: 100vh !important;
              }
              .rbc-agenda-view {
                height: auto !important;
                max-height: none !important;
              }
              .rbc-time-content {
                overflow: visible !important;
              }
            }
          `}</style>
          <DnDCalendar
            localizer={localizer}
            events={visibleEvents}
            date={currentDate}
            view={currentView}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            onView={(newView) => setCurrentView(newView)}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            onSelectEvent={(event) => handleOpenModal(event)}
            onSelectSlot={(slotInfo) => handleOpenModal(slotInfo)}
            selectable
            resizable
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            eventPropGetter={eventPropGetter}
            components={useMemo(() => ({
              toolbar: (props: any) => <CustomToolbar {...props} setCurrentDate={setCurrentDate} />
            }), [setCurrentDate])}
            style={{ height: '100%', minHeight: '500px' }}
          />
        </div>
      </CalendarExportContext.Provider>

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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <h3 className="text-[16px] font-semibold text-gray-900">{isEditing ? 'Edit Event' : 'Add New Event'}</h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]">
                  <X size={18} />
                </button>
              </div>
              
              <div className="px-6 py-4 overflow-y-auto">
                <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-500 mb-1">Event Title</label>
                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 outline-hidden transition-all text-gray-900" placeholder="e.g. Community Dinner" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="allDay" checked={formData.allDay} onChange={e => setFormData({...formData, allDay: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500 border-gray-300" />
                    <label htmlFor="allDay" className="text-[13px] font-medium text-gray-700">All-day event</label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-gray-500 mb-1">Start Date</label>
                      <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                    </div>
                    {!formData.allDay && (
                      <div>
                        <label className="block text-[13px] font-medium text-gray-500 mb-1">Start Time</label>
                        <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-gray-500 mb-1">End Date</label>
                      <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                    </div>
                    {!formData.allDay && (
                      <div>
                        <label className="block text-[13px] font-medium text-gray-500 mb-1">End Time</label>
                        <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-gray-500 mb-1">Event Type</label>
                      <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900">
                        <option value="class">Class</option>
                        <option value="meeting">Meeting</option>
                        <option value="event">Community Event</option>
                        <option value="tournament">Tournament</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-gray-500 mb-1">Location</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white transition-all outline-hidden text-gray-900" placeholder="e.g. Central Masjid" />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" id="isRecurring" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500 border-gray-300" />
                      <label htmlFor="isRecurring" className="text-[13px] font-medium text-gray-900">Repeat event</label>
                    </div>

                    {formData.isRecurring && (
                      <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-gray-600">Repeat every</span>
                          <input type="number" min="1" value={formData.recurrence.interval} onChange={e => setFormData({...formData, recurrence: {...formData.recurrence, interval: e.target.value}})} className="w-16 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm outline-hidden focus:border-orange-500 text-center" />
                          <select value={formData.recurrence.frequency} onChange={e => setFormData({...formData, recurrence: {...formData.recurrence, frequency: e.target.value}})} className="w-28 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm outline-hidden focus:border-orange-500">
                            <option value="daily">Days</option>
                            <option value="weekly">Weeks</option>
                            <option value="monthly">Months</option>
                            <option value="yearly">Years</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-gray-600 mb-2">Ends</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[13px] text-gray-700">
                              <input type="radio" name="endCondition" value="never" checked={formData.recurrence.endCondition === 'never'} onChange={() => setFormData({...formData, recurrence: {...formData.recurrence, endCondition: 'never'}})} className="text-orange-500 focus:ring-orange-500" />
                              Never
                            </label>
                            <div className="flex items-center gap-2 text-[13px] text-gray-700">
                              <label className="flex items-center gap-2">
                                <input type="radio" name="endCondition" value="until" checked={formData.recurrence.endCondition === 'until'} onChange={() => setFormData({...formData, recurrence: {...formData.recurrence, endCondition: 'until'}})} className="text-orange-500 focus:ring-orange-500" />
                                On date
                              </label>
                              {formData.recurrence.endCondition === 'until' && (
                                <input type="date" value={formData.recurrence.endDate} onChange={e => setFormData({...formData, recurrence: {...formData.recurrence, endDate: e.target.value}})} className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-sm outline-hidden focus:border-orange-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[13px] text-gray-700">
                              <label className="flex items-center gap-2">
                                <input type="radio" name="endCondition" value="count" checked={formData.recurrence.endCondition === 'count'} onChange={() => setFormData({...formData, recurrence: {...formData.recurrence, endCondition: 'count'}})} className="text-orange-500 focus:ring-orange-500" />
                                After
                              </label>
                              {formData.recurrence.endCondition === 'count' && (
                                <div className="flex items-center gap-2">
                                  <input type="number" min="1" value={formData.recurrence.count} onChange={e => setFormData({...formData, recurrence: {...formData.recurrence, count: e.target.value}})} className="ml-2 w-16 px-2 py-1 bg-white border border-gray-300 rounded text-sm outline-hidden focus:border-orange-500 text-center" />
                                  <span>occurrences</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-gray-500 mb-1">Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 outline-hidden transition-all text-gray-900 resize-none" placeholder="Provide event details..." />
                  </div>
                </form>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 bg-[#F9FAFB] flex justify-between items-center gap-3">
                <div>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={handleDelete} 
                      disabled={isSubmitting || isDeleting}
                      className="px-3 py-2 text-[14px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleCloseModal} 
                    disabled={isSubmitting || isDeleting}
                    className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="event-form" 
                    disabled={isSubmitting || isDeleting}
                    className="px-4 py-2 text-[14px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-w-[110px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{isEditing ? 'Saving...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <span>{isEditing ? 'Save Changes' : 'Create Event'}</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recurringAction.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setRecurringAction({ ...recurringAction, isOpen: false })}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Recurring Event</h3>
              <p className="text-sm text-gray-600 mb-6">
                You're trying to {recurringAction.type} a recurring event. How would you like to apply this change?
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleResolveRecurring('this')}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors"
                >
                  This event only
                </button>
                <button 
                  onClick={() => handleResolveRecurring('following')}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors"
                >
                  This and following events
                </button>
                <button 
                  onClick={() => handleResolveRecurring('all')}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 transition-colors"
                >
                  All events in the series
                </button>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setRecurringAction({ ...recurringAction, isOpen: false })}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteEvent}
        title="Delete Event?"
        message="Are you sure you want to delete this event? This action cannot be undone."
        isDeleting={isDeleting}
      />
    </div>
  );
}
