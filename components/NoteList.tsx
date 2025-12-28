
import React, { useState, useMemo } from 'react';
import { SOAPNote, Student, LessonPlan } from '../types';

interface NoteListProps {
  notes: SOAPNote[];
  students: Student[];
  lessonPlans: LessonPlan[];
  onEditNote: (studentId: string, noteId: string) => void;
  onStartNewSession: (studentIds: string[]) => void;
  onUpdateNote: (note: SOAPNote) => void;
}

const NoteList: React.FC<NoteListProps> = ({ notes, students, lessonPlans, onEditNote, onStartNewSession, onUpdateNote }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNote, setViewingNote] = useState<SOAPNote | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedForSession, setSelectedForSession] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const student = students.find(s => s.id === note.studentId);
      return student?.name.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, students, searchQuery]);

  const handleOpenNote = (note: SOAPNote) => setViewingNote({ ...note });
  const handleSaveNoteInline = () => { if (viewingNote) { onUpdateNote(viewingNote); setViewingNote(null); } };
  const toggleStudentInPicker = (id: string) => setSelectedForSession(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  const handlePrintNote = () => window.print();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Session Records</h3><p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Historical SOAP Notes & Logs</p></div>
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80"><i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-sm" placeholder="Filter by student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          <button onClick={() => setIsPickerOpen(true)} className="px-8 py-3 bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2"><i className="fas fa-plus"></i> Start Session</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 no-print">
        {filteredNotes.map(note => {
          const s = students.find(stu => stu.id === note.studentId); const c = new Date(note.createdAt); const acc = note.metrics?.accuracy ?? 0;
          return (
            <div key={note.id} onClick={() => handleOpenNote(note)} className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-indigo-500 transition-all shadow-sm cursor-pointer active:scale-[0.99]">
              <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0"><span className="text-[8px] font-black uppercase opacity-60">{c.toLocaleString('default', { month: 'short' })}</span><span className="text-lg font-black">{c.getDate()}</span></div><div><h5 className="text-xl font-black text-slate-900 flex items-center gap-3">{s?.name || 'Unknown Student'}<span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${acc >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{acc}% Accuracy</span></h5><p className="text-[10px] font-bold text-slate-500">Filed @ {c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Goal: {note.metrics?.focusGoalId?.slice(0, 30)}...</p></div></div>
              <button className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">View Record</button>
            </div>
          );
        })}
      </div>

      {viewingNote && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col printable-modal">
            <div className="bg-indigo-700 p-8 text-white flex justify-between items-center shrink-0">
              <div><h3 className="text-2xl font-black">{students.find(s => s.id === viewingNote.studentId)?.name}'s Session Report</h3><p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mt-1">Finalized SOAP Note • {new Date(viewingNote.createdAt).toLocaleDateString()}</p></div>
              <div className="flex gap-4 no-print"><button onClick={handlePrintNote} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><i className="fas fa-print"></i></button><button onClick={() => setViewingNote(null)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fas fa-times text-xl"></i></button></div>
            </div>
            <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              {(() => {
                const s = students.find(stu => stu.id === viewingNote.studentId); const lp = lessonPlans.find(p => p.id === viewingNote.lessonPlanId);
                return (
                  <>
                    <section className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between"><div className="flex-1"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</h5><p className="text-xl font-black text-slate-900">{s?.name}</p><p className="text-xs font-bold text-slate-500">Grade {s?.grade} • {s?.diagnoses.join(', ')}</p></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Performance</p><p className="text-3xl font-black text-indigo-700">{viewingNote.metrics?.accuracy}%</p></div></section>
                    {lp && (
                      <section className="p-6 border-2 border-indigo-100 rounded-3xl"><h5 className="text-[10px] font-black text-indigo-600 uppercase mb-4">Lesson Plan: {lp.title}</h5><div className="grid grid-cols-2 gap-8 text-[11px] font-medium leading-relaxed"><div><p className="font-black text-slate-400 mb-2 uppercase text-[9px]">Materials</p><ul className="list-disc pl-4">{lp.materials.map((m, i) => <li key={i}>{m}</li>)}</ul></div><div><p className="font-black text-slate-400 mb-2 uppercase text-[9px]">Procedure</p><ol className="list-decimal pl-4">{lp.procedure.map((p, i) => <li key={i}>{p}</li>)}</ol></div></div></section>
                    )}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Professional SOAP Record</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div><label className="text-[9px] font-black uppercase text-indigo-600 mb-2 block">Subjective (S)</label><div className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl">{viewingNote.subjective}</div></div>
                          <div><label className="text-[9px] font-black uppercase text-indigo-600 mb-2 block">Objective (O)</label><div className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl">{viewingNote.objective}</div></div>
                        </div>
                        <div className="space-y-4">
                          <div><label className="text-[9px] font-black uppercase text-indigo-600 mb-2 block">Assessment (A)</label><div className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl">{viewingNote.assessment}</div></div>
                          <div><label className="text-[9px] font-black uppercase text-indigo-600 mb-2 block">Plan (P)</label><div className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl">{viewingNote.plan}</div></div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="p-8 bg-slate-50 border-t flex flex-wrap gap-4 no-print"><button onClick={handleSaveNoteInline} className="flex-1 px-8 py-4 bg-indigo-700 text-white font-black rounded-2xl shadow-xl">Save Changes</button><button onClick={() => setViewingNote(null)} className="flex-1 px-8 py-4 bg-white border-2 border-slate-200 text-slate-500 font-black rounded-2xl">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteList;
