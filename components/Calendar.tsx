
import React, { useState, useMemo, useEffect } from 'react';
import { Student, SessionAppointment, SOAPNote, LessonPlan } from '../types';

interface CalendarProps {
  students: Student[];
  appointments: SessionAppointment[];
  notes: SOAPNote[];
  lessonPlans: LessonPlan[];
  onSchedule: (appt: Partial<SessionAppointment>) => void;
  onUpdateAppointment: (appt: SessionAppointment) => void;
  onDeleteAppointment: (id: string) => void;
  onQuickAddStudent: (name: string) => Student;
  onStartSession: (studentIds: string[], apptId: string, lessonPlanId?: string) => void;
}

type SortOrder = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

const CalendarView: React.FC<CalendarProps> = ({ students, appointments, notes, lessonPlans, onSchedule, onUpdateAppointment, onDeleteAppointment, onQuickAddStudent, onStartSession }) => {
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [lessonPlanFilter, setLessonPlanFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-asc');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  const getNearest15Mins = () => {
    const now = new Date(); let m = now.getMinutes(); let h = now.getHours(); const roundedM = Math.round(m / 15) * 15;
    if (roundedM === 60) { h = (h + 1) % 24; m = 0; } else { m = roundedM; }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({ studentIds: [] as string[], time: getNearest15Mins(), duration: 30, notes: '', lessonPlanId: '' });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const allEvents = useMemo(() => {
    const appts = appointments.map(a => ({ ...a, type: 'appointment' as const, sortDate: new Date(a.dateTime) }));
    const standalone = notes.filter(n => !appointments.some(a => a.linkedNoteIds?.includes(n.id))).map(n => ({ id: n.id, studentIds: [n.studentId], dateTime: n.createdAt, durationMinutes: 30, status: 'completed' as const, type: 'note' as const, sortDate: new Date(n.createdAt), linkedNoteIds: [n.id] }));
    return [...appts, ...standalone];
  }, [appointments, notes]);

  const filteredEvents = useMemo(() => {
    let filtered = allEvents.filter(evt => {
      const sessionStudents = students.filter(s => evt.studentIds.includes(s.id));
      const matchesSearch = sessionStudents.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
      const lpId = (evt as any).lessonPlanId;
      return matchesSearch && matchesStatus && (lessonPlanFilter === 'all' || (lessonPlanFilter === 'none' && !lpId) || lpId === lessonPlanFilter);
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'date-desc') return b.sortDate.getTime() - a.sortDate.getTime();
      if (sortOrder === 'date-asc') return a.sortDate.getTime() - b.sortDate.getTime();
      
      const sA = students.find(s => s.id === a.studentIds[0])?.name || '';
      const sB = students.find(s => s.id === b.studentIds[0])?.name || '';
      
      if (sortOrder === 'name-asc') return sA.localeCompare(sB);
      if (sortOrder === 'name-desc') return sB.localeCompare(sA);
      return 0;
    });
  }, [allEvents, students, searchQuery, statusFilter, lessonPlanFilter, sortOrder]);

  const handleOpenSchedule = (dateStr: string, existingAppt?: any) => {
    setSelectedDateStr(dateStr); setStudentSearchInModal('');
    if (existingAppt && existingAppt.type === 'appointment') {
      setEditingApptId(existingAppt.id); const [dPart, tPart] = existingAppt.dateTime.split('T');
      setFormData({ studentIds: existingAppt.studentIds, time: tPart.slice(0, 5), duration: existingAppt.durationMinutes, notes: existingAppt.notes || '', lessonPlanId: existingAppt.lessonPlanId || '' });
    } else { setEditingApptId(null); setFormData({ studentIds: [], time: getNearest15Mins(), duration: 30, notes: '', lessonPlanId: '' }); }
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (formData.studentIds.length === 0 || !selectedDateStr) return;
    const dateTime = `${selectedDateStr}T${formData.time}:00`;
    if (editingApptId) { const existing = appointments.find(a => a.id === editingApptId); if (existing) onUpdateAppointment({ ...existing, studentIds: formData.studentIds, dateTime, durationMinutes: formData.duration, notes: formData.notes, lessonPlanId: formData.lessonPlanId || undefined }); }
    else onSchedule({ studentIds: formData.studentIds, dateTime, durationMinutes: formData.duration, notes: formData.notes, lessonPlanId: formData.lessonPlanId || undefined });
    setIsScheduleModalOpen(false);
  };

  const handlePrint = () => window.print();

  const renderMonthGrid = () => {
    const y = currentDate.getFullYear(); const m = currentDate.getMonth(); const total = daysInMonth(y, m); const start = firstDayOfMonth(y, m);
    const blanks = Array.from({ length: start }, (_, i) => i); const days = Array.from({ length: total }, (_, i) => i + 1);
    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-inner printable-calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (<div key={d} className="bg-slate-50 p-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">{d}</div>))}
        {blanks.map(b => <div key={`blank-${b}`} className="bg-white/50 h-32 md:h-40"></div>)}
        {days.map(d => {
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          // Month grid always sorted by time for clarity
          const dayEvents = filteredEvents.filter(evt => evt.dateTime.split('T')[0] === dateStr);
          return (
            <div key={d} onClick={() => handleOpenSchedule(dateStr)} className={`bg-white h-32 md:h-40 p-2 border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-all group relative ${isToday ? 'ring-2 ring-indigo-500 ring-inset z-10' : ''}`}>
              <div className="flex justify-between items-center mb-1"><span className={`text-sm font-black ${isToday ? 'bg-indigo-700 text-white w-7 h-7 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>{d}</span><button className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity no-print"><i className="fas fa-plus-circle text-xs"></i></button></div>
              <div className="space-y-1 overflow-y-auto max-h-[80%] custom-scrollbar">{dayEvents.map(evt => {
                const sessionStudents = students.filter(s => evt.studentIds.includes(s.id));
                const firstStudent = sessionStudents[0];
                const time = new Date(evt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={evt.id} onClick={(e) => { e.stopPropagation(); handleOpenSchedule(dateStr, evt); }} className={`p-1.5 rounded-lg text-[9px] font-bold border truncate shadow-sm ${evt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                    <span className="opacity-60 mr-1">{time}</span> 
                    {firstStudent?.name.split(' ')[0]} {sessionStudents.length > 1 && `+${sessionStudents.length - 1}`}
                  </div>
                );
              })}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6 pb-20">
      {filteredEvents.map(evt => {
        const sessionStudents = students.filter(s => evt.studentIds.includes(s.id)); const date = new Date(evt.dateTime); const lp = lessonPlans.find(p => p.id === (evt as any).lessonPlanId);
        return (
          <div key={evt.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${evt.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}><span className="text-[8px] font-black uppercase opacity-60">{date.toLocaleString('default', { month: 'short' })}</span><span className="text-lg font-black">{date.getDate()}</span></div>
              <div>
                <h5 className="text-xl font-black text-slate-900">{sessionStudents.map(s => s.name).join(', ')}</h5>
                <p className="text-xs font-bold text-slate-500"><i className="far fa-clock text-indigo-500 mr-2"></i>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {evt.durationMinutes} mins {lp && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] ml-2">{lp.title}</span>}</p>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <button onClick={() => handleOpenSchedule(evt.dateTime.split('T')[0], evt)} className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Edit</button>
              <button onClick={() => onStartSession(evt.studentIds, evt.id, (evt as any).lessonPlanId)} className="bg-indigo-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">Start Now</button>
            </div>
          </div>
        );
      })}
      {filteredEvents.length === 0 && (
        <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <i className="fas fa-calendar-day text-5xl text-slate-200 mb-6"></i>
          <h5 className="text-xl font-black text-slate-400">No matching sessions found</h5>
          <p className="text-slate-400 font-bold mt-2">Try adjusting your filters or search query.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Session Calendar</h3><p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Unified Session Timeline</p></div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button onClick={handlePrint} className="bg-white text-slate-600 border-2 border-slate-200 px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2"><i className="fas fa-print"></i> Print Schedule</button>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200"><button onClick={() => setViewMode('month')} className={`px-6 py-2 rounded-xl text-[10px] font-black ${viewMode === 'month' ? 'bg-white text-indigo-700' : 'text-slate-500'}`}>Month</button><button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black ${viewMode === 'list' ? 'bg-white text-indigo-700' : 'text-slate-500'}`}>List</button></div>
          <button onClick={() => handleOpenSchedule(new Date().toISOString().split('T')[0])} className="px-8 py-3 bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl"><i className="fas fa-plus"></i> New Appointment</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all" 
            placeholder="Search students..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-[2]">
          <select 
            className="px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select 
            className="px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            value={lessonPlanFilter}
            onChange={(e) => setLessonPlanFilter(e.target.value)}
          >
            <option value="all">All Plans</option>
            <option value="none">No Plan Assigned</option>
            {lessonPlans.map(lp => <option key={lp.id} value={lp.id}>{lp.title}</option>)}
          </select>
          <select 
            className="px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="date-asc">Date (Oldest first)</option>
            <option value="date-desc">Date (Newest first)</option>
            <option value="name-asc">Student Name (A-Z)</option>
            <option value="name-desc">Student Name (Z-A)</option>
          </select>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-colors">
            Today
          </button>
        </div>
      </div>

      {viewMode === 'month' ? renderMonthGrid() : renderListView()}
      
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
             <div className="bg-indigo-700 p-8 text-white flex items-center justify-between shrink-0">
               <div>
                 <h4 className="text-xl font-black">{editingApptId ? 'Session Details' : 'Schedule Session'}</h4>
                 <p className="text-[10px] font-black uppercase text-indigo-100">{selectedDateStr}</p>
               </div>
               <button onClick={() => setIsScheduleModalOpen(false)}><i className="fas fa-times text-xl"></i></button>
             </div>
             <form onSubmit={handleScheduleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invitees</label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{formData.studentIds.length} Selected</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border-2 border-slate-100 rounded-2xl p-2 space-y-1 bg-slate-50">
                    {students.filter(s => s.isActive).map(s => (
                      <div key={s.id} onClick={() => setFormData(p => ({ ...p, studentIds: p.studentIds.includes(s.id) ? p.studentIds.filter(id => id !== s.id) : [...p.studentIds, s.id] }))} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${formData.studentIds.includes(s.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent'}`}>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${formData.studentIds.includes(s.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                          {formData.studentIds.includes(s.id) && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                        <span className="text-sm font-bold">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Time</label>
                    <input type="time" className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none shadow-sm focus:border-indigo-500" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Duration</label>
                    <select className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none shadow-sm cursor-pointer focus:border-indigo-500" value={formData.duration} onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}>
                      {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} mins</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lesson Plan</label>
                  <select 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold outline-none shadow-sm cursor-pointer focus:border-indigo-500 appearance-none bg-slate-50"
                    value={formData.lessonPlanId}
                    onChange={(e) => setFormData({...formData, lessonPlanId: e.target.value})}
                  >
                    <option value="">No Plan Selected</option>
                    {lessonPlans.map(lp => <option key={lp.id} value={lp.id}>{lp.title}</option>)}
                  </select>
                </div>

                <div className="pt-4 space-y-3">
                  {editingApptId && (
                    <button 
                      type="button" 
                      onClick={() => onStartSession(formData.studentIds, editingApptId, formData.lessonPlanId || undefined)}
                      className="w-full py-5 bg-indigo-700 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-800 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                    >
                      <i className="fas fa-play"></i> Start Session Now
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={formData.studentIds.length === 0} 
                    className={`w-full py-4 font-black rounded-2xl transition-all shadow-lg text-xs uppercase tracking-widest ${editingApptId ? 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}
                  >
                    {editingApptId ? 'Update Session Details' : 'Confirm Schedule'}
                  </button>
                  {editingApptId && (
                    <button 
                      type="button"
                      onClick={() => { onDeleteAppointment(editingApptId); setIsScheduleModalOpen(false); }}
                      className="w-full py-3 text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      Remove Session from Calendar
                    </button>
                  )}
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
