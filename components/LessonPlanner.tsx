
import React, { useState, useEffect, useRef } from 'react';
import { LessonPlan, Student, SOAPNote } from '../types';
import { generateLessonPlan } from '../services/gemini';

interface LessonPlannerProps {
  student: Student | null;
  students: Student[];
  userName: string;
  notes: SOAPNote[];
  lessonPlans: LessonPlan[];
  onSavePlan: (plan: Omit<LessonPlan, 'createdAt' | 'createdBy'>) => void;
  onSelectStudent: (id: string) => void;
  onStartSession: (studentId: string, planId: string) => void;
}

const LessonPlanner: React.FC<LessonPlannerProps> = ({ 
  student, 
  students, 
  userName, 
  notes,
  lessonPlans, 
  onSavePlan, 
  onSelectStudent,
  onStartSession
}) => {
  const [goal, setGoal] = useState('');
  const [grade, setGrade] = useState('2nd');
  const [adhocPrompt, setAdhocPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Omit<LessonPlan, 'createdAt' | 'createdBy'> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get latest SOAP data for context
  const latestNote = student ? notes.filter(n => n.studentId === student.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
  const historySummary = latestNote ? `Latest Assessment: ${latestNote.assessment}. Recommended focus for next session: ${latestNote.plan}` : undefined;

  useEffect(() => {
    if (student) {
      if (student.goals.length > 0) {
        const primaryGoal = student.goals.find(g => g.isPrimary) || student.goals[0];
        setGoal(primaryGoal.text);
      }
      setGrade(student.grade);
      setSearchQuery(student.name);
    } else {
      setSearchQuery('');
    }
  }, [student]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = async () => {
    if (!goal && !adhocPrompt) return;
    setIsLoading(true);
    setEditingPlan(null);
    try {
      const plan = await generateLessonPlan(
        goal || "General Speech/Language Goal", 
        grade, 
        historySummary, 
        adhocPrompt,
        student?.diagnoses || [],
        student?.goals.map(g => g.text) || []
      );
      setEditingPlan({
        id: '',
        title: plan.title,
        targetGoal: goal || "Ad-hoc Session",
        gradeRange: grade,
        materials: plan.materials,
        procedure: plan.procedure
      });
    } catch (err) {
      alert("Failed to generate lesson plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSavedPlan = (plan: LessonPlan) => {
    setGoal(plan.targetGoal);
    setGrade(plan.gradeRange);
    setEditingPlan(plan);
  };

  const saveToLibrary = () => {
    if (!editingPlan) return;
    const isAlreadySaved = lessonPlans.some(p => p.id === editingPlan.id && editingPlan.id !== '');
    if (isAlreadySaved) return;

    const newId = Date.now().toString();
    const planToSave = { ...editingPlan, id: newId };
    onSavePlan(planToSave);
    setEditingPlan(planToSave);
  };

  const initiateSession = (targetStudent?: Student) => {
    const activeStudent = targetStudent || student;
    
    if (!activeStudent) {
      setShowStudentPicker(true);
      return;
    }
    
    if (!editingPlan) return;

    let planId = editingPlan.id;
    if (!planId) {
      planId = Date.now().toString();
      onSavePlan({ ...editingPlan, id: planId });
    }
    
    onStartSession(activeStudent.id, planId);
    setShowStudentPicker(false);
  };

  const updateProcedure = (index: number, val: string) => {
    if (!editingPlan) return;
    const newProc = [...editingPlan.procedure];
    newProc[index] = val;
    setEditingPlan({ ...editingPlan, procedure: newProc });
  };

  const addProcedureStep = () => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, procedure: [...editingPlan.procedure, "New clinical step..."] });
  };

  const removeProcedureStep = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({ ...editingPlan, procedure: editingPlan.procedure.filter((_, i) => i !== index) });
  };

  const updateMaterial = (index: number, val: string) => {
    if (!editingPlan) return;
    const newMats = [...editingPlan.materials];
    newMats[index] = val;
    setEditingPlan({ ...editingPlan, materials: newMats });
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!student && !editingPlan) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-4xl font-black text-slate-900 tracking-tight">Lesson Planner Hub</h3>
          <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Create context-aware clinical activities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-6">
            <div className="bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl border-2 border-indigo-500/20 text-white">
              <h4 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-3 text-indigo-400">
                <i className="fas fa-sliders"></i> Clinical Controls
              </h4>
              
              <div className="space-y-8">
                <div ref={dropdownRef} className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Select Student Profile</label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                    <input 
                      type="text" 
                      placeholder="Fetch goals & clinical issues..." 
                      className="w-full pl-12 pr-10 py-4 bg-[#1e293b] border-2 border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-white shadow-inner"
                      value={searchQuery}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        if (student) onSelectStudent(''); 
                      }}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => { setSearchQuery(''); onSelectStudent(''); setShowDropdown(false); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <i className="fas fa-times-circle"></i>
                      </button>
                    )}
                  </div>
                  {showDropdown && (
                    <div className="absolute z-50 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-bold italic">No students found</div>
                      ) : (
                        filteredStudents.map(s => (
                          <button 
                            key={s.id} 
                            onClick={() => {
                              onSelectStudent(s.id);
                              setShowDropdown(false);
                            }} 
                            className="w-full text-left px-4 py-3 hover:bg-indigo-900/50 rounded-xl flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="font-black text-white text-sm group-hover:text-indigo-400">{s.name}</p>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Grade {s.grade}</p>
                            </div>
                            <i className="fas fa-chevron-right text-slate-700 group-hover:text-indigo-400 text-[10px]"></i>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Targeted Clinical Goal</label>
                  <input 
                    className="w-full px-5 py-4 bg-[#1e293b] border-2 border-slate-700 rounded-2xl font-bold text-white focus:border-indigo-500 outline-none shadow-inner" 
                    placeholder="Enter primary focus goal..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">3. Custom Prompt Add-on</label>
                  <textarea 
                    className="w-full px-5 py-4 bg-[#1e293b] border-2 border-slate-700 rounded-2xl font-bold text-white focus:border-indigo-500 outline-none h-28 resize-none shadow-inner placeholder:text-slate-600" 
                    placeholder="e.g. 'Make it Pokemon themed' or 'Focus on visual supports'..."
                    value={adhocPrompt}
                    onChange={(e) => setAdhocPrompt(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleGenerate} 
                  disabled={isLoading || (!goal && !adhocPrompt)}
                  className={`w-full py-6 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 ${isLoading ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-sync"></i>}
                  {isLoading ? 'Synthesizing Plan...' : 'Regenerate Plan'}
                </button>

                <button onClick={() => { setSearchQuery(''); onSelectStudent(''); setGoal(''); setAdhocPrompt(''); }} className="w-full text-center py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                  Discard Session
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="font-black text-xl flex items-center gap-2">
                  <i className="fas fa-book-bookmark text-indigo-700"></i> Saved Library
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-8">
                {lessonPlans.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 font-bold italic">No saved plans yet.</div>
                ) : lessonPlans.map(plan => (
                  <button 
                    key={plan.id} 
                    onClick={() => handleOpenSavedPlan(plan)}
                    className="p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group text-left flex flex-col h-full shadow-sm active:scale-[0.98]"
                  >
                    <h5 className="font-black text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">{plan.title}</h5>
                    <p className="text-[9px] font-black uppercase text-slate-400 truncate mb-4">{plan.targetGoal}</p>
                    <div className="mt-auto flex justify-between items-center w-full">
                      <span className="text-[9px] font-black bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">Grade {plan.gradeRange}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative max-w-[1600px] mx-auto pb-20">
      <div className="md:col-span-4 space-y-6">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-10 flex items-center gap-3">
            <i className="fas fa-sliders"></i> Clinical Controls
          </h4>
          
          <div className="space-y-8">
            {student && (
              <div className="p-6 bg-[#1e293b] rounded-2xl border-2 border-indigo-500/30 flex flex-col gap-4 shadow-inner">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Student Profile</p>
                    <p className="text-xl font-black text-white">{student.name}</p>
                    <p className="text-[9px] text-emerald-400 mt-1 font-bold flex items-center gap-1">
                      <i className="fas fa-check-double text-[8px]"></i> History sync active
                    </p>
                  </div>
                  <button onClick={() => onSelectStudent('')} className="text-slate-500 hover:text-white transition-colors">
                    <i className="fas fa-times-circle text-lg"></i>
                  </button>
                </div>

                {/* VISIBLE TARGETING INFO */}
                {student.diagnoses.length > 0 && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Diagnostic Context Sync</p>
                    <div className="flex flex-wrap gap-2">
                      {student.diagnoses.map(d => (
                        <span key={d} className="bg-rose-500/10 text-rose-300 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-rose-500/20">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {student.goals.length > 1 && (
                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Secondary Goals In-Scope</p>
                    <div className="space-y-2">
                       {student.goals.filter(g => g.text !== goal).slice(0, 2).map((g, i) => (
                         <div key={i} className="flex gap-2 items-start text-[9px] font-bold text-slate-500 leading-tight">
                            <i className="fas fa-link mt-0.5 text-indigo-500/50"></i>
                            {g.text}
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Grade</label>
              <div className="relative">
                <select className="w-full px-5 py-4 rounded-2xl bg-[#1e293b] border-2 border-slate-700 text-white font-black outline-none shadow-inner appearance-none cursor-pointer focus:border-indigo-500 transition-all" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {['Pre-K','K','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"></i>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Custom Prompt Add-on</label>
              <textarea className="w-full px-5 py-4 rounded-2xl bg-[#1e293b] border-2 border-slate-700 text-white font-bold outline-none h-32 resize-none text-xs shadow-inner focus:border-indigo-500 transition-all placeholder:text-slate-600" value={adhocPrompt} onChange={(e) => setAdhocPrompt(e.target.value)} placeholder="e.g. 'Make it Pokemon themed'..." />
            </div>

            <button onClick={handleGenerate} disabled={isLoading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-white flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 text-lg">
              {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-sync"></i>}
              {isLoading ? 'Synthesizing...' : 'Regenerate Plan'}
            </button>
            
            <button onClick={() => { setEditingPlan(null); onSelectStudent(''); }} className="w-full text-center py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
              Discard Session
            </button>
          </div>
        </div>
      </div>

      <div className="md:col-span-8">
        {editingPlan && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-8 md:p-14 space-y-12 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 border-b border-slate-100 pb-10">
              <div className="flex-1 space-y-4">
                <input 
                  className="text-4xl font-black text-slate-900 leading-tight w-full bg-transparent border-none outline-none focus:ring-4 focus:ring-indigo-50 rounded-xl px-2"
                  value={editingPlan.title}
                  onChange={(e) => setEditingPlan({...editingPlan, title: e.target.value})}
                />
                <div className="flex items-center gap-3">
                   <p className="text-sm font-black text-indigo-600 italic">Target Focus: {editingPlan.targetGoal}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 shrink-0 w-full lg:w-auto">
                <button onClick={() => initiateSession()} className="bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:bg-indigo-800 flex items-center justify-center gap-3 transition-all active:scale-95 text-lg">
                  <i className="fas fa-file-signature"></i> {student ? `Start Session Note` : 'Link to Student'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={saveToLibrary} className={`px-6 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-sm ${editingPlan.id ? 'bg-slate-100 text-slate-400' : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    <i className="fas fa-plus"></i> {editingPlan.id ? 'Saved' : 'Save Plan'}
                  </button>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl">
                    <i className="fas fa-print"></i> Print
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1 space-y-8">
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <i className="fas fa-toolbox text-indigo-400"></i> Clinical Materials
                  </h5>
                  <div className="space-y-3">
                    {editingPlan.materials.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center group">
                        <input 
                          className="flex-1 px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-lg font-bold text-xs text-slate-700 outline-none" 
                          value={m} 
                          onChange={(e) => updateMaterial(i, e.target.value)}
                        />
                        <button onClick={() => setEditingPlan({...editingPlan, materials: editingPlan.materials.filter((_, idx) => idx !== i)})} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setEditingPlan({...editingPlan, materials: [...editingPlan.materials, "New Material"]})} className="text-[9px] font-black text-indigo-600 hover:underline uppercase flex items-center gap-1">
                      <i className="fas fa-plus"></i> Add Material
                    </button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-10">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <i className="fas fa-list-ol text-indigo-400"></i> Clinical Execution Workflow
                </h5>
                <div className="space-y-8">
                  {editingPlan.procedure.map((s, i) => (
                    <div key={i} className="flex gap-6 group relative">
                      <div className="shrink-0 w-10 h-10 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 flex items-center justify-center font-black text-sm group-hover:bg-indigo-700 group-hover:text-white transition-all shadow-sm">
                        {i+1}
                      </div>
                      <div className="flex-1">
                        <textarea 
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white p-4 rounded-xl text-base font-medium leading-relaxed text-slate-800 resize-none outline-none transition-all"
                          value={s}
                          rows={3}
                          onChange={(e) => updateProcedure(i, e.target.value)}
                        />
                      </div>
                      <button onClick={() => removeProcedureStep(i)} className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  ))}
                  <button onClick={addProcedureStep} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-700 transition-all flex items-center justify-center gap-2">
                    <i className="fas fa-plus-circle text-lg"></i> Append Activity Step
                  </button>
                </div>
              </div>
            </div>
            
            <div className="pt-12 border-t border-slate-100 text-center">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">AI Synthesis Mode: Diagnostic Profile & Clinical Context Sync Active</p>
            </div>
          </div>
        )}
      </div>

      {/* Student Picker Modal */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-700 text-white">
              <h3 className="text-xl font-black">Link Activity to Student Record</h3>
              <button onClick={() => setShowStudentPicker(false)} className="hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-8">
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {students.map(s => (
                  <button key={s.id} onClick={() => initiateSession(s)} className="w-full p-4 bg-slate-50 hover:bg-indigo-50 text-left rounded-2xl font-black text-slate-900 flex items-center justify-between border-2 border-transparent hover:border-indigo-100 transition-all active:scale-[0.98] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">{s.name.charAt(0)}</div>
                      <span>{s.name}</span>
                    </div>
                    <i className="fas fa-chevron-right text-indigo-400"></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanner;
