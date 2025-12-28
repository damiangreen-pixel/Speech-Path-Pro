
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, SOAPNote, CuingLevel, TaskSetting, LessonPlan, SessionMetrics } from '../types';
import { helpWithSoapNote, generateStimuli } from '../services/gemini';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

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

const MAX_HISTORY = 10;

const StudentAvatarMini: React.FC<{ student: Student; isActive?: boolean }> = ({ student, isActive }) => {
  if (student.customAvatarUrl) {
    return (
      <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${isActive ? 'scale-110 border-indigo-400 shadow-lg z-10' : 'border-slate-800 opacity-50'}`}>
        <img src={student.customAvatarUrl} alt={student.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const config = student.avatarConfig || { bgColor: 'bg-indigo-500', shape: 'rounded', icon: 'fa-user' };
  return (
    <div className={`w-10 h-10 ${config.bgColor} rounded-xl border-2 transition-all flex items-center justify-center text-white text-xs ${isActive ? 'scale-110 border-indigo-400 shadow-lg z-10' : 'border-slate-800 opacity-50'}`}>
      <i className={`fas ${config.icon}`}></i>
    </div>
  );
};

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
  const [sessionStates, setSessionStates] = useState<{ [id: string]: any }>({});
  const [historyStacks, setHistoryStacks] = useState<{ [id: string]: any[] }>({});
  const [isAssistantActive, setIsAssistantActive] = useState(false);
  const [isDraftingSoap, setIsDraftingSoap] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    const initialState: { [id: string]: any } = {};
    const initialHistory: { [id: string]: any[] } = {};

    studentsInGroup.forEach(s => {
      if (sessionStates[s.id]) return;

      const primaryGoal = s.goals.find(g => g.isPrimary)?.text || s.goals[0]?.text || '';
      
      if (initialNote && initialNote.studentId === s.id) {
        initialState[s.id] = {
          rawObservations: '',
          soap: {
            subjective: initialNote.subjective,
            objective: initialNote.objective,
            assessment: initialNote.assessment,
            plan: initialNote.plan
          },
          correctTally: initialNote.metrics?.totalTrials ? Math.round((initialNote.metrics.accuracy / 100) * initialNote.metrics.totalTrials) : 0,
          incorrectTally: initialNote.metrics?.totalTrials ? initialNote.metrics.totalTrials - Math.round((initialNote.metrics.accuracy / 100) * initialNote.metrics.totalTrials) : 0,
          cuingLevel: initialNote.metrics?.cuingLevel || 'Moderate',
          setting: initialNote.metrics?.setting || 'Structured',
          selectedGoalText: initialNote.metrics?.focusGoalId || primaryGoal,
          selectedPlanId: initialNote.lessonPlanId || initialLessonPlanId || '',
          stimuli: null
        };
      } else {
        initialState[s.id] = {
          rawObservations: '',
          soap: { subjective: '', objective: '', assessment: '', plan: '' },
          correctTally: 0,
          incorrectTally: 0,
          cuingLevel: 'Moderate',
          setting: 'Structured',
          selectedGoalText: primaryGoal,
          selectedPlanId: initialLessonPlanId || '',
          stimuli: null
        };
      }
      initialHistory[s.id] = [];
    });

    setSessionStates(prev => ({ ...initialState, ...prev }));
    setHistoryStacks(prev => ({ ...initialHistory, ...prev }));
    if (!activeStudentId && studentsInGroup[0]) setActiveStudentId(studentsInGroup[0].id);
  }, [studentsInGroup, initialNote, initialLessonPlanId]);

  const saveHistorySnapshot = (id: string) => {
    const currentState = sessionStates[id];
    if (!currentState) return;
    
    setHistoryStacks(prev => {
      const stack = prev[id] || [];
      const newStack = [JSON.parse(JSON.stringify(currentState)), ...stack].slice(0, MAX_HISTORY);
      return { ...prev, [id]: newStack };
    });
  };

  const handleUndo = (id: string) => {
    const stack = historyStacks[id];
    if (!stack || stack.length === 0) return;

    const previousState = stack[0];
    const remainingStack = stack.slice(1);

    setSessionStates(prev => ({ ...prev, [id]: previousState }));
    setHistoryStacks(prev => ({ ...prev, [id]: remainingStack }));
  };

  const updateState = (id: string, updates: any, skipHistory: boolean = false) => {
    setSessionStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const activeStudent = studentsInGroup.find(s => s.id === activeStudentId);
  const activeState = sessionStates[activeStudentId] || { 
    soap: { subjective: '', objective: '', assessment: '', plan: '' }, 
    correctTally: 0, 
    incorrectTally: 0, 
    cuingLevel: 'Moderate',
    setting: 'Structured',
    selectedGoalText: '',
    rawObservations: ''
  };

  const handleDraftSoap = async () => {
    if (!activeState.rawObservations && activeState.correctTally + activeState.incorrectTally === 0) {
      alert("Please enter some observations or tally data first.");
      return;
    }
    
    saveHistorySnapshot(activeStudentId);
    setIsDraftingSoap(true);
    
    try {
      const context = `Context: ${activeState.rawObservations}. Data: ${activeState.correctTally}/${activeState.correctTally + activeState.incorrectTally} correct. Support: ${activeState.cuingLevel}. Goal: ${activeState.selectedGoalText}`;
      const draft = await helpWithSoapNote(context);
      updateState(activeStudentId, { soap: draft }, true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDraftingSoap(false);
    }
  };

  const handleFetchStimuli = async () => {
    if (!activeState.selectedGoalText) return;
    updateState(activeStudentId, { isStimuliLoading: true });
    try {
      const res = await generateStimuli(activeState.selectedGoalText, activeStudent?.grade || 'Generic');
      updateState(activeStudentId, { stimuli: res });
    } catch (e) {
      console.error(e);
    } finally {
      updateState(activeStudentId, { isStimuliLoading: false });
    }
  };

  const startAssistant = async () => {
    if (isAssistantActive) {
      setIsAssistantActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const session = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsAssistantActive(true);
            const context = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              
              let b64 = '';
              const bytes = new Uint8Array(int16.buffer);
              for (let i = 0; i < bytes.byteLength; i++) b64 += String.fromCharCode(bytes[i]);
              
              sessionPromiseRef.current?.then(s => {
                s.sendRealtimeInput({
                  media: { data: btoa(b64), mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            
            source.connect(processor);
            processor.connect(context.destination);
          },
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              setSessionStates(prev => {
                const s = prev[activeStudentId];
                if (!s) return prev;
                return {
                  ...prev,
                  [activeStudentId]: { ...s, rawObservations: (s.rawObservations || "") + " " + text }
                };
              });
            }
          },
          onclose: () => setIsAssistantActive(false),
          onerror: () => setIsAssistantActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "You are a speech therapy assistant. Listen to the session and help the therapist by transcribing session observations. Be professional and encouraging."
        }
      });
      
      sessionPromiseRef.current = Promise.resolve(session);
    } catch (e) {
      console.error("Mic access failed", e);
    }
  };

  const handleFinalize = () => {
    const finalNotes: Omit<SOAPNote, 'createdAt' | 'createdBy'>[] = studentsInGroup.map(s => {
      const st = sessionStates[s.id] || { soap: {}, correctTally: 0, incorrectTally: 0, cuingLevel: 'Moderate', setting: 'Structured', selectedGoalText: '' };
      const total = st.correctTally + st.incorrectTally;
      const accuracy = total > 0 ? Math.round((st.correctTally / total) * 100) : 0;
      
      return {
        id: initialNote?.id && initialNote.studentId === s.id ? initialNote.id : Date.now().toString() + "-" + s.id,
        studentId: s.id,
        date: initialNote?.date || new Date().toISOString().split('T')[0],
        subjective: st.soap.subjective || '',
        objective: st.soap.objective || '',
        assessment: st.soap.assessment || '',
        plan: st.soap.plan || '',
        lessonPlanId: st.selectedPlanId || undefined,
        metrics: {
          accuracy,
          totalTrials: total,
          cuingLevel: st.cuingLevel,
          setting: st.setting,
          focusGoalId: st.selectedGoalText
        }
      };
    });

    onSaveNotes(finalNotes);
  };

  const toggleStudentInGroup = (id: string) => {
    const currentIds = studentsInGroup.map(s => s.id);
    if (currentIds.includes(id)) {
      onSelectStudents(currentIds.filter(sid => sid !== id));
      if (activeStudentId === id) {
        const remaining = currentIds.filter(sid => sid !== id);
        setActiveStudentId(remaining[0] || '');
      }
    } else {
      onSelectStudents([...currentIds, id]);
    }
  };

  const filteredCaseload = allStudents.filter(s => 
    s.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  if (studentsInGroup.length === 0) return null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-24 max-w-[1400px] mx-auto relative px-4">
      
      <div className="bg-[#0f172a] rounded-[2rem] p-6 shadow-2xl border-b-4 border-indigo-500 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="flex -space-x-4">
            {studentsInGroup.map(s => (
              <StudentAvatarMini key={s.id} student={s} isActive={activeStudentId === s.id} />
            ))}
          </div>
          <div>
            <h4 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-microchip text-indigo-400"></i> Session Workspace
            </h4>
            <p className="text-[10px] text-slate-400 font-black uppercase mt-1">
              {initialNote ? `Editing Record: ${initialNote.date}` : `Active Session • ${studentsInGroup.length} Students`}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-stretch gap-3 w-full lg:w-auto">
          <button onClick={onCancelEdit} className="flex-1 lg:flex-none px-6 py-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
            Cancel
          </button>
          <button 
            onClick={startAssistant}
            className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${isAssistantActive ? 'bg-rose-600 text-white animate-pulse' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
          >
            <i className={`fas ${isAssistantActive ? 'fa-microphone' : 'fa-microphone-slash'}`}></i> 
            {isAssistantActive ? 'Assistant Listening' : 'Start Assistant'}
          </button>
          <button 
            onClick={handleFinalize}
            className="flex-1 lg:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <i className="fas fa-check-double"></i> {initialNote ? 'Save Updates' : 'Finalize Session'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {studentsInGroup.map(s => (
          <button 
            key={s.id} 
            onClick={() => setActiveStudentId(s.id)} 
            className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-4 shadow-sm border-2 ${activeStudentId === s.id ? 'bg-indigo-700 text-white border-indigo-500 scale-105 z-10' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] ${activeStudentId === s.id ? 'bg-white/20' : 'bg-slate-100'}`}>
              {s.name.charAt(0)}
            </div>
            <span>{s.name}</span>
          </button>
        ))}
        <button onClick={() => setIsGroupPickerOpen(true)} className="px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase hover:bg-indigo-100 border-2 border-indigo-100 transition-all flex items-center gap-2">
          <i className="fas fa-plus-circle"></i> Adjust Group
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-7 space-y-8">
          <div className="bg-[#1e293b] p-8 rounded-[2.5rem] shadow-2xl text-white border-2 border-slate-800">
            <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-6 flex items-center gap-2">
              <i className="fas fa-chart-line"></i> Performance Metrics
            </h5>
            <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => updateState(activeStudentId, { correctTally: activeState.correctTally + 1 })}
                className="group relative p-8 rounded-[2rem] bg-emerald-500/5 border-2 border-emerald-500/20 text-center active:scale-95 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40"
              >
                <div className="absolute top-4 right-6 text-emerald-500/30 text-xs font-black uppercase">Correct</div>
                <p className="text-7xl font-black text-emerald-400 leading-none">{activeState.correctTally}</p>
                <div className="mt-4 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-3 bg-emerald-500/20 rounded-full"></div>)}
                </div>
              </button>
              <button 
                onClick={() => updateState(activeStudentId, { incorrectTally: activeState.incorrectTally + 1 })}
                className="group relative p-8 rounded-[2rem] bg-rose-500/5 border-2 border-rose-500/20 text-center active:scale-95 transition-all hover:bg-rose-500/10 hover:border-rose-500/40"
              >
                <div className="absolute top-4 right-6 text-rose-500/30 text-xs font-black uppercase">Incorrect</div>
                <p className="text-7xl font-black text-rose-400 leading-none">{activeState.incorrectTally}</p>
                <div className="mt-4 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-3 bg-rose-500/20 rounded-full"></div>)}
                </div>
              </button>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-6 justify-between pt-8 border-t border-slate-700/50">
              <div className="flex gap-4 items-center">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Support:</p>
                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    {['Maximal', 'Moderate', 'Minimal', 'Independent'].map(lvl => (
                      <button 
                        key={lvl} 
                        onClick={() => updateState(activeStudentId, { cuingLevel: lvl })}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeState.cuingLevel === lvl ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {lvl.slice(0, 3)}
                      </button>
                    ))}
                  </div>
              </div>
              <button 
                onClick={() => updateState(activeStudentId, { correctTally: 0, incorrectTally: 0 })}
                className="text-[9px] font-black uppercase text-slate-500 hover:text-rose-400 transition-colors"
              >
                Reset Tallies
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Observations</h5>
                    {historyStacks[activeStudentId]?.length > 0 && (
                      <button 
                        onClick={() => handleUndo(activeStudentId)}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm"
                        title="Undo last change / Restore previous draft"
                      >
                        <i className="fas fa-undo"></i> Undo
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={handleDraftSoap}
                    disabled={isDraftingSoap}
                    className="bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-800 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isDraftingSoap ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                    Draft SOAP Note
                  </button>
              </div>
              
              <textarea 
                className="w-full bg-slate-50 p-6 rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:bg-white text-base font-medium leading-relaxed text-slate-800 outline-none transition-all min-h-[120px] shadow-inner"
                placeholder="Type or use Assistant to record session observations..."
                value={activeState.rawObservations}
                onChange={(e) => updateState(activeStudentId, { rawObservations: e.target.value }, true)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['subjective', 'objective', 'assessment', 'plan'] as const).map(part => (
                    <div key={part} className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest ml-1">{part}</label>
                      <textarea 
                        className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 focus:bg-white focus:border-indigo-200 text-sm font-medium text-slate-700 outline-none transition-all resize-none h-32"
                        value={activeState.soap[part]}
                        onChange={(e) => updateState(activeStudentId, { soap: { ...activeState.soap, [part]: e.target.value } }, true)}
                        placeholder={`Drafting ${part} interpretation...`}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6 flex items-center gap-2">
              <i className="fas fa-bullseye text-rose-500"></i> Active IEP Objective
            </h5>
            <select 
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-indigo-600 outline-none shadow-sm cursor-pointer appearance-none"
              value={activeState.selectedGoalText}
              onChange={(e) => updateState(activeStudentId, { selectedGoalText: e.target.value })}
            >
              {activeStudent?.goals.map((g, i) => (
                <option key={i} value={g.text}>{g.isPrimary ? '★ ' : ''}{g.text}</option>
              ))}
              <option value="adhoc">Other / Ad-hoc Goal...</option>
            </select>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white border-2 border-indigo-500/20">
            <div className="flex justify-between items-center mb-8">
              <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Session Stimuli</h5>
              <button 
                onClick={handleFetchStimuli}
                disabled={activeState.isStimuliLoading}
                className="text-xs font-black text-white hover:text-indigo-400 transition-colors flex items-center gap-2"
              >
                <i className={`fas ${activeState.isStimuliLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                Generate New
              </button>
            </div>

            {activeState.stimuli ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 gap-2">
                    {activeState.stimuli.words.slice(0, 10).map((w: string, i: number) => (
                      <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-black text-center hover:bg-white/10 transition-colors cursor-pointer active:scale-95">{w}</div>
                    ))}
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-3">Target Story</p>
                    <p className="text-sm font-medium italic leading-relaxed text-slate-300">"{activeState.stimuli.story}"</p>
                  </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                  <i className="fas fa-comment-dots text-4xl text-slate-800 mb-4"></i>
                  <p className="text-slate-500 font-bold italic text-sm">Need ideas? Generate stimuli for this goal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isGroupPickerOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="bg-indigo-700 p-8 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-xl font-black">Adjust Group</h4>
                    <p className="text-[10px] font-black uppercase text-indigo-200 tracking-widest mt-1">Select students for this session</p>
                 </div>
                 <button onClick={() => setIsGroupPickerOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="fas fa-times text-xl"></i></button>
              </div>
              
              <div className="p-6 border-b shrink-0">
                 <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                      placeholder="Search roster..."
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                    />
                 </div>
              </div>

              <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar">
                 {filteredCaseload.map(s => {
                   const isSelected = studentsInGroup.some(sg => sg.id === s.id);
                   return (
                     <div 
                        key={s.id} 
                        onClick={() => toggleStudentInGroup(s.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                     >
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                              {s.name.charAt(0)}
                           </div>
                           <div>
                              <p className={`font-black text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Grade {s.grade} • {s.diagnoses[0] || 'No Diagnosis'}</p>
                           </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                           {isSelected && <i className="fas fa-check text-[10px]"></i>}
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div className="p-8 bg-slate-50 border-t shrink-0 flex justify-end items-center">
                 <button onClick={() => setIsGroupPickerOpen(false)} className="px-8 py-3 bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-800 transition-all">
                   Confirm Group
                 </button>
              </div>
           </div>
        </div>
      )}

      {isDraftingSoap && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-700 border-t-transparent animate-spin"></div>
              <p className="text-xl font-black text-slate-900">Synthesizing Professional Draft...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
