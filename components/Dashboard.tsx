
import React from 'react';
import { Student, SOAPNote, View, SessionAppointment } from '../types';

interface DashboardProps {
  students: Student[];
  notes: SOAPNote[];
  appointments: SessionAppointment[];
  onNavigate: (view: View) => void;
  onSelectStudent: (id: string) => void;
  onSelectNote: (studentId: string, noteId: string) => void;
  onExport: () => void;
  onExportSheets: () => void;
  onImport: (file: File) => void;
  onSeedSample: () => void;
}

const Tooltip: React.FC<{ title: string; body: string; children: React.ReactNode; position?: 'top' | 'bottom' }> = ({ title, body, children, position = 'top' }) => (
  <div className="group relative inline-block">
    {children}
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} left-1/2 -translate-x-1/2 w-64 p-4 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-[100] border border-slate-700 leading-relaxed`}>
      <p className="font-black uppercase tracking-widest text-indigo-400 mb-1">{title}</p>
      <p className="font-medium text-slate-200">{body}</p>
      <div className={`absolute ${position === 'top' ? 'top-full border-t-slate-900' : 'bottom-full border-b-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></div>
    </div>
  </div>
);

const AvatarBadge: React.FC<{ student: Student }> = ({ student }) => {
  if (student.customAvatarUrl) {
    return <img src={student.customAvatarUrl} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-white/10" />;
  }
  const config = student.avatarConfig || { bgColor: 'bg-indigo-500', shape: 'rounded', icon: 'fa-user' };
  return (
    <div className={`w-10 h-10 md:w-12 md:h-12 ${config.bgColor} rounded-xl flex items-center justify-center text-white border border-white/10`}>
      <i className={`fas ${config.icon} text-sm`}></i>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ students, notes, appointments, onNavigate, onSelectStudent, onSelectNote, onExport, onExportSheets, onImport, onSeedSample }) => {
  const activeStudents = students.filter(s => s.isActive !== false);
  
  const upcomingAppts = appointments
    .filter(a => new Date(a.dateTime) >= new Date() && a.status === 'scheduled')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const averageAccuracy = notes.length > 0 
    ? Math.round(notes.reduce((acc, n) => acc + (n.metrics?.accuracy || 0), 0) / notes.length)
    : 0;

  const getHeatmapColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-emerald-500 hover:bg-emerald-400';
    if (accuracy >= 50) return 'bg-amber-400 hover:bg-amber-300';
    return 'bg-rose-400 hover:bg-rose-300';
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-20">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
         <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Professional Dashboard</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mt-2">Caseload Management & Analytics</p>
         </div>
         <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto">
            <button onClick={() => onNavigate('calendar')} className="w-full sm:w-auto px-6 py-3 md:py-4 bg-white text-indigo-700 border-2 border-indigo-700 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2">
              <i className="fas fa-calendar-alt"></i> View Schedule
            </button>
            <button onClick={() => onNavigate('planner')} className="w-full sm:w-auto px-6 py-3 md:py-4 bg-indigo-700 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-800 transition-all shadow-xl flex items-center justify-center gap-2">
              <i className="fas fa-calendar-check"></i> Session Prep
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* CASELOAD ANALYTICS & PRIORITY MATRIX */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Risk / Priority Matrix */}
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                <span>Risk / Priority Matrix</span>
                <Tooltip title="Prioritization guide" body="This matrix helps prioritize your caseload by mapping students based on their clinical severity and the resulting impact on their educational performance.">
                  <i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i>
                </Tooltip>
              </h4>
              <div className="relative aspect-square bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden">
                {/* Quadrant Labels */}
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-rose-50/30 flex items-start p-2"><span className="text-[7px] font-black text-rose-300 uppercase">Immediate focus</span></div>
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-50/30 flex items-start justify-end p-2"><span className="text-[7px] font-black text-amber-300 uppercase">Monitor closely</span></div>
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-indigo-50/30 flex items-end p-2"><span className="text-[7px] font-black text-indigo-300 uppercase">Support plan</span></div>
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-emerald-50/30 flex items-end justify-end p-2"><span className="text-[7px] font-black text-emerald-300 uppercase">Maintain</span></div>
                
                {/* Grid Lines */}
                <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-slate-200"></div></div>
                <div className="absolute inset-0 flex justify-center"><div className="w-px h-full bg-slate-200"></div></div>
                
                {/* Student Points */}
                {activeStudents.map(s => (
                  <div 
                    key={s.id}
                    className="absolute group w-4 h-4 -ml-2 -mb-2 rounded-full border-2 border-white shadow-lg cursor-pointer transition-all z-10 hover:z-20 hover:scale-125 bg-indigo-600"
                    style={{ 
                      left: `${(s.severity || 5) * 10}%`, 
                      bottom: `${(s.functionalImpact || 5) * 10}%`,
                    }}
                    onClick={() => onSelectStudent(s.id)}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[9px] font-bold py-1.5 px-2.5 rounded shadow-2xl pointer-events-none whitespace-nowrap transition-opacity">
                      {s.name}
                    </div>
                  </div>
                ))}
                
                {/* Axis Labels */}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-slate-400 mb-1">Severity →</span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black uppercase text-slate-400 ml-[-15px]">Impact →</span>
              </div>
            </div>

            {/* Heatmap Overview */}
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                <span>Program progress heatmap</span>
                <Tooltip title="Interactive Trend Audit" body="Click a student's name to view their complete profile. Click a colored block to open the specific SOAP note for that session.">
                  <i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i>
                </Tooltip>
              </h4>
              <div className="space-y-3">
                {activeStudents.slice(0, 8).map(s => {
                  const sNotes = notes.filter(n => n.studentId === s.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div key={s.id} className="flex items-center gap-4">
                      <span 
                        className="text-[9px] font-black text-slate-600 w-20 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => onSelectStudent(s.id)}
                        title={`View ${s.name}'s record`}
                      >
                        {s.name}
                      </span>
                      <div className="flex-1 flex gap-1 h-3">
                        {[...Array(5)].map((_, i) => {
                          const note = sNotes[4 - i]; 
                          return (
                            <div 
                              key={i} 
                              className={`flex-1 rounded-sm transition-all duration-200 ${note ? getHeatmapColor(note.metrics?.accuracy || 0) + ' cursor-pointer scale-100 hover:scale-110 active:scale-95' : 'bg-slate-100'}`}
                              onClick={() => note && onSelectNote(s.id, note.id)}
                              title={note ? `${note.date}: ${note.metrics?.accuracy}% accuracy. Click to open note.` : 'No session data'}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                <span>Older sessions</span>
                <span>Latest session</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm p-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Recent Session Activity</h4>
            <div className="space-y-4">
               {notes.slice(0, 3).map(note => {
                 const student = students.find(s => s.id === note.studentId);
                 const filedAt = new Date(note.createdAt);
                 return (
                   <div key={note.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-indigo-700">
                            {student?.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900">{student?.name}</p>
                            <p className="text-[10px] font-bold text-slate-500">
                               Filed on {filedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {filedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                      <button onClick={() => onSelectNote(note.studentId, note.id)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><i className="fas fa-arrow-right"></i></button>
                   </div>
                 );
               })}
               {notes.length === 0 && <p className="text-center py-10 text-slate-400 italic">No activity recorded yet.</p>}
            </div>
          </div>
        </div>

        {/* UPCOMING QUEUE & METRICS */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border-b-8 border-indigo-500">
            <div className="p-6 md:p-8 bg-white/5 flex justify-between items-center border-b border-white/5">
              <h4 className="font-black text-white text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-clock text-indigo-400"></i> Upcoming Sessions
              </h4>
            </div>
            <div className="p-4 md:p-6 space-y-3">
              {upcomingAppts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 italic text-sm font-bold">No sessions scheduled today.</div>
              ) : (
                upcomingAppts.slice(0, 4).map((appt) => {
                  const sessionStudents = students.filter(s => appt.studentIds.includes(s.id));
                  const date = new Date(appt.dateTime);
                  return (
                    <div key={appt.id} className="p-5 bg-white/5 border border-white/5 rounded-[1.5rem] hover:bg-white/10 transition-all cursor-pointer group flex items-center justify-between" onClick={() => onNavigate('calendar')}>
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                          {sessionStudents.slice(0, 2).map(s => <AvatarBadge key={s.id} student={s} />)}
                          {sessionStudents.length > 2 && (
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-bold text-white border border-white/10">+{sessionStudents.length - 2}</div>
                          )}
                        </div>
                        <div>
                           <p className="font-black text-white text-xs md:text-sm truncate max-w-[150px]">
                             {sessionStudents.map(s => s.name.split(' ')[0]).join(', ')}
                           </p>
                           <p className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase">
                             {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                           </p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-slate-700 group-hover:text-white transition-all text-xs"></i>
                    </div>
                  );
                })
              )}
              {upcomingAppts.length > 0 && (
                <button onClick={() => onNavigate('calendar')} className="w-full py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">See Full Schedule</button>
              )}
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Insights</h4>
                <Tooltip title="Accuracy trends" body="This shows the average accuracy percentage across all recorded session notes to help you track overall caseload progress." position="top">
                  <i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i>
                </Tooltip>
             </div>
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between items-end mb-2">
                      <p className="text-sm font-black text-slate-700">Caseload Avg. Accuracy</p>
                      <p className="text-xl font-black text-indigo-700">{averageAccuracy}%</p>
                   </div>
                   <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${averageAccuracy}%` }}></div>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xl font-black text-slate-900">{notes.length}</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 mt-1">Total Notes</p>
                   </div>
                   <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <p className="text-xl font-black text-slate-900">{appointments.filter(a => a.status === 'completed').length}</p>
                      <p className="text-[8px] font-black uppercase text-slate-400 mt-1">Sessions Fin.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
