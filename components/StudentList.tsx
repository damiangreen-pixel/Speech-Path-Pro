
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, View, Goal, SOAPNote, AvatarConfig, SessionAppointment, LessonPlan, CuingLevel, TaskSetting } from '../types';

interface StudentListProps {
  students: Student[];
  notes: SOAPNote[];
  appointments: SessionAppointment[];
  lessonPlans: LessonPlan[];
  userName: string;
  initialOpenForm?: boolean;
  initialViewingStudentId?: string;
  initialTab?: 'profile' | 'timeline' | 'decision-support';
  availableDiagnoses: string[];
  availableGoals: string[];
  onAddStudent: (student: Partial<Student>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onArchiveStudent: (id: string) => void;
  onRestoreStudent: (id: string) => void;
  onAddDiagnosisToBank: (diag: string) => void;
  onAddGoalToBank: (goal: string) => void;
  onSelectStudent: (id: string, view?: View) => void;
  onSelectMultipleStudents: (ids: string[]) => void;
  onEditNote: (studentId: string, noteId: string) => void;
  onCloseForm: () => void;
  onSeedSample: () => void;
}

const Tooltip: React.FC<{ title: string; body: string; children: React.ReactNode }> = ({ title, body, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-60 p-4 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-[200] border border-slate-700 leading-relaxed translate-y-2 group-hover:translate-y-0">
      <p className="font-black uppercase tracking-widest text-indigo-400 mb-1">{title}</p>
      <p className="font-medium text-slate-200">{body}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

const StudentAvatar: React.FC<{ student: Student; className?: string }> = ({ student, className = "w-20 h-20" }) => {
  const shapeStyles = { circle: 'rounded-full', rounded: 'rounded-2xl', squircle: 'rounded-[35%]', hexagon: 'rounded-xl rotate-45' };
  if (student.customAvatarUrl) return <div className={`${className} overflow-hidden ${shapeStyles[student.avatarConfig?.shape || 'rounded']} border-4 border-white shadow-xl`}><img src={student.customAvatarUrl} alt={student.name} className={`w-full h-full object-cover ${student.avatarConfig?.shape === 'hexagon' ? '-rotate-45' : ''}`} /></div>;
  const config = student.avatarConfig || { bgColor: 'bg-indigo-500', shape: 'rounded', icon: 'fa-user' };
  return <div className={`${className} ${config.bgColor} ${shapeStyles[config.shape]} flex items-center justify-center text-white border-4 border-white shadow-xl transition-all relative overflow-hidden group`}><i className={`fas ${config.icon} ${config.shape === 'hexagon' ? '-rotate-45' : ''} text-2xl group-hover:scale-125 transition-transform`}></i><span className="absolute inset-0 bg-black/5"></span></div>;
};

const DecisionCharts: React.FC<{ student: Student; notes: SOAPNote[] }> = ({ student, notes }) => {
  const studentNotes = useMemo(() => notes.filter(n => n.studentId === student.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [student, notes]);
  if (studentNotes.length === 0) return <div className="py-12 text-center text-slate-400 italic font-bold">No progress data available yet.</div>;
  const linePoints = studentNotes.map((n, i) => `${(i / (studentNotes.length - 1 || 1)) * 100},${100 - (n.metrics?.accuracy || 0)}`).join(' ');
  const structuredAcc = studentNotes.filter(n => n.metrics?.setting === 'Structured').reduce((acc, n) => acc + (n.metrics?.accuracy || 0), 0) / (studentNotes.filter(n => n.metrics?.setting === 'Structured').length || 1);
  const sponAcc = studentNotes.filter(n => n.metrics?.setting === 'Spontaneous').reduce((acc, n) => acc + (n.metrics?.accuracy || 0), 0) / (studentNotes.filter(n => n.metrics?.setting === 'Spontaneous').length || 1);
  const cues: CuingLevel[] = ['Independent', 'Minimal', 'Moderate', 'Maximal'];
  const cueCounts = cues.map(c => studentNotes.filter(n => n.metrics?.cuingLevel === c).length);
  const totalCueCount = studentNotes.length || 1;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm relative z-30">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between"><span>Progress over time (%)</span><Tooltip title="Trend analysis" body="This chart tracks accuracy percentages across sessions to help identify progress, plateaus, or regressions early on."><i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i></Tooltip></h5>
          <div className="relative h-40 w-full px-2"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible"><line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" /><line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" /><line x1="0" y1="80" x2="100" y2="80" stroke="#e2e8f0" strokeWidth="0.5" /><polyline fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />{studentNotes.map((n, i) => (<circle key={i} cx={(i / (studentNotes.length - 1 || 1)) * 100} cy={100 - (n.metrics?.accuracy || 0)} r="2" fill="#4f46e5" className="hover:r-3 transition-all cursor-crosshair"><title>{n.date}: {n.metrics?.accuracy}% accuracy</title></circle>))}</svg><div className="flex justify-between mt-2 text-[7px] font-black text-slate-400 uppercase"><span>First recorded session</span><span>Most recent session</span></div></div>
        </div>
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm relative z-30">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between"><span>Skill generalization comparison</span><Tooltip title="Contextual audit" body="This compares performance in structured drill tasks versus spontaneous conversation to determine if the student can apply skills in natural settings."><i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i></Tooltip></h5>
          <div className="flex items-end justify-center gap-12 h-40">
            <div className="flex flex-col items-center gap-2 flex-1"><div className="w-full bg-indigo-100 rounded-t-xl overflow-hidden relative group" style={{ height: `${structuredAcc}%` }}><div className="absolute inset-0 bg-indigo-500 opacity-80 transition-opacity group-hover:opacity-100"></div><span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white">{Math.round(structuredAcc)}%</span></div><span className="text-[8px] font-black text-slate-500 uppercase text-center">Structured tasks</span></div>
            <div className="flex flex-col items-center gap-2 flex-1"><div className="w-full bg-emerald-100 rounded-t-xl overflow-hidden relative group" style={{ height: `${sponAcc}%` }}><div className="absolute inset-0 bg-emerald-500 opacity-80 transition-opacity group-hover:opacity-100"></div><span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white">{Math.round(sponAcc)}%</span></div><span className="text-[8px] font-black text-slate-500 uppercase text-center">Spontaneous speech</span></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm md:col-span-1 relative z-20">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between"><span>Level of support frequency</span><Tooltip title="Independence tracking" body="This breakdown shows how often different levels of support are required. Decreasing support levels over time indicate a path toward mastery."><i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i></Tooltip></h5>
          <div className="space-y-4">{cues.map((c, i) => { const perc = Math.round((cueCounts[i] / totalCueCount) * 100); const colors = ['bg-emerald-500', 'bg-indigo-400', 'bg-amber-400', 'bg-rose-400']; return (<div key={c}><div className="flex justify-between items-center mb-1"><span className="text-[8px] font-black text-slate-600 uppercase">{c}</span><span className="text-[8px] font-black text-slate-400">{perc}%</span></div><div className="h-1.5 w-full bg-white rounded-full overflow-hidden"><div className={`h-full ${colors[i]} transition-all duration-1000`} style={{ width: `${perc}%` }}></div></div></div>); })}</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm md:col-span-1 flex flex-col relative z-20">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between"><span>Goal mastery forecast</span><Tooltip title="Outcome projection" body="This estimates the remaining number of sessions needed to reach consistent mastery based on the student's current learning rate."><i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i></Tooltip></h5>
          <div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-20 h-20 rounded-full border-4 border-indigo-100 flex flex-col items-center justify-center mb-4 relative shadow-sm"><i className="fas fa-calendar-check text-indigo-600 absolute -top-2 -right-2 bg-white p-1 rounded-full border border-indigo-100 text-xs"></i><span className="text-xl font-black text-slate-900">~{Math.max(1, 10 - Math.round(structuredAcc/10))}</span><span className="text-[7px] font-black text-slate-400 uppercase">Sessions</span></div><p className="text-[9px] font-bold text-slate-500 leading-relaxed px-4">Based on historical growth, mastery is expected within this school term.</p></div>
        </div>
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm md:col-span-1 relative z-20">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between"><span>Task efficacy (ROI)</span><Tooltip title="Learning efficiency" body="This chart maps time spent on specific tasks against the resulting accuracy gains to identify the most effective activities for this student."><i className="fas fa-info-circle text-slate-300 hover:text-indigo-500 transition-colors cursor-help"></i></Tooltip></h5>
          <div className="relative h-32 w-full bg-white/50 border border-slate-100 rounded-xl overflow-hidden p-2"><div className="absolute top-4 left-8 w-4 h-4 bg-indigo-500 rounded-full opacity-60 flex items-center justify-center text-[5px] text-white font-black shadow-sm" title="Drill: High gain for low time">Drill</div><div className="absolute bottom-8 right-12 w-6 h-6 bg-emerald-500 rounded-full opacity-60 flex items-center justify-center text-[5px] text-white font-black shadow-sm" title="Game: High engagement / High gain">Game</div><div className="absolute bottom-16 left-20 w-5 h-5 bg-amber-500 rounded-full opacity-60 flex items-center justify-center text-[5px] text-white font-black shadow-sm" title="Story: Medium efficiency">Story</div><div className="absolute bottom-0 left-0 text-[6px] font-black text-slate-400 uppercase ml-1 mb-1">Time spent →</div><div className="absolute left-0 top-0 text-[6px] font-black text-slate-400 uppercase rotate-90 ml-[-12px] mt-4">Growth →</div></div><p className="text-[7px] font-black text-slate-400 uppercase mt-4 text-center">Comparing time versus skill gain</p>
        </div>
      </div>
    </div>
  );
};

const StudentList: React.FC<StudentListProps> = ({ 
  students, 
  notes, 
  appointments, 
  lessonPlans, 
  userName, 
  initialOpenForm, 
  initialViewingStudentId,
  initialTab = 'profile',
  availableDiagnoses, 
  availableGoals, 
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent, 
  onArchiveStudent, 
  onRestoreStudent, 
  onAddDiagnosisToBank, 
  onAddGoalToBank, 
  onSelectStudent, 
  onSelectMultipleStudents, 
  onEditNote, 
  onCloseForm, 
  onSeedSample 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(!!initialOpenForm);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'archived'>('active');
  const [historyTab, setHistoryTab] = useState<'profile' | 'timeline' | 'decision-support'>(initialTab);
  const [nameFilter, setNameFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [issueFilter, setIssueFilter] = useState('all');
  const [diagSearch, setDiagSearch] = useState('');
  const [showDiagDropdown, setShowDiagDropdown] = useState(false);
  const [goalSearch, setGoalSearch] = useState('');
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [formData, setFormData] = useState({ name: '', grade: '', diagnoses: [] as string[], goals: [] as Goal[], severity: 5, functionalImpact: 5, customAvatarUrl: '', avatarConfig: undefined as AvatarConfig | undefined });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagDropdownRef = useRef<HTMLDivElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (initialOpenForm) { 
      setIsFormOpen(true); 
      setEditingStudent(null); 
      setFormData({ name: '', grade: '', diagnoses: [], goals: [{ text: '', isPrimary: true }], severity: 5, functionalImpact: 5, customAvatarUrl: '', avatarConfig: undefined }); 
    } 
  }, [initialOpenForm]);

  useEffect(() => {
    if (initialViewingStudentId) {
      const student = students.find(s => s.id === initialViewingStudentId);
      if (student) {
        setViewingStudent(student);
        setHistoryTab(initialTab);
        if (student.isActive === false) setRosterTab('archived');
        else setRosterTab('active');
      }
    }
  }, [initialViewingStudentId, students, initialTab]);

  useEffect(() => { const handleClickOutside = (e: MouseEvent) => { if (diagDropdownRef.current && !diagDropdownRef.current.contains(e.target as Node)) setShowDiagDropdown(false); if (goalDropdownRef.current && !goalDropdownRef.current.contains(e.target as Node)) setShowGoalDropdown(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

  const closeAll = () => { setViewingStudent(null); setEditingStudent(null); setIsFormOpen(false); onCloseForm(); setDiagSearch(''); setGoalSearch(''); setHistoryTab('profile'); };
  const handleEditMode = (s: Student) => { setEditingStudent(s); setViewingStudent(null); setFormData({ name: s.name, grade: s.grade, diagnoses: s.diagnoses, goals: s.goals.length > 0 ? s.goals : [{ text: '', isPrimary: true }], severity: s.severity || 5, functionalImpact: s.functionalImpact || 5, customAvatarUrl: s.customAvatarUrl || '', avatarConfig: s.avatarConfig }); setIsFormOpen(true); };
  const toggleDiagnosis = (d: string) => { setFormData(prev => ({ ...prev, diagnoses: prev.diagnoses.includes(d) ? prev.diagnoses.filter(item => item !== d) : [...prev.diagnoses, d] })); setDiagSearch(''); setShowDiagDropdown(false); };
  const updateGoal = (idx: number, text: string) => { const newGoals = [...formData.goals]; newGoals[idx] = { ...newGoals[idx], text }; setFormData({ ...formData, goals: newGoals }); };
  const setPrimaryGoal = (idx: number) => { const newGoals = formData.goals.map((g, i) => ({ ...g, isPrimary: i === idx })); setFormData({ ...formData, goals: newGoals }); };
  const addGoalToStudent = (text: string, isFromBank: boolean = false) => { if (!text.trim()) return; if (!isFromBank) onAddGoalToBank(text); setFormData({ ...formData, goals: [...formData.goals.filter(g => g.text !== ''), { text, isPrimary: formData.goals.length === 0 }] }); setGoalSearch(''); setShowGoalDropdown(false); };
  const removeGoalRow = (idx: number) => { const newGoals = formData.goals.filter((_, i) => i !== idx); if (newGoals.length === 0) newGoals.push({ text: '', isPrimary: true }); setFormData({ ...formData, goals: newGoals }); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const cleanGoals = formData.goals.filter(g => g.text.trim() !== ''); if (editingStudent) onUpdateStudent({ ...editingStudent, ...formData, goals: cleanGoals }); else onAddStudent({ ...formData, goals: cleanGoals }); closeAll(); };
  
  const counts = useMemo(() => {
    const common = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
      const matchesIssue = issueFilter === 'all' || s.diagnoses.includes(issueFilter);
      return matchesSearch && matchesGrade && matchesIssue;
    });
    return {
      active: common.filter(s => s.isActive !== false).length,
      archived: common.filter(s => s.isActive === false).length,
      totalFiltered: common.length
    };
  }, [students, nameFilter, gradeFilter, issueFilter]);

  const displayedStudents = useMemo(() => students.filter(s => { const matchesRoster = rosterTab === 'active' ? (s.isActive !== false) : (s.isActive === false); return matchesRoster && s.name.toLowerCase().includes(nameFilter.toLowerCase()) && (gradeFilter === 'all' || s.grade === gradeFilter) && (issueFilter === 'all' || s.diagnoses.includes(issueFilter)); }), [students, rosterTab, nameFilter, gradeFilter, issueFilter]);
  const allIssueTypes = useMemo(() => Array.from(new Set(students.flatMap(s => s.diagnoses))).sort(), [students]);
  const filteredDiagnoses = useMemo(() => availableDiagnoses.filter(d => d.toLowerCase().includes(diagSearch.toLowerCase()) && !formData.diagnoses.includes(d)), [availableDiagnoses, diagSearch, formData.diagnoses]);
  const filteredGoalBank = useMemo(() => availableGoals.filter(g => g.toLowerCase().includes(goalSearch.toLowerCase()) && !formData.goals.some(sg => sg.text === g)), [availableGoals, goalSearch, formData.goals]);
  const getStudentMastery = (sid: string) => { const sNotes = notes.filter(n => n.studentId === sid); if (sNotes.length === 0) return 0; const last3 = sNotes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3); return Math.round(last3.reduce((acc, n) => acc + (n.metrics?.accuracy || 0), 0) / last3.length); };
  const sessionTimeline = useMemo(() => { if (!viewingStudent) return []; return [...notes.filter(n => n.studentId === viewingStudent.id).map(n => ({ ...n, timelineDate: new Date(n.date), timelineType: 'note' as const })), ...appointments.filter(a => a.studentIds.includes(viewingStudent.id)).map(a => ({ ...a, timelineDate: new Date(a.dateTime), timelineType: 'appointment' as const }))].sort((a, b) => b.timelineDate.getTime() - a.timelineDate.getTime()); }, [viewingStudent, notes, appointments]);

  const handlePrintRoster = () => window.print();

  return (
    <div className="space-y-6 md:space-y-10 pb-20 max-w-6xl mx-auto">
      {/* Print-Only Header */}
      <div className="print-only mb-10 text-center border-b-2 border-slate-900 pb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Clinical Caseload Roster</h1>
        <p className="font-bold text-slate-600 mt-2">Professional: {userName} • Date: {new Date().toLocaleDateString()}</p>
        <div className="flex justify-center gap-8 mt-4 text-xs font-black uppercase text-indigo-700">
          <span>Active Students: {counts.active}</span>
          <span>Archived Records: {counts.archived}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Student Roster</h3><p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage Classroom Profiles</p></div>
        <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
          <button onClick={handlePrintRoster} className="flex-1 md:flex-none bg-white text-slate-600 border-2 border-slate-200 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><i className="fas fa-print"></i> Print Roster</button>
          <button onClick={() => { setIsFormOpen(true); setEditingStudent(null); setFormData({ name: '', grade: '', diagnoses: [], goals: [{ text: '', isPrimary: true }], severity: 5, functionalImpact: 5, customAvatarUrl: '', avatarConfig: undefined }); }} className="flex-1 md:flex-none bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-800 transition-all shadow-xl"><i className="fas fa-user-plus"></i> Register New Student</button>
        </div>
      </div>

      {/* Roster Statistics Bar */}
      {!isFormOpen && !viewingStudent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
             <p className="text-2xl font-black text-indigo-700">{counts.active}</p>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Active Students</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
             <p className="text-2xl font-black text-amber-600">{counts.archived}</p>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Archived Records</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hidden md:block">
             <p className="text-2xl font-black text-slate-900">{counts.totalFiltered}</p>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Current Results</p>
          </div>
          <div className="bg-indigo-700 p-6 rounded-[2rem] shadow-lg hidden md:block">
             <p className="text-2xl font-black text-white">{students.length}</p>
             <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mt-1">Total Profiles</p>
          </div>
        </div>
      )}

      {!isFormOpen && !viewingStudent && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col lg:flex-row gap-6 items-center no-print">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 w-full lg:w-auto">
              <button onClick={() => setRosterTab('active')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${rosterTab === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                Active <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${rosterTab === 'active' ? 'bg-indigo-100' : 'bg-slate-200'}`}>{counts.active}</span>
              </button>
              <button onClick={() => setRosterTab('archived')} className={`flex-1 px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${rosterTab === 'archived' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>
                Archived <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${rosterTab === 'archived' ? 'bg-amber-100' : 'bg-slate-200'}`}>{counts.archived}</span>
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
            <div className="relative"><i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 transition-all" placeholder="Search name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} /></div>
            <select className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer appearance-none" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}><option value="all">All Grades</option>{['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
            <select className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer appearance-none" value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}><option value="all">All Issue Types</option>{allIssueTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col printable-modal">
             <div className="bg-slate-900 p-8 text-white flex items-center justify-between border-b-4 border-indigo-500 relative overflow-hidden shrink-0">
                <div className="flex items-center gap-6 relative z-10">
                   <StudentAvatar student={viewingStudent} className="w-20 h-20" />
                   <div>
                      <div className="flex items-center gap-3"><h4 className="text-2xl font-black">{viewingStudent.name}</h4></div>
                      <p className="text-indigo-400 font-black uppercase text-[10px] tracking-widest mt-1">Grade {viewingStudent.grade} • Student Record</p>
                   </div>
                </div>
                <div className="flex gap-4 no-print relative z-10">
                  <button onClick={() => window.print()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><i className="fas fa-print"></i></button>
                  <button onClick={closeAll} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fas fa-times text-xl"></i></button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
             </div>
             <div className="flex bg-slate-100 p-1 border-b shrink-0 no-print">
                <button onClick={() => setHistoryTab('profile')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'profile' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Summary</button>
                <button onClick={() => setHistoryTab('decision-support')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'decision-support' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Decision Support Charts</button>
                <button onClick={() => setHistoryTab('timeline')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'timeline' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Session History</button>
             </div>
             <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                {(historyTab === 'profile' || window.matchMedia('print').matches) && (
                  <div className="space-y-8">
                    <section className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between"><div className="flex-1"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">Current Mastery</h5><div className="flex items-center gap-4"><p className="text-3xl font-black text-slate-900">{getStudentMastery(viewingStudent.id)}%</p><div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${getStudentMastery(viewingStudent.id)}%` }}></div></div></div></div></section>
                    <section>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">Identified Issues</h5>
                      <div className="flex flex-wrap gap-2">{viewingStudent.diagnoses.map(d => (<span key={d} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-indigo-100 shadow-sm">{d}</span>))}</div>
                    </section>
                    <section>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">Therapeutic Goals</h5>
                      <div className="space-y-3">{viewingStudent.goals.map((g, i) => (<div key={i} className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${g.isPrimary ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${g.isPrimary ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}><i className={g.isPrimary ? "fas fa-star text-[10px]" : "fas fa-bullseye text-[10px]"}></i></div><p className="text-sm font-bold leading-relaxed">{g.text}</p></div>))}</div>
                    </section>
                  </div>
                )}
                {(historyTab === 'decision-support' || window.matchMedia('print').matches) && <DecisionCharts student={viewingStudent} notes={notes} />}
                {(historyTab === 'timeline' || window.matchMedia('print').matches) && (
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b pb-2">Complete Session Log</h5>
                    {sessionTimeline.map(item => {
                      const isNote = item.timelineType === 'note'; const n = isNote ? item as SOAPNote : null; const a = !isNote ? item as SessionAppointment : null;
                      return (
                        <div key={item.id} className="p-5 rounded-[2rem] border-2 bg-white border-slate-100">
                           <div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs ${isNote ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}><i className={`fas ${isNote ? 'fa-file-medical' : 'fa-calendar-day'}`}></i></div><div><p className="text-sm font-black text-slate-900">{item.timelineDate.toLocaleDateString()}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[8px] font-black uppercase">{isNote ? 'Note Filed' : 'Session Recorded'}</span></div></div></div></div>
                           {isNote && <div className="grid grid-cols-2 gap-3 mt-4 text-[10px] text-slate-600 font-medium leading-relaxed"><div><span className="font-black text-indigo-700">O:</span> {n?.objective}</div><div><span className="font-black text-indigo-700">A:</span> {n?.assessment}</div></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
             <div className="p-6 bg-slate-50 border-t flex flex-wrap gap-3 shrink-0 no-print">
                <button onClick={() => onSelectStudent(viewingStudent.id, 'notes')} className="flex-1 bg-indigo-700 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-800 transition-all flex items-center justify-center gap-2"><i className="fas fa-file-signature"></i> Quick Note</button>
                <button onClick={() => handleEditMode(viewingStudent)} className="flex-1 bg-white text-slate-600 border-2 border-slate-200 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><i className="fas fa-user-edit"></i> Edit Profile</button>
                {viewingStudent.isActive ? (
                  <button onClick={() => { onArchiveStudent(viewingStudent.id); closeAll(); }} className="flex-1 bg-rose-50 text-rose-600 border-2 border-rose-100 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"><i className="fas fa-archive"></i> Archive</button>
                ) : (
                  <button onClick={() => { onRestoreStudent(viewingStudent.id); closeAll(); }} className="flex-1 bg-emerald-50 text-emerald-600 border-2 border-emerald-100 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"><i className="fas fa-undo"></i> Restore</button>
                )}
             </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border-2 border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500 no-print">
          <div className="flex justify-between items-center mb-10 md:mb-16">
            <div><h4 className="text-3xl font-black text-slate-900">{editingStudent ? 'Edit Profile' : 'Student Intake'}</h4><p className="text-slate-500 font-medium mt-1">Configure baseline markers and objectives.</p></div>
            <button onClick={closeAll} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
               <div className="lg:col-span-4 space-y-8">
                  <div className="flex flex-col items-center gap-6 bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 text-center relative overflow-visible group"><StudentAvatar student={{ ...editingStudent!, ...formData } as Student} className="w-32 h-32 md:w-40 md:h-40" /><button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-indigo-700 uppercase tracking-widest hover:bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 transition-all"><i className="fas fa-camera mr-2"></i> Update Photo</button><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, customAvatarUrl: reader.result as string })); reader.readAsDataURL(file); } }} /></div>
                  <div className="space-y-6">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Legal Name</label><input required className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 bg-white text-slate-900 font-bold outline-none shadow-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full student name..." /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Grade Level</label><select required className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 bg-white text-slate-900 font-black outline-none cursor-pointer appearance-none shadow-sm" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})}><option value="">Select Grade...</option>{['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                  </div>
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Mapping</h5>
                    <div><label className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-2"><span>Severity (1-10)</span><span>{formData.severity}</span></label><input type="range" min="1" max="10" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={formData.severity} onChange={(e) => setFormData({...formData, severity: parseInt(e.target.value)})} /></div>
                    <div><label className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-2"><span>Functional Impact (1-10)</span><span>{formData.functionalImpact}</span></label><input type="range" min="1" max="10" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={formData.functionalImpact} onChange={(e) => setFormData({...formData, functionalImpact: parseInt(e.target.value)})} /></div>
                  </div>
               </div>
               <div className="lg:col-span-8 space-y-10">
                  <section className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-3 flex items-center justify-between"><span>Identified Issues</span></h5>
                    <div className="flex flex-wrap gap-2 mb-4">{formData.diagnoses.map(d => (<span key={d} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 group shadow-lg">{d}<button type="button" onClick={() => toggleDiagnosis(d)} className="text-indigo-200 hover:text-white transition-colors"><i className="fas fa-times-circle"></i></button></span>))}</div>
                    <div className="relative" ref={diagDropdownRef}><div className="relative group"><i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i><input className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 bg-slate-50 font-bold text-sm outline-none transition-all shadow-sm" placeholder="Select issue..." value={diagSearch} onFocus={() => setShowDiagDropdown(true)} onChange={(e) => setDiagSearch(e.target.value)} /><button type="button" onClick={() => setShowDiagDropdown(!showDiagDropdown)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"><i className={`fas fa-chevron-down transition-transform duration-300 ${showDiagDropdown ? 'rotate-180' : ''}`}></i></button></div>{showDiagDropdown && (<div className="absolute z-[110] mt-2 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">{filteredDiagnoses.map(d => (<button key={d} type="button" onClick={() => toggleDiagnosis(d)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase text-slate-700 transition-colors flex items-center justify-between group">{d}<i className="fas fa-plus opacity-0 group-hover:opacity-100 text-indigo-400"></i></button>))}{diagSearch && !availableDiagnoses.some(d => d.toLowerCase() === diagSearch.toLowerCase()) && (<button type="button" onClick={() => { if (!availableDiagnoses.includes(diagSearch)) onAddDiagnosisToBank(diagSearch); toggleDiagnosis(diagSearch); }} className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-black uppercase text-indigo-700 flex items-center justify-between sticky bottom-0 border-t mt-1"><span>Add new: "{diagSearch}"</span><i className="fas fa-plus-circle"></i></button>)}{filteredDiagnoses.length === 0 && !diagSearch && (<p className="p-4 text-xs italic text-slate-400 text-center">No more options.</p>)}</div>)}</div>
                  </section>
                  <section className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-3">Therapeutic Goals Library</h5>
                    <div className="relative" ref={goalDropdownRef}><div className="relative group"><i className="fas fa-bullseye absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i><input className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 bg-slate-50 font-bold text-sm outline-none transition-all shadow-sm" placeholder="Search goals..." value={goalSearch} onFocus={() => setShowGoalDropdown(true)} onChange={(e) => setGoalSearch(e.target.value)} /><button type="button" onClick={() => setShowGoalDropdown(!showGoalDropdown)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"><i className={`fas fa-chevron-down transition-transform duration-300 ${showGoalDropdown ? 'rotate-180' : ''}`}></i></button></div>{showGoalDropdown && (<div className="absolute z-[110] mt-2 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">{filteredGoalBank.map(g => (<button key={g} type="button" onClick={() => addGoalToStudent(g, true)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl text-[11px] font-bold text-slate-700 transition-colors flex items-center justify-between group leading-relaxed"><span className="line-clamp-2">{g}</span><i className="fas fa-plus opacity-0 group-hover:opacity-100 text-indigo-400 shrink-0 ml-2"></i></button>))}{goalSearch && !availableGoals.some(g => g.toLowerCase() === goalSearch.toLowerCase()) && (<button type="button" onClick={() => addGoalToStudent(goalSearch, false)} className="w-full text-left px-4 py-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-[11px] font-black uppercase text-indigo-700 flex items-center justify-between sticky bottom-0 border-t mt-1"><span>Add custom: "{goalSearch}"</span><i className="fas fa-plus-circle"></i></button>)}</div>)}</div>
                    <div className="space-y-4 pt-4">{formData.goals.map((goal, idx) => (<div key={idx} className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all group ${goal.isPrimary ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}><button type="button" onClick={() => setPrimaryGoal(idx)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${goal.isPrimary ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-white border-2 border-slate-200 text-slate-300 hover:border-indigo-300'}`}><i className="fas fa-star text-[12px]"></i></button><textarea required className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-800 resize-none py-1 focus:ring-0" rows={2} value={goal.text} onChange={(e) => updateGoal(idx, e.target.value)} placeholder="Type goal..." /><button type="button" onClick={() => removeGoalRow(idx)} className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt"></i></button></div>))}</div>
                  </section>
               </div>
            </div>
            <div className="flex flex-col md:flex-row justify-end gap-4 pt-10 border-t"><button type="button" onClick={closeAll} className="px-10 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-2xl transition-all">Cancel</button><button type="submit" className="px-16 py-4 bg-indigo-700 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-800 transition-all text-[10px] uppercase tracking-widest active:scale-95">{editingStudent ? 'Update GLOBAL record' : 'Save student to roster'}</button></div>
          </form>
        </div>
      )}

      {!isFormOpen && !viewingStudent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 printable-roster">
          {displayedStudents.map(s => (
            <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-500 p-6 transition-all group shadow-sm cursor-pointer hover:shadow-2xl flex flex-col items-center text-center relative active:scale-[0.98]">
              <div className="relative mb-6">
                 <StudentAvatar student={s} className="w-24 h-24 md:w-28 md:h-28" />
                 <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[8px] font-black px-3 py-1.5 rounded-full border-2 border-white shadow-lg uppercase tracking-tight">{s.grade}</div>
              </div>
              <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">{s.name}</h4>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3 mb-6">{s.diagnoses.slice(0, 2).map(d => <span key={d} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase border border-indigo-100">{d}</span>)}{s.diagnoses.length > 2 && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">+{s.diagnoses.length - 2}</span>}</div>
              <div className="w-full pt-6 border-t border-slate-100 flex items-center justify-between">
                 <div className="text-left flex-1">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Mastery <Tooltip title="Mastery level" body="This indicates average student progress based on their latest therapeutic sessions. Mastery nearing 80% marks a candidate for IEP goal completion."><i className="fas fa-info-circle text-[7px] text-slate-300"></i></Tooltip></p>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-indigo-700">{getStudentMastery(s.id)}%</span>
                       <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${getStudentMastery(s.id)}%` }}></div></div>
                    </div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all ml-4 shrink-0"><i className="fas fa-chevron-right text-[10px]"></i></div>
              </div>
            </div>
          ))}
          {displayedStudents.length === 0 && (<div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200"><i className="fas fa-users-medical text-5xl text-slate-200 mb-6"></i><h5 className="text-xl font-black text-slate-400">Roster is empty</h5><p className="text-slate-400 font-bold mt-2">Adjust your filters or register a new student.</p></div>)}
        </div>
      )}
    </div>
  );
};

export default StudentList;
