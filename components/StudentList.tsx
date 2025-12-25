
import React, { useState, useEffect, useRef } from 'react';
import { Student, View, Goal, SOAPNote } from '../types';
import { predictMilestone } from '../services/gemini';

interface StudentListProps {
  students: Student[];
  notes: SOAPNote[];
  userName: string;
  initialOpenForm?: boolean;
  availableDiagnoses: string[];
  availableGoals: string[];
  onAddStudent: (student: Partial<Student>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onSelectStudent: (id: string, view?: View) => void;
  onSelectMultipleStudents: (ids: string[]) => void;
  onEditNote: (studentId: string, noteId: string) => void;
  onCloseForm: () => void;
  onSeedSample: () => void;
}

type MetricType = 'last' | 'avg' | 'trend' | 'cuing' | 'projection';

const metricDefinitions: Record<MetricType, { title: string; derivation: string; significance: string; icon: string }> = {
  last: {
    title: 'Last Session Accuracy',
    derivation: 'Calculated as (Correct Trials / Total Trials) * 100 for the most recent session record.',
    significance: 'Provides a "snapshot" of a student\'s performance on a specific day. Matters for gauging immediate response to new targets or current energy levels.',
    icon: 'fa-clock-rotate-left'
  },
  avg: {
    title: 'Average Accuracy',
    derivation: 'The mathematical mean of all accuracy scores recorded across the student\'s clinical history.',
    significance: 'Critical for IEP progress reporting. It provides a smoothed view of performance, filtering out "off days" to show true skill acquisition over time.',
    icon: 'fa-chart-area'
  },
  trend: {
    title: 'Clinical Trend',
    derivation: 'Comparison of accuracy percentage across the last 3 sessions using basic linear regression.',
    significance: 'Helps you identify if a student is plateauing (stable), progressing (up), or if targets have become too difficult (down). Used to justify target changes.',
    icon: 'fa-arrow-trend-up'
  },
  cuing: {
    title: 'Support Profile (Cuing)',
    derivation: 'Aggregation of the level of clinical support (Maximal to Independent) required to reach accuracy targets.',
    significance: 'Accuracy is only half the story. A student performing at 80% with "Maximal" cues is not as proficient as 80% with "Minimal" cues. This maps the path to independence.',
    icon: 'fa-stairs'
  },
  projection: {
    title: 'IEP Projection (AI)',
    derivation: 'Gemini-powered analysis of the last 10 session data points, taking into account trend velocity and diagnosis complexity.',
    significance: 'Provides a data-backed estimate for when a student will hit their mastery criteria. Invaluable for planning IEP end-dates or exit criteria.',
    icon: 'fa-crystal-ball'
  }
};

const StudentList: React.FC<StudentListProps> = ({ 
  students, 
  notes,
  userName,
  initialOpenForm, 
  availableDiagnoses,
  availableGoals,
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent,
  onSelectStudent,
  onSelectMultipleStudents,
  onEditNote,
  onCloseForm,
  onSeedSample
}) => {
  const [isFormOpen, setIsFormOpen] = useState(!!initialOpenForm);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingProgressId, setViewingProgressId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPredicting, setIsPredicting] = useState<string | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'archived'>('active');
  const [activeExplainer, setActiveExplainer] = useState<MetricType | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    grade: string;
    diagnoses: string[];
    goals: Goal[];
  }>({ name: '', grade: '', diagnoses: [], goals: [] });

  const [diagSearch, setDiagSearch] = useState('');
  const [showDiagDropdown, setShowDiagDropdown] = useState(false);
  const [goalSearch, setGoalSearch] = useState('');
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  const diagDropdownRef = useRef<HTMLDivElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  // Robust click-outside logic to ensure dropdowns collapse automatically
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (diagDropdownRef.current && !diagDropdownRef.current.contains(target)) {
        setShowDiagDropdown(false);
      }
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(target)) {
        setShowGoalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsFormOpen(!!initialOpenForm);
  }, [initialOpenForm]);

  const resetForm = () => {
    setFormData({ name: '', grade: '', diagnoses: [], goals: [] });
    setEditingStudent(null);
    setIsFormOpen(false);
    onCloseForm();
    setDiagSearch('');
    setGoalSearch('');
  };

  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setSelectionMode(false);
    setSelectedIds([]);
    setEditingStudent(student);
    setFormData({ 
      name: student.name, 
      grade: student.grade, 
      diagnoses: student.diagnoses, 
      goals: student.goals || [] 
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePredict = async (student: Student) => {
    const studentNotes = notes.filter(n => n.studentId === student.id && n.metrics);
    if (studentNotes.length < 2) {
      alert("At least 2 session records with metrics are required for clinical projection.");
      return;
    }
    setIsPredicting(student.id);
    try {
      const primaryGoal = student.goals.find(g => g.isPrimary)?.text || student.goals[0].text;
      const prediction = await predictMilestone(student.name, primaryGoal, studentNotes);
      onUpdateStudent({ ...student, milestonePrediction: prediction });
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      grade: formData.grade,
      diagnoses: formData.diagnoses,
      goals: formData.goals,
    };

    if (editingStudent) {
      onUpdateStudent({ ...editingStudent, ...payload });
    } else {
      onAddStudent({ id: Date.now().toString(), ...payload });
    }
    resetForm();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleDiagnosis = (diag: string) => {
    setFormData(prev => ({
      ...prev,
      diagnoses: prev.diagnoses.includes(diag) 
        ? prev.diagnoses.filter(d => d !== diag)
        : [...prev.diagnoses, diag]
    }));
    setDiagSearch('');
    setShowDiagDropdown(false); // Collapse on select for better UX
  };

  const toggleGoal = (goalText: string) => {
    const exists = formData.goals.find(g => g.text === goalText);
    if (exists) {
      setFormData(prev => ({ ...prev, goals: prev.goals.filter(g => g.text !== goalText) }));
    } else {
      setFormData(prev => ({ ...prev, goals: [...prev.goals, { text: goalText, isPrimary: false }] }));
    }
    setGoalSearch('');
    setShowGoalDropdown(false); // Collapse on select for better UX
  };

  const togglePrimaryGoal = (goalText: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.text === goalText ? { ...g, isPrimary: !g.isPrimary } : g)
    }));
  };

  const handleToggleStatus = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    onUpdateStudent({ ...student, isActive: !student.isActive });
  };

  const filteredDiagnoses = availableDiagnoses.filter(d => 
    d.toLowerCase().includes(diagSearch.toLowerCase()) && !formData.diagnoses.includes(d)
  );

  const filteredGoals = availableGoals.filter(g => 
    g.toLowerCase().includes(goalSearch.toLowerCase()) && !formData.goals.find(fg => fg.text === g)
  );

  const gradeOptions = ['Pre-K', 'K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

  const getStudentMetrics = (studentId: string) => {
    const studentNotes = notes.filter(n => n.studentId === studentId && n.metrics).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastAccuracy = studentNotes.length > 0 ? studentNotes[studentNotes.length - 1].metrics?.accuracy : 0;
    const avgAccuracy = studentNotes.length > 0 ? Math.round(studentNotes.reduce((acc, curr) => acc + (curr.metrics?.accuracy || 0), 0) / studentNotes.length) : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (studentNotes.length >= 2) {
      const last = studentNotes[studentNotes.length - 1].metrics?.accuracy || 0;
      const prev = studentNotes[studentNotes.length - 2].metrics?.accuracy || 0;
      if (last > prev) trend = 'up';
      else if (last < prev) trend = 'down';
    }

    return { history: studentNotes, lastAccuracy, avgAccuracy, trend };
  };

  const displayedStudents = students.filter(s => rosterTab === 'active' ? (s.isActive !== false) : (s.isActive === false));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Roster</h3>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Managed by {userName}</p>
        </div>
        
        {!isFormOpen && (
          <div className="flex flex-wrap gap-4 w-full md:w-auto animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setRosterTab('active')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${rosterTab === 'active' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Active ({students.filter(s => s.isActive !== false).length})
              </button>
              <button 
                onClick={() => setRosterTab('archived')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${rosterTab === 'archived' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Archived ({students.filter(s => s.isActive === false).length})
              </button>
            </div>
            
            <div className="flex gap-2 ml-auto">
              {rosterTab === 'active' && (
                <button 
                  onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]); }}
                  className={`px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all ${selectionMode ? 'bg-amber-100 text-amber-700 border-2 border-amber-200' : 'bg-slate-100 text-slate-700'}`}
                >
                  <i className="fas fa-layer-group"></i> {selectionMode ? 'Cancel Selection' : 'Group Session'}
                </button>
              )}
              <button 
                onClick={() => { setIsFormOpen(true); setSelectionMode(false); setSelectedIds([]); }}
                className="bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-800 transition-all shadow-xl active:scale-95"
              >
                <i className="fas fa-user-plus"></i> Add Student
              </button>
            </div>
          </div>
        )}
      </div>

      {selectionMode && selectedIds.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex justify-between items-center animate-in slide-in-from-top-4">
          <div>
            <h4 className="font-black text-amber-900">Group Session Ready</h4>
            <p className="text-xs font-medium text-amber-700">{selectedIds.length} students selected for simultaneous tracking.</p>
          </div>
          <button 
            onClick={() => onSelectMultipleStudents(selectedIds)}
            className="bg-amber-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-amber-700 transition-all active:scale-95"
          >
            Start Group Session
          </button>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-4 border-indigo-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-2xl font-black text-slate-900">{editingStudent ? 'Edit Case File' : 'New Enrollment'}</h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"><i className="fas fa-times text-xl"></i></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Legal Name</label>
                <input required className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-600 bg-white text-slate-900 font-bold outline-none shadow-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Academic Grade</label>
                <select required className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-600 bg-white text-slate-900 font-black outline-none shadow-sm" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})}>
                  <option value="">Select Grade...</option>
                  {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div ref={diagDropdownRef} className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Diagnoses</label>
                <div className="min-h-[60px] w-full px-5 py-3 rounded-xl border-2 border-slate-200 bg-white flex flex-wrap gap-2 items-center shadow-sm focus-within:border-indigo-500 transition-colors">
                  {formData.diagnoses.map(d => (
                    <span key={d} className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                      {d} <i className="fas fa-times cursor-pointer hover:text-red-400" onClick={() => toggleDiagnosis(d)}></i>
                    </span>
                  ))}
                  <input className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-900" placeholder="Add diagnosis..." value={diagSearch} onFocus={() => setShowDiagDropdown(true)} onChange={(e) => setDiagSearch(e.target.value)} />
                </div>
                {showDiagDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 border-t-0 animate-in slide-in-from-top-1">
                    {filteredDiagnoses.map(d => <button key={d} type="button" className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-sm font-bold text-slate-900" onClick={() => toggleDiagnosis(d)}>{d}</button>)}
                    {diagSearch && !availableDiagnoses.includes(diagSearch) && (
                      <button type="button" className="w-full text-left px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-black" onClick={() => toggleDiagnosis(diagSearch)}>+ Add "{diagSearch}"</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div ref={goalDropdownRef} className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Objectives</label>
                <div className="min-h-[220px] w-full px-5 py-4 rounded-xl border-2 border-slate-200 bg-white shadow-sm flex flex-col focus-within:border-indigo-500 transition-colors">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.goals.map(g => (
                      <div key={g.text} className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all ${g.isPrimary ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
                        <button type="button" onClick={() => togglePrimaryGoal(g.text)} className={g.isPrimary ? 'text-amber-600' : 'text-slate-300'} title="Set as Primary Goal"><i className="fas fa-star"></i></button>
                        <span className="text-xs font-black text-slate-800">{g.text}</span>
                        <button type="button" onClick={() => toggleGoal(g.text)} className="text-slate-300 hover:text-red-500"><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                  <input className="w-full bg-transparent border-none outline-none font-bold text-sm mt-auto text-slate-900" placeholder="Search goals..." value={goalSearch} onFocus={() => setShowGoalDropdown(true)} onChange={(e) => setGoalSearch(e.target.value)} />
                </div>
                {showGoalDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 border-t-0 animate-in slide-in-from-top-1">
                    {filteredGoals.map(g => (
                      <button key={g} type="button" className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-sm font-bold text-slate-900 border-b border-slate-50 last:border-0" onClick={() => toggleGoal(g)}>{g}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-4">
              <button type="button" onClick={resetForm} className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Discard</button>
              <button type="submit" className="px-12 py-3 bg-indigo-700 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-800 transition-all">{editingStudent ? 'Update' : 'Register'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {displayedStudents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <i className={`fas ${rosterTab === 'active' ? 'fa-user-plus' : 'fa-archive'} text-4xl text-slate-200 mb-4 block`}></i>
            <p className="text-slate-400 font-black">No {rosterTab} students found.</p>
          </div>
        ) : displayedStudents.map(student => {
          const { lastAccuracy, avgAccuracy, trend } = getStudentMetrics(student.id);
          const isExpanded = viewingProgressId === student.id;
          const isSelected = selectedIds.includes(student.id);
          const isArchived = student.isActive === false;

          return (
            <div key={student.id} className={`bg-white rounded-[2rem] border-2 transition-all overflow-hidden ${isSelected ? 'border-amber-400 bg-amber-50/20 shadow-lg' : isExpanded ? 'border-indigo-600 shadow-2xl' : 'border-slate-100 hover:border-indigo-100'} ${isArchived ? 'opacity-70 grayscale-[0.3]' : ''}`}>
              <div className="p-8 flex flex-col md:flex-row items-center gap-6">
                {selectionMode && !isArchived && (
                  <button onClick={() => toggleSelection(student.id)} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-transparent'}`}>
                    <i className="fas fa-check"></i>
                  </button>
                )}
                <div className="shrink-0 flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-inner border-4 border-white ${isArchived ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'}`}>
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 leading-tight">{student.name} {isArchived && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded ml-2 uppercase">Archived</span>}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Grade {student.grade} • {student.diagnoses.join(', ')}</p>
                    
                    {!isArchived && !selectionMode && (
                      <button 
                        onClick={() => onSelectStudent(student.id, 'notes')}
                        className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 group"
                      >
                        <i className="fas fa-file-signature group-hover:scale-110 transition-transform"></i>
                        View Session Workspace
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-8">
                  <div className="text-center group/metric">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-center gap-2">
                      Last Session 
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveExplainer('last'); }}
                        className="text-indigo-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95"
                        title="Metric Info"
                      >
                        <i className="fas fa-circle-info"></i>
                      </button>
                    </p>
                    <div className={`text-2xl font-black ${lastAccuracy > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>{lastAccuracy}%</div>
                  </div>
                  <div className="text-center group/metric">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-center gap-2">
                      Avg Accuracy
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveExplainer('avg'); }}
                        className="text-indigo-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95"
                        title="Metric Info"
                      >
                        <i className="fas fa-circle-info"></i>
                      </button>
                    </p>
                    <div className="text-2xl font-black text-slate-900">{avgAccuracy}%</div>
                  </div>
                  <div className="text-center group/metric">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-center gap-2">
                      Clinical Trend
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveExplainer('trend'); }}
                        className="text-indigo-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95"
                        title="Metric Info"
                      >
                        <i className="fas fa-circle-info"></i>
                      </button>
                    </p>
                    <div className={`text-2xl font-black ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-400'}`}>
                      <i className={`fas fa-arrow-${trend}`}></i>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewingProgressId(isExpanded ? null : student.id)} 
                    disabled={selectionMode}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectionMode ? 'opacity-20 cursor-not-allowed' : isExpanded ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                    title="View Analytics"
                  >
                    <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chart-line'}`}></i>
                  </button>
                  <button 
                    onClick={(e) => handleEditClick(e, student)} 
                    disabled={selectionMode}
                    className={`w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 ${selectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
                    title="Edit Information"
                  >
                    <i className="fas fa-user-edit"></i>
                  </button>
                  <button 
                    onClick={(e) => handleToggleStatus(e, student)}
                    disabled={selectionMode}
                    className={`w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-all ${selectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
                    title={isArchived ? "Reactivate Student" : "Archive Student"}
                  >
                    <i className={`fas ${isArchived ? 'fa-box-open text-emerald-600' : 'fa-box-archive text-amber-600'}`}></i>
                  </button>
                  {isArchived && (
                    <button 
                      onClick={() => onDeleteStudent(student.id)} 
                      disabled={selectionMode}
                      className={`w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all ${selectionMode ? 'opacity-20 cursor-not-allowed' : ''}`}
                      title="Delete Permanently"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && !selectionMode && (
                <div className="bg-slate-50 border-t-2 border-slate-100 p-8 animate-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 space-y-8">
                      <div className="flex justify-between items-center mb-6">
                        <h5 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                          <i className="fas fa-history text-indigo-600"></i> Quantifiable Progress Chart
                        </h5>
                        <button 
                          onClick={() => handlePredict(student)} 
                          disabled={isPredicting === student.id}
                          className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                          {isPredicting === student.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-crystal-ball"></i>}
                          IEP Projection
                          <i className="fas fa-circle-info text-[9px] opacity-60 ml-1" onClick={(e) => { e.stopPropagation(); setActiveExplainer('projection'); }}></i>
                        </button>
                      </div>

                      {student.milestonePrediction && (
                        <div className="bg-indigo-900 p-6 rounded-[2rem] text-white shadow-xl animate-in zoom-in-95 relative overflow-hidden group">
                          <i className="fas fa-star absolute -right-4 -top-4 text-white/5 text-9xl group-hover:rotate-12 transition-transform"></i>
                          <div className="relative z-10">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Mastery Projection</p>
                                  <h6 className="text-2xl font-black text-white">Target Date: {student.milestonePrediction.predictedDate}</h6>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Confidence</p>
                                  <p className="text-2xl font-black text-emerald-400">{student.milestonePrediction.confidence}%</p>
                                </div>
                             </div>
                             <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs font-medium leading-relaxed italic text-indigo-100">
                               "{student.milestonePrediction.rationale}"
                             </div>
                          </div>
                        </div>
                      )}

                      {notes.filter(n => n.studentId === student.id && n.metrics).length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-xs font-bold">No qualitative data found.</div>
                      ) : (
                        <div className="space-y-6">
                          {notes.filter(n => n.studentId === student.id && n.metrics).slice(-6).map((note, i) => (
                            <div key={i} className="flex items-center gap-6">
                              <div className="w-20 shrink-0 text-[10px] font-black text-slate-400 uppercase">{new Date(note.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div className={`h-full transition-all duration-1000 ${note.metrics?.accuracy! > 75 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${note.metrics?.accuracy}%`}}></div>
                              </div>
                              <div className="w-12 text-right text-xs font-black text-slate-900">{note.metrics?.accuracy}%</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit">
                      <h5 className="font-black text-slate-900 text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-stairs text-amber-600"></i> Support Profile
                        <button onClick={() => setActiveExplainer('cuing')} className="text-indigo-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95"><i className="fas fa-circle-info text-xs"></i></button>
                      </h5>
                      <div className="space-y-5">
                        {(['Independent', 'Minimal', 'Moderate', 'Maximal'] as const).map(level => {
                          const studentNotes = notes.filter(n => n.studentId === student.id && n.metrics);
                          const count = studentNotes.filter(n => n.metrics?.cuingLevel === level).length;
                          const percentage = studentNotes.length > 0 ? Math.round((count / studentNotes.length) * 100) : 0;
                          return (
                            <div key={level} className="space-y-1.5">
                              <div className="flex justify-between text-[9px] font-black uppercase">
                                <span className="text-slate-600">{level}</span>
                                <span className="text-slate-400">{count}</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                <div className={`h-full rounded-full ${level === 'Independent' ? 'bg-blue-500' : level === 'Minimal' ? 'bg-emerald-500' : level === 'Moderate' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${percentage}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Metric Explainer Modal */}
      {activeExplainer && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveExplainer(null)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-200 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                <i className={`fas ${metricDefinitions[activeExplainer].icon}`}></i>
              </div>
              <h4 className="text-xl font-black text-slate-900">{metricDefinitions[activeExplainer].title}</h4>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">How it's derived</p>
                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {metricDefinitions[activeExplainer].derivation}
                </p>
              </div>
              
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Clinical Significance for IEPs</p>
                <p className="text-sm font-bold text-indigo-900 leading-relaxed italic border-l-4 border-indigo-200 pl-4">
                  "{metricDefinitions[activeExplainer].significance}"
                </p>
              </div>
            </div>

            <button 
              onClick={() => setActiveExplainer(null)} 
              className="w-full mt-8 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
