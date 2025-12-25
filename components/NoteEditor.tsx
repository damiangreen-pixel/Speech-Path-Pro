
import React, { useState, useEffect, useRef } from 'react';
import { Student, SOAPNote, CuingLevel, TaskSetting, LessonPlan, SessionMetrics } from '../types';
import { helpWithSoapNote, analyzeCuingHierarchy } from '../services/gemini';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';

interface NoteEditorProps {
  studentsInGroup: Student[];
  allStudents: Student[];
  notes: SOAPNote[];
  lessonPlans: LessonPlan[];
  userName: string;
  initialNote: SOAPNote | null;
  initialLessonPlanId: string | null;
  onSelectStudents: (ids: string[]) => void;
  onSaveNotes: (notes: Omit<SOAPNote, 'createdAt' | 'createdBy'>[]) => void;
  onCancelEdit: () => void;
}

interface StudentSessionState {
  rawObservations: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string; };
  correctTally: number;
  incorrectTally: number;
  cuingLevel: CuingLevel;
  setting: TaskSetting;
  selectedGoalText: string;
  selectedPlanId: string;
  parentLetter: string;
}

interface CuingAnalysisResult {
  assessment: string;
  recommendations: string[];
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
  studentsInGroup, 
  allStudents, 
  notes,
  lessonPlans,
  userName, 
  initialNote,
  initialLessonPlanId,
  onSelectStudents, 
  onSaveNotes,
  onCancelEdit
}) => {
  const [activeStudentId, setActiveStudentId] = useState<string>(studentsInGroup[0]?.id || '');
  const [sessionStates, setSessionStates] = useState<{ [id: string]: StudentSessionState }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [locallySelectedIds, setLocallySelectedIds] = useState<string[]>([]);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showCuingAnalysisModal, setShowCuingAnalysisModal] = useState(false);
  const [isAnalyzingCuing, setIsAnalyzingCuing] = useState(false);
  const [cuingAnalysisResult, setCuingAnalysisResult] = useState<CuingAnalysisResult | null>(null);
  
  // Live Assistant State (Session-Level)
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  // Visual Feedback for specific students
  const [flashTally, setFlashTally] = useState<{ studentId: string, type: 'correct' | 'incorrect' } | null>(null);
  const [flashCuing, setFlashCuing] = useState<string | null>(null);

  useEffect(() => {
    const initialState: { [id: string]: StudentSessionState } = {};
    studentsInGroup.forEach(s => {
      const primary = s.goals.find(g => g.isPrimary)?.text || s.goals[0]?.text || '';
      initialState[s.id] = {
        rawObservations: '',
        soap: { subjective: '', objective: '', assessment: '', plan: '' },
        correctTally: 0,
        incorrectTally: 0,
        cuingLevel: 'Moderate',
        setting: 'Structured',
        selectedGoalText: primary,
        selectedPlanId: initialLessonPlanId || '',
        parentLetter: ''
      };
    });

    if (initialNote && studentsInGroup.length === 1) {
      const sId = studentsInGroup[0].id;
      initialState[sId] = {
        ...initialState[sId],
        rawObservations: '',
        soap: { subjective: initialNote.subjective, objective: initialNote.objective, assessment: initialNote.assessment, plan: initialNote.plan },
        selectedPlanId: initialNote.lessonPlanId || '',
        parentLetter: initialNote.parentGuide || '',
        cuingLevel: initialNote.metrics?.cuingLevel || 'Moderate',
        setting: initialNote.metrics?.setting || 'Structured',
        selectedGoalText: initialNote.metrics?.focusGoalId || initialState[sId].selectedGoalText,
        correctTally: initialNote.metrics?.accuracy || 0,
        incorrectTally: 0
      };
    }
    setSessionStates(initialState);
    if (studentsInGroup[0]) setActiveStudentId(studentsInGroup[0].id);
  }, [studentsInGroup, initialNote, initialLessonPlanId]);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [liveTranscript, currentTranscription]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const updateState = (id: string, updates: Partial<StudentSessionState>) => {
    setSessionStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const handleCuingAnalysis = async () => {
    const student = studentsInGroup.find(s => s.id === activeStudentId);
    const state = sessionStates[activeStudentId];
    if (!student || !state) return;

    setIsAnalyzingCuing(true);
    setCuingAnalysisResult(null);
    setShowCuingAnalysisModal(true);

    try {
      const result = await analyzeCuingHierarchy(
        student.name,
        state.selectedGoalText,
        liveTranscript,
        {
          correctTally: state.correctTally,
          incorrectTally: state.incorrectTally,
          cuingLevel: state.cuingLevel
        }
      );
      setCuingAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingCuing(false);
    }
  };

  const toggleLiveAssistant = async () => {
    if (liveStatus !== 'idle') {
      setLiveStatus('idle');
      if (sessionRef.current) sessionRef.current.close();
      return;
    }

    try {
      setLiveStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let transcriptBuffer = "";
      const studentNames = studentsInGroup.map(s => s.name).join(', ');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: `You are the Session Assistant for SLP ${userName}. 
          Tracking group: ${studentNames}. 
          You are an invisible observer. Never speak audio output. 
          Use tools to help the SLP document. When you hear a student perform a task correctly or incorrectly based on the SLP's feedback, call record_trial.
          If the SLP mentions a specific observation for a student, call add_observation.
          If the SLP mentions changing the level of help for a student (Independent, Minimal, Moderate, Maximal), call update_cuing_level.`,
          tools: [{
            functionDeclarations: [
              { name: 'record_trial', parameters: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, status: { type: Type.STRING, enum: ['correct', 'incorrect'] } }, required: ['student_name', 'status'] } },
              { name: 'add_observation', parameters: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, text: { type: Type.STRING } }, required: ['student_name', 'text'] } },
              { name: 'update_cuing_level', parameters: { type: Type.OBJECT, properties: { student_name: { type: Type.STRING }, level: { type: Type.STRING, enum: ['Maximal', 'Moderate', 'Minimal', 'Independent'] } }, required: ['student_name', 'level'] } }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            setLiveStatus('active');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const chunk = message.serverContent.inputTranscription.text;
              transcriptBuffer += chunk;
              setCurrentTranscription(transcriptBuffer);
              if (message.serverContent.turnComplete) {
                if (transcriptBuffer.trim()) setLiveTranscript(prev => [...prev.slice(-30), transcriptBuffer.trim()]);
                transcriptBuffer = "";
                setCurrentTranscription("");
              }
            }
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const targetStudent = studentsInGroup.find(s => s.name.toLowerCase().includes(fc.args.student_name.toLowerCase()));
                if (targetStudent) {
                  if (fc.name === 'record_trial') {
                    const status = fc.args.status;
                    setSessionStates(prev => {
                      const st = prev[targetStudent.id];
                      return { 
                        ...prev, 
                        [targetStudent.id]: { 
                          ...st, 
                          [status === 'correct' ? 'correctTally' : 'incorrectTally']: (st[status === 'correct' ? 'correctTally' : 'incorrectTally'] || 0) + 1 
                        } 
                      };
                    });
                    setFlashTally({ studentId: targetStudent.id, type: status as any });
                    setTimeout(() => setFlashTally(null), 800);
                  }
                  if (fc.name === 'add_observation') {
                    setSessionStates(prev => {
                      const st = prev[targetStudent.id];
                      return { ...prev, [targetStudent.id]: { ...st, rawObservations: (st.rawObservations || '') + (st.rawObservations ? '\n' : '') + `• ${fc.args.text}` } };
                    });
                  }
                  if (fc.name === 'update_cuing_level') {
                    setSessionStates(prev => ({ ...prev, [targetStudent.id]: { ...prev[targetStudent.id], cuingLevel: fc.args.level } }));
                    setFlashCuing(targetStudent.id);
                    setTimeout(() => setFlashCuing(null), 2500);
                  }
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
              }
            }
          },
          onclose: () => setLiveStatus('idle'),
          onerror: () => setLiveStatus('idle')
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setLiveStatus('idle');
    }
  };

  const handleAiAssist = async () => {
    const currentState = sessionStates[activeStudentId];
    if (!currentState?.rawObservations || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const result = await helpWithSoapNote(currentState.rawObservations);
      updateState(activeStudentId, { soap: result });
    } catch (error) {
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAll = () => {
    const notesToSave = studentsInGroup.map(s => {
      const st = sessionStates[s.id];
      const total = st.correctTally + st.incorrectTally;
      const accuracy = total > 0 ? Math.round((st.correctTally / total) * 100) : 0;
      return {
        id: initialNote?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        studentId: s.id,
        lessonPlanId: st.selectedPlanId || undefined,
        date: initialNote?.date || new Date().toISOString().split('T')[0],
        ...st.soap,
        parentGuide: st.parentLetter,
        metrics: total > 0 ? { accuracy, totalTrials: total, cuingLevel: st.cuingLevel, setting: st.setting, focusGoalId: st.selectedGoalText } : undefined
      };
    });
    onSaveNotes(notesToSave);
  };

  const insertTally = () => {
    const st = sessionStates[activeStudentId];
    const total = st.correctTally + st.incorrectTally;
    const percentage = total > 0 ? Math.round((st.correctTally / total) * 100) : 0;
    const goalInfo = st.selectedGoalText ? `for goal "${st.selectedGoalText}" ` : "";
    const tallyString = `Performance ${goalInfo}: ${st.correctTally}/${total} (${percentage}% accuracy) with ${st.cuingLevel.toLowerCase()} cues in a ${st.setting.toLowerCase()} setting. `;
    updateState(activeStudentId, { soap: { ...st.soap, objective: (st.soap.objective || '') + tallyString } });
  };

  const toggleLocalSelection = (id: string) => {
    setLocallySelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // If no students are selected, show a mandatory selection screen
  if (studentsInGroup.length === 0) {
    const filteredStudents = allStudents.filter(s => s.isActive !== false && s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 p-12">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-users-medical text-indigo-500 text-3xl"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Session Setup</h2>
            <p className="text-slate-500 font-medium">Select students to initiate a clinical group workspace.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="text" 
                placeholder="Search active caseload..." 
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-slate-900 shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
               <button 
                onClick={() => setLocallySelectedIds(filteredStudents.map(s => s.id))}
                className="px-4 py-2 text-[10px] font-black text-indigo-600 bg-indigo-50 rounded-xl uppercase hover:bg-indigo-100"
               >
                 Select All
               </button>
               <button 
                onClick={() => setLocallySelectedIds([])}
                className="px-4 py-2 text-[10px] font-black text-slate-500 bg-slate-100 rounded-xl uppercase hover:bg-slate-200"
               >
                 Clear
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar mb-10">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">
                <i className="fas fa-user-slash block text-4xl mb-4 opacity-20"></i>
                No students matching your search criteria.
              </div>
            ) : filteredStudents.map(s => {
              const isSelected = locallySelectedIds.includes(s.id);
              return (
                <button 
                  key={s.id} 
                  onClick={() => toggleLocalSelection(s.id)}
                  className={`p-5 rounded-2xl text-left transition-all group flex items-center gap-4 border-2 shadow-sm ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                    {isSelected ? <i className="fas fa-check"></i> : s.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{s.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade {s.grade}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button 
            disabled={locallySelectedIds.length === 0}
            onClick={() => onSelectStudents(locallySelectedIds)}
            className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 ${locallySelectedIds.length > 0 ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
          >
            <i className="fas fa-play-circle text-xl"></i>
            {locallySelectedIds.length === 0 ? 'Select Students to Begin' : `Start Session with ${locallySelectedIds.length} Student${locallySelectedIds.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    );
  }

  const activeState = sessionStates[activeStudentId] || { soap: {}, correctTally: 0, incorrectTally: 0, cuingLevel: 'Moderate', setting: 'Structured', selectedGoalText: '', rawObservations: '', parentLetter: '' };
  const cuingConfigs = { Maximal: "bg-rose-600 border-rose-400 text-white", Moderate: "bg-amber-500 border-amber-300 text-white", Minimal: "bg-emerald-600 border-emerald-400 text-white", Independent: "bg-blue-600 border-blue-400 text-white" };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20 max-w-[1600px] mx-auto px-4">
      
      {/* GLOBAL SESSION HEADER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl flex flex-wrap justify-between items-center gap-6 no-print border-b-4 border-indigo-500">
        <div className="flex items-center gap-6">
          <div className="flex -space-x-3">
            {studentsInGroup.map(s => (
              <div key={s.id} className={`w-12 h-12 rounded-xl border-4 border-slate-900 flex items-center justify-center font-black text-xs transition-all ${activeStudentId === s.id ? 'bg-indigo-500 text-white scale-110' : 'bg-slate-700 text-slate-400'}`}>
                {s.name.charAt(0)}
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-[0.2em]">{studentsInGroup.length > 1 ? 'Group Clinical Session' : 'Individual Clinical Session'}</h4>
            <div className="flex items-center gap-3 mt-1">
              <span className={`w-2 h-2 rounded-full ${liveStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {liveStatus === 'active' ? 'AI Assistant is monitoring the group' : 'AI Assistant is Offline'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLiveAssistant} 
            className={`px-8 py-4 rounded-2xl text-xs font-black transition-all flex items-center gap-3 shadow-xl ${liveStatus === 'active' ? 'bg-rose-600 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
          >
            <i className={`fas ${liveStatus === 'active' ? 'fa-microphone' : liveStatus === 'connecting' ? 'fa-spinner fa-spin' : 'fa-microphone-slash'}`}></i>
            {liveStatus === 'active' ? 'Stop Assistant' : liveStatus === 'connecting' ? 'Connecting...' : 'Start Assistant'}
          </button>
          
          <button 
            onClick={handleSaveAll} 
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-xl flex items-center gap-3"
          >
            <i className="fas fa-check-double"></i> Finalize Session
          </button>
        </div>
      </div>

      {/* TABS (Student Workspace) */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        {studentsInGroup.map(s => {
          const isFlashing = flashTally?.studentId === s.id;
          return (
            <button 
              key={s.id} 
              onClick={() => setActiveStudentId(s.id)}
              className={`px-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-md relative overflow-hidden ${activeStudentId === s.id ? 'bg-indigo-700 text-white scale-105 ring-4 ring-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-400'}`}
            >
              {isFlashing && (
                <div className={`absolute inset-0 opacity-20 animate-pulse ${flashTally?.type === 'correct' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeStudentId === s.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-700'}`}>{s.name.charAt(0)}</div>
              <span>{s.name.split(' ')[0]}</span>
              {sessionStates[s.id]?.correctTally + sessionStates[s.id]?.incorrectTally > 0 && (
                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[9px]">{sessionStates[s.id].correctTally + sessionStates[s.id].incorrectTally} Trials</span>
              )}
            </button>
          );
        })}
        <button 
          onClick={() => onSelectStudents([])}
          className="px-5 py-4 rounded-2xl bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 flex items-center gap-2 transition-all"
          title="Add/Edit Students in Session"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
        <div className="md:col-span-7 lg:col-span-8 space-y-8">
          
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
               <h4 className="font-black text-xl flex items-center gap-3 text-indigo-400">
                <i className="fas fa-chart-line"></i> {studentsInGroup.find(s=>s.id===activeStudentId)?.name.split(' ')[0]}'s Workspace
              </h4>
              <button onClick={() => setShowLetterModal(true)} className="px-5 py-2.5 rounded-xl text-[10px] font-black border-2 border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-white transition-all flex items-center gap-2"><i className="fas fa-home"></i> Home Guide</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Primary Target Goal</label>
                 <select className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-xs font-black text-white outline-none" value={activeState.selectedGoalText} onChange={(e) => updateState(activeStudentId, { selectedGoalText: e.target.value })}>
                   {studentsInGroup.find(s=>s.id===activeStudentId)?.goals.map((g, i) => <option key={i} value={g.text}>{g.text}</option>)}
                 </select>
              </div>
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Lesson Plan</label>
                 <select className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-3 text-xs font-black text-white outline-none" value={activeState.selectedPlanId} onChange={(e) => updateState(activeStudentId, { selectedPlanId: e.target.value })}>
                   <option value="">None Selected</option>
                   {lessonPlans.map((p, i) => <option key={i} value={p.id}>{p.title}</option>)}
                 </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button onClick={() => updateState(activeStudentId, { correctTally: activeState.correctTally + 1 })} className={`p-6 rounded-[2.5rem] text-center active:scale-95 transition-all border-2 ${flashTally?.studentId === activeStudentId && flashTally.type === 'correct' ? 'bg-emerald-500 border-white scale-105 shadow-emerald-500/50 shadow-2xl' : 'bg-emerald-600/10 border-emerald-500/20'}`}>
                <p className={`text-6xl font-black ${flashTally?.studentId === activeStudentId && flashTally.type === 'correct' ? 'text-white' : 'text-emerald-400'}`}>{activeState.correctTally}</p>
                <p className="text-[10px] font-black uppercase mt-3 tracking-widest text-emerald-300/50">Correct</p>
              </button>
              <button onClick={() => updateState(activeStudentId, { incorrectTally: activeState.incorrectTally + 1 })} className={`p-6 rounded-[2.5rem] text-center active:scale-95 transition-all border-2 ${flashTally?.studentId === activeStudentId && flashTally.type === 'incorrect' ? 'bg-rose-500 border-white scale-105 shadow-rose-500/50 shadow-2xl' : 'bg-rose-600/10 border-rose-500/20'}`}>
                <p className={`text-6xl font-black ${flashTally?.studentId === activeStudentId && flashTally.type === 'incorrect' ? 'text-white' : 'text-rose-400'}`}>{activeState.incorrectTally}</p>
                <p className="text-[10px] font-black uppercase mt-3 tracking-widest text-rose-300/50">Incorrect</p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-slate-800 pt-8 mb-8">
              <div className={flashCuing === activeStudentId ? 'ring-4 ring-indigo-500 rounded-2xl p-2 animate-pulse' : ''}>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuing Hierarchy</label>
                  <button 
                    onClick={handleCuingAnalysis}
                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase transition-colors"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i> AI Assessment
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Maximal', 'Moderate', 'Minimal', 'Independent'] as CuingLevel[]).map(level => (
                    <button key={level} onClick={() => updateState(activeStudentId, { cuingLevel: level })} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${activeState.cuingLevel === level ? cuingConfigs[level] : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{level}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Task Setting</label>
                <div className="flex bg-slate-800 p-1.5 rounded-2xl border-2 border-slate-700">
                  {(['Structured', 'Spontaneous'] as TaskSetting[]).map(s => (s === 'Structured' || s === 'Spontaneous') && (
                    <button key={s} onClick={() => updateState(activeStudentId, { setting: s })} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase transition-all ${activeState.setting === s ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={insertTally} className="w-full py-5 bg-indigo-700 hover:bg-indigo-800 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3">
              <i className="fas fa-sync-alt"></i> Insert Metrics into Report (O)
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
            <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3">
              <i className="fas fa-brain text-indigo-700"></i> Narrative Observations
            </h4>
            <textarea 
              className="w-full min-h-[250px] p-8 bg-white border-2 border-slate-200 text-slate-900 font-medium leading-relaxed resize-none shadow-sm mb-6 text-base outline-none focus:ring-4 focus:ring-indigo-50 placeholder:italic" 
              placeholder="Session notes or transcription observations appear here..." 
              value={activeState.rawObservations} 
              onChange={(e) => updateState(activeStudentId, { rawObservations: e.target.value })}
            ></textarea>
            <button onClick={handleAiAssist} disabled={isAiLoading || !activeState.rawObservations} className={`w-full py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 shadow-lg ${isAiLoading ? 'bg-indigo-400' : 'bg-indigo-700 hover:bg-indigo-800 transition-all active:scale-[0.98]'}`}>
              {isAiLoading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              Synthesize SOAP Draft for {studentsInGroup.find(s=>s.id===activeStudentId)?.name.split(' ')[0]}
            </button>
          </div>
        </div>

        {/* PERSISTENT SIDEBAR FOR TRANSCRIPTION */}
        <div className="md:col-span-5 lg:col-span-4 h-full sticky top-24 no-print">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-indigo-500 shadow-2xl flex flex-col gap-6 h-[750px] max-h-[85vh]">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${liveStatus === 'active' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-800'}`}>
                <i className={`fas ${liveStatus === 'active' ? 'fa-terminal' : 'fa-microphone-slash'} text-white`}></i>
              </div>
              <div>
                <p className="text-[10px] text-white font-black uppercase tracking-widest">Assistant Console</p>
                <p className="text-[9px] text-slate-500 font-bold">{liveStatus === 'active' ? 'Syncing audio markers...' : 'Awaiting initialization'}</p>
              </div>
            </div>
            
            <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 text-xs">
              {liveTranscript.length === 0 && !currentTranscription && (
                <div className="py-20 text-center text-slate-600 font-medium italic">
                  Turn on the Assistant to begin real-time session tracking.
                </div>
              )}
              {liveTranscript.map((t, i) => (
                <div key={i} className={`p-4 rounded-2xl leading-relaxed ${t.includes('AI Assessment') ? 'bg-indigo-950 text-indigo-100 font-black' : 'bg-slate-800/40 text-slate-300 font-medium'}`}>{t}</div>
              ))}
              {currentTranscription && <div className="p-4 bg-slate-800/10 rounded-2xl text-slate-500 animate-pulse italic">{currentTranscription}...</div>}
            </div>
            
            <div className="pt-4 border-t border-slate-800">
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Data linked to {studentsInGroup.length} students</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-10">
        <h4 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <i className="fas fa-file-signature text-indigo-700"></i> {studentsInGroup.find(s=>s.id===activeStudentId)?.name}'s SOAP Record
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[
            {label: "Subjective (S)", key: "subjective" as const, icon: "fa-user-chat"},
            {label: "Objective (O)", key: "objective" as const, icon: "fa-chart-simple"},
            {label: "Assessment (A)", key: "assessment" as const, icon: "fa-file-medical-alt"},
            {label: "Plan (P)", key: "plan" as const, icon: "fa-route"}
          ].map(s => (
            <section key={s.key} className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><i className={`fas ${s.icon}`}></i> {s.label}</label>
              <textarea 
                className="w-full h-48 p-6 rounded-[2rem] border-2 border-slate-200 bg-white text-slate-900 font-medium text-sm outline-none focus:ring-4 focus:ring-indigo-50" 
                value={(activeState.soap as any)[s.key]} 
                onChange={(e) => updateState(activeStudentId, { soap: { ...activeState.soap, [s.key]: e.target.value } })}
              ></textarea>
            </section>
          ))}
        </div>
      </div>

      {/* Hierarchy of Cuing Analysis Modal */}
      {showCuingAnalysisModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-indigo-700 p-8 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black">Hierarchy of Cuing Assessment</h3>
              <button onClick={() => setShowCuingAnalysisModal(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {isAnalyzingCuing ? (
                <div className="py-20 text-center">
                  <i className="fas fa-brain fa-spin text-4xl text-indigo-600 mb-6"></i>
                  <p className="font-black text-slate-900">Gemini is analyzing session dynamics...</p>
                  <p className="text-xs text-slate-500 mt-2">Processing trials and verbal cues.</p>
                </div>
              ) : cuingAnalysisResult ? (
                <div className="animate-in fade-in duration-500">
                  <section className="mb-8">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Clinical Scaffolding Assessment</h5>
                    <p className="text-slate-700 font-medium leading-relaxed bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                      {cuingAnalysisResult.assessment}
                    </p>
                  </section>

                  <section>
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Future Recommendations</h5>
                    <div className="space-y-3">
                      {cuingAnalysisResult.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                          <p className="text-xs font-bold text-slate-800 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="py-12 text-center text-rose-500 font-black">Failed to analyze cuing. Please try again.</div>
              )}
            </div>
            
            <div className="p-8 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setShowCuingAnalysisModal(false)} className="px-10 py-4 bg-indigo-700 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-800 transition-all active:scale-95">Close Report</button>
            </div>
          </div>
        </div>
      )}

      {showLetterModal && <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-amber-600 p-8 text-white flex justify-between items-center shrink-0">
            <h3 className="text-xl font-black">Parent Practice Guide: {studentsInGroup.find(s=>s.id===activeStudentId)?.name}</h3>
            <button onClick={() => setShowLetterModal(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center no-print"><i className="fas fa-times"></i></button>
          </div>
          <div className="flex-1 overflow-y-auto p-10">
            <textarea 
              className="w-full h-80 p-8 bg-white border-2 border-amber-200 rounded-[2rem] font-medium leading-relaxed text-lg text-slate-900 outline-none focus:ring-4 focus:ring-amber-200 shadow-sm no-print" 
              value={activeState.parentLetter} 
              onChange={(e) => updateState(activeStudentId, { parentLetter: e.target.value })} 
              placeholder="Share home practice drills..."
            ></textarea>
            <div className="hidden print:block whitespace-pre-wrap font-medium text-lg">{activeState.parentLetter}</div>
          </div>
          <div className="p-8 bg-slate-50 border-t flex justify-center gap-6 no-print">
            <button onClick={() => setShowLetterModal(false)} className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95">Discard</button>
            <button onClick={() => window.print()} className="px-10 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl active:scale-95"><i className="fas fa-print mr-2"></i> Print Guide</button>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default NoteEditor;
