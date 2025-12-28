
import React, { useState, useEffect, useRef } from 'react';
import { LessonPlan, Student, SOAPNote } from '../types';
import { generateLessonPlan, generateStimuli } from '../services/gemini';

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

const LessonPlanner: React.FC<LessonPlannerProps> = ({ student, students, userName, notes, lessonPlans, onSavePlan, onSelectStudent, onStartSession }) => {
  const [goal, setGoal] = useState(''); const [grade, setGrade] = useState('2nd'); const [sessionStyle, setSessionStyle] = useState('Structured Drill'); const [adhocPrompt, setAdhocPrompt] = useState(''); const [isLoading, setIsLoading] = useState(false); const [isStimuliLoading, setIsStimuliLoading] = useState(false); const [editingPlan, setEditingPlan] = useState<Omit<LessonPlan, 'createdAt' | 'createdBy'> | null>(null); const [stimuli, setStimuli] = useState<{ words: string[], sentences: string[], story: string } | null>(null); const [searchQuery, setSearchQuery] = useState(''); const [showDropdown, setShowDropdown] = useState(false); const [showStudentPicker, setShowStudentPicker] = useState(false); const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (student) { if (student.goals.length > 0) { const g = student.goals.find(it => it.isPrimary) || student.goals[0]; setGoal(g.text); } setGrade(student.grade); setSearchQuery(student.name); } else { setSearchQuery(''); } }, [student]);
  useEffect(() => { const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

  const handleGenerate = async () => {
    if (!goal && !adhocPrompt) return; setIsLoading(true); setEditingPlan(null); setStimuli(null);
    try {
      const plan = await generateLessonPlan(goal || "General Speech/Language Goal", grade, undefined, adhocPrompt, student?.diagnoses || [], student?.goals.map(g => g.text) || [], sessionStyle);
      setEditingPlan({ id: '', title: plan.title, targetGoal: goal || "Ad-hoc Session", gradeRange: grade, materials: plan.materials, procedure: plan.procedure });
    } catch (err) { alert("Failed to generate lesson plan."); } finally { setIsLoading(false); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative max-w-[1600px] mx-auto pb-20">
      <div className="md:col-span-4 lg:col-span-3 no-print">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-2xl border-2 border-indigo-500/20">
          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8 flex items-center gap-3"><i className="fas fa-sliders"></i> Session Controls</h4>
          <div className="space-y-8">
            <div ref={dropdownRef} className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">1. Select Student</label>
              <input type="text" placeholder="Search..." className="w-full px-5 py-4 bg-[#1e293b] border-2 border-slate-700 rounded-2xl font-bold outline-none text-white" value={searchQuery} onFocus={() => setShowDropdown(true)} onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); if (student) onSelectStudent(''); }} />
              {showDropdown && (<div className="absolute z-50 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2">{students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (<button key={s.id} onClick={() => { onSelectStudent(s.id); setShowDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-indigo-900/50 rounded-xl font-black text-white text-sm">Grade {s.grade} - {s.name}</button>))}</div>)}
            </div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">2. Target Goal</label><input className="w-full px-5 py-4 bg-[#1e293b] border-2 border-slate-700 rounded-2xl font-bold text-white outline-none" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
            <button onClick={handleGenerate} disabled={isLoading || (!goal && !adhocPrompt)} className="w-full py-6 bg-indigo-600 rounded-2xl font-black text-white shadow-xl hover:bg-indigo-500 disabled:opacity-50">{isLoading ? 'Synthesizing...' : 'Regenerate Plan'}</button>
          </div>
        </div>
      </div>
      <div className="md:col-span-8 lg:col-span-9 space-y-8 printable-plan">
        {!editingPlan ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 no-print"><h4 className="font-black text-xl mb-6">Saved Plan Library</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{lessonPlans.map(p => (<button key={p.id} onClick={() => setEditingPlan(p)} className="p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-indigo-400 text-left group"><h5 className="font-black group-hover:text-indigo-700">{p.title}</h5><p className="text-[9px] font-black uppercase text-slate-400 mt-2">{p.targetGoal}</p></button>))}</div></div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-8 md:p-14 space-y-12">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8 border-b border-slate-100 pb-10">
              <div className="flex-1"><h1 className="text-4xl font-black text-slate-900 leading-tight">{editingPlan.title}</h1><p className="text-sm font-black text-indigo-600 mt-4 italic">Target Focus: {editingPlan.targetGoal}</p></div>
              <div className="flex flex-wrap gap-4 shrink-0 no-print">
                <button onClick={handlePrint} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2"><i className="fas fa-print"></i> Print Plan</button>
                <button onClick={() => onStartSession(student?.id || '', editingPlan.id)} className="bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:bg-indigo-800 flex items-center gap-3">Start Session</button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Required Materials</h5><ul className="space-y-3 list-disc pl-4 font-bold text-sm text-slate-700">{editingPlan.materials.map((m, i) => (<li key={i}>{m}</li>))}</ul></div>
              <div className="lg:col-span-2"><h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Instructional Procedure</h5><div className="space-y-8">{editingPlan.procedure.map((s, i) => (<div key={i} className="flex gap-6"><div className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-700 text-white flex items-center justify-center font-black text-sm">{i+1}</div><p className="text-base font-medium leading-relaxed text-slate-800">{s}</p></div>))}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonPlanner;
