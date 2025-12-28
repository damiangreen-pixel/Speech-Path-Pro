
import React, { useState } from 'react';
import { View as ViewType, Student, SOAPNote } from '../types';

interface HomeProps {
  onNavigate: (view: ViewType, openForm?: boolean) => void;
  students: Student[];
  notes: SOAPNote[];
  availableGoalsCount: number;
  onSeedSample: () => void;
}

const Tooltip: React.FC<{ title: string; body: string; children: React.ReactNode }> = ({ title, body, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 border border-slate-700">
      <p className="font-black uppercase tracking-widest text-[10px] text-indigo-400 mb-1">{title}</p>
      <p className="font-medium leading-relaxed opacity-90">{body}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

const Home: React.FC<HomeProps> = ({ onNavigate, students, notes, availableGoalsCount, onSeedSample }) => {
  const [activeDrillDown, setActiveDrillDown] = useState<'hours' | 'compliance' | 'modalities' | 'records' | null>(null);

  const hoursSaved = (notes.length * 0.25).toFixed(1);
  const compliantStudents = students.filter(s => s.goals.some(g => g.isPrimary));
  const iepCompliance = students.length > 0 
    ? Math.round((compliantStudents.length / students.length) * 100) 
    : 0;
  
  const uniqueGoals = Array.from(new Set(students.flatMap(s => s.goals.map(g => g.text))));
  const activityTypes = uniqueGoals.length;

  const renderDrillDown = () => {
    if (!activeDrillDown) return null;

    let title = "";
    let content = null;

    switch (activeDrillDown) {
      case 'hours':
        title = "Documentation Efficiency Audit";
        content = (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Breakdown of administrative time reclaimed through automated drafting (est. 15m per record).</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {notes.map(n => {
                const s = students.find(stu => stu.id === n.studentId);
                return (
                  <div key={n.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-900">{s?.name || 'Unknown Student'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{n.date}</p>
                    </div>
                    <span className="text-indigo-600 font-black text-xs">+15m</span>
                  </div>
                );
              })}
              {notes.length === 0 && <p className="text-center py-8 text-slate-400 italic">No documentation records found.</p>}
            </div>
          </div>
        );
        break;
      case 'compliance':
        title = "Caseload Compliance Roster";
        content = (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Active student profiles checked for Primary IEP Objectives.</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {students.map(s => {
                const hasPrimary = s.goals.some(g => g.isPrimary);
                return (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Grade {s.grade}</p>
                    </div>
                    {hasPrimary ? (
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Compliant</span>
                    ) : (
                      <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Pending Goal</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
        break;
      case 'modalities':
        title = "Skill Mastery Breakdown";
        content = (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Catalog of unique objectives currently being targeted across the caseload.</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {uniqueGoals.map((g, i) => (
                <div key={i} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-900 leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      case 'records':
        onNavigate('notes');
        return null;
    }

    return (
      <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-indigo-700 p-8 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mt-1">Data Insights Dashboard</p>
            </div>
            <button onClick={() => setActiveDrillDown(null)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
          </div>
          <div className="p-8">
            {content}
            <button 
              onClick={() => setActiveDrillDown(null)}
              className="w-full mt-6 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest"
            >
              Close Insights
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 md:py-12 px-4">
      <div className="text-center mb-12 md:mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-900 px-3 py-1.5 rounded-full font-black text-[10px] md:text-sm uppercase tracking-widest mb-6 border border-indigo-200 shadow-sm">
          <i className="fas fa-sparkles text-indigo-600"></i>
          Next-Gen SLP Workflow
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 mb-6 md:mb-8 leading-tight tracking-tight">
          Educational Excellence,<br />
          <span className="text-indigo-700">Streamlined.</span>
        </h1>
        <p className="text-sm md:text-xl text-slate-600 font-medium mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-2">
          The professional toolkit for school speech pathologists. Manage complex caseloads, track targeted goals, and leverage Gemini AI for instant plans.
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto px-4 sm:px-0">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-6 py-4 md:px-10 md:py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-2xl transition-all active:scale-95 text-base md:text-lg flex items-center justify-center gap-3"
            >
              <i className="fas fa-chart-pie"></i>
              Launch Dashboard
            </button>
            <button 
              onClick={() => onNavigate('calendar')}
              className="w-full sm:w-auto px-6 py-4 md:px-10 md:py-5 bg-indigo-700 text-white font-black rounded-2xl hover:bg-indigo-800 transition-all text-base md:text-lg flex items-center justify-center gap-3 shadow-xl"
            >
              <i className="fas fa-calendar-day"></i>
              Session Calendar
            </button>
          </div>

          {students.length < 3 && (
            <div className="animate-in fade-in zoom-in delay-500 duration-700 w-full sm:w-auto mt-4 px-4 sm:px-0">
              <button 
                onClick={onSeedSample}
                className="w-full sm:w-auto px-6 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-4 border-amber-200"
              >
                <i className="fas fa-vial"></i>
                Load Sample Data
              </button>
              <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest mt-3 text-center">Load test student for demo</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
        <Tooltip title="Documentation Efficiency" body="Estimated time saved based on a standard 15-minute administrative tax per SOAP note drafting session.">
          <div onClick={() => setActiveDrillDown('hours')} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all group">
            <p className="text-4xl font-black text-indigo-700 mb-1 group-hover:scale-110 transition-transform">{hoursSaved}h</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documentation Saved</p>
          </div>
        </Tooltip>

        <Tooltip title="Caseload Compliance" body="Percentage of active students with a designated primary IEP goal. Determined by total roster audit.">
          <div onClick={() => setActiveDrillDown('compliance')} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-emerald-500 hover:shadow-xl transition-all group">
            <p className="text-4xl font-black text-emerald-600 mb-1 group-hover:scale-110 transition-transform">{iepCompliance}%</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Goal Compliance</p>
          </div>
        </Tooltip>

        <Tooltip title="Diagnostic Variety" body="Number of unique targets currently active across your caseload. Reflects treatment diversity.">
          <div onClick={() => setActiveDrillDown('modalities')} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-slate-900 hover:shadow-xl transition-all group">
            <p className="text-4xl font-black text-slate-900 mb-1 group-hover:scale-110 transition-transform">{activityTypes}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Modalities</p>
          </div>
        </Tooltip>

        <Tooltip title="Session Integrity" body="Count of finalized SOAP notes stored in your secure local vault. Reflects total historical session data.">
          <div onClick={() => setActiveDrillDown('records')} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-indigo-900 hover:shadow-xl transition-all group">
            <p className="text-4xl font-black text-indigo-900 mb-1 group-hover:scale-110 transition-transform">{notes.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session Records</p>
          </div>
        </Tooltip>
      </div>
      {renderDrillDown()}
    </div>
  );
};

export default Home;
