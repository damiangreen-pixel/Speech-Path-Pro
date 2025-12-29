
import React, { useState, useEffect } from 'react';
import { View, Student, SOAPNote, LessonPlan, Goal, UserProfile, AvatarConfig, SessionAppointment, TaskSetting, CuingLevel } from './types';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import NoteEditor from './components/NoteEditor';
import NoteList from './components/NoteList';
import LessonPlanner from './components/LessonPlanner';
import ProfileEditor from './components/ProfileEditor';
import CalendarView from './components/Calendar';
import Home from './components/Home';
import Onboarding from './components/Onboarding';

const COLORS = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500'];
const SHAPES: AvatarConfig['shape'][] = ['circle', 'rounded', 'squircle', 'hexagon'];
const ICONS = ['fa-star', 'fa-heart', 'fa-bolt', 'fa-brain', 'fa-child', 'fa-puzzle-piece', 'fa-sun', 'fa-music'];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewKey, setViewKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<SOAPNote[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [appointments, setAppointments] = useState<SessionAppointment[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [preselectedLessonPlanId, setPreselectedLessonPlanId] = useState<string | null>(null);
  const [autoOpenStudentForm, setAutoOpenStudentForm] = useState(false);
  const [initialStudentTab, setInitialStudentTab] = useState<'profile' | 'timeline' | 'decision-support'>('profile');
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Dana Green, MS, CCC-SLP',
    title: 'Speech-Language Pathologist',
    facility: 'Central School District',
    initials: 'DG'
  });

  const [availableDiagnoses, setAvailableDiagnoses] = useState<string[]>([
    'Articulation Disorder', 'Expressive Language Delay', 'Social Communication Disorder', 'Autism Spectrum Disorder',
    'Phonological Disorder', 'Fluency Disorder', 'Voice Disorder', 'Receptive Language Delay'
  ]);

  const [availableGoals, setAvailableGoals] = useState<string[]>([
    'Correct production of /r/ in all positions', 'Correct production of /s/ in conversational speech',
    'Improve phonological awareness skills', 'Use 3-word phrases to communicate wants/needs',
    'Follow 2-step directions consistently', 'Initiate conversation with peers',
    'Maintain topic for 3 turns in conversation', 'Use age-appropriate syntax in complex sentences',
    'Improve auditory processing speed', 'Identify and express basic emotions'
  ]);

  useEffect(() => {
    const savedData = localStorage.getItem('speechpath_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setStudents(parsed.students || []);
      setNotes(parsed.notes || []);
      setLessonPlans(parsed.lessonPlans || []);
      setAppointments(parsed.appointments || []);
      setAvailableDiagnoses(parsed.availableDiagnoses || availableDiagnoses);
      setAvailableGoals(parsed.availableGoals || availableGoals);
      if (parsed.userProfile) setUserProfile(parsed.userProfile);
    }
  }, []);

  useEffect(() => {
    const dataToSave = { students, notes, lessonPlans, appointments, availableDiagnoses, availableGoals, userProfile };
    localStorage.setItem('speechpath_data', JSON.stringify(dataToSave));
  }, [students, notes, lessonPlans, appointments, availableDiagnoses, availableGoals, userProfile]);

  const generateDefaultAvatar = (): AvatarConfig => ({
    bgColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    icon: ICONS[Math.floor(Math.random() * ICONS.length)]
  });

  const handleSeedSampleData = () => {
    if (students.find(s => s.name === "Leo Martinez")) {
      alert("Sample data already exists.");
      return;
    }

    const now = new Date();
    const timestamp = now.getTime();

    const idLeo = `leo-${timestamp}`;
    const idLucas = `lucas-${timestamp}`;
    const idLiam = `liam-${timestamp}`;
    const idJordan = `jordan-${timestamp}`;

    const newStudents: Student[] = [
      { id: idLeo, name: "Leo Martinez", grade: "3rd", isActive: true, severity: 8, functionalImpact: 9, diagnoses: ["Articulation Disorder"], goals: [{ text: "Correct production of /r/ in all positions", isPrimary: true }], createdAt: now.toISOString(), createdBy: userProfile.name, avatarConfig: { bgColor: 'bg-indigo-500', shape: 'squircle', icon: 'fa-star' } },
      { id: idLucas, name: "Lucas Vance", grade: "1st", isActive: true, severity: 4, functionalImpact: 3, diagnoses: ["Articulation Disorder"], goals: [{ text: "Correct production of /s/ in conversational speech", isPrimary: true }], createdAt: now.toISOString(), createdBy: userProfile.name, avatarConfig: { bgColor: 'bg-purple-500', shape: 'circle', icon: 'fa-bolt' } },
      { id: idLiam, name: "Liam O'Connor", grade: "5th", isActive: true, severity: 9, functionalImpact: 7, diagnoses: ["Fluency Disorder"], goals: [{ text: "Reduce physical tension during blocks", isPrimary: true }], createdAt: now.toISOString(), createdBy: userProfile.name, avatarConfig: { bgColor: 'bg-cyan-500', shape: 'hexagon', icon: 'fa-sun' } },
      { id: idJordan, name: "Jordan Smith", grade: "7th", isActive: true, severity: 6, functionalImpact: 8, diagnoses: ["Social Communication Disorder"], goals: [{ text: "Maintain topic for 3 turns", isPrimary: true }], createdAt: now.toISOString(), createdBy: userProfile.name, avatarConfig: { bgColor: 'bg-emerald-500', shape: 'hexagon', icon: 'fa-puzzle-piece' } }
    ];

    const generateNotes = (studentId: string, goal: string, startDaysAgo: number) => {
      const generated: SOAPNote[] = [];
      const baseAccuracy = Math.floor(Math.random() * 30) + 20;
      for (let i = 0; i < 8; i++) {
        const date = new Date(now.getTime() - (startDaysAgo - i * 7) * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        const accuracy = Math.min(95, baseAccuracy + (i * 8) + Math.floor(Math.random() * 10));
        const setting: TaskSetting = i % 2 === 0 ? 'Structured' : 'Spontaneous';
        const cuing: CuingLevel[] = ['Maximal', 'Moderate', 'Minimal', 'Independent'];
        generated.push({
          id: `note-${studentId}-${i}-${timestamp}`, studentId, date: dateStr, subjective: "Participated in session.", objective: `Produced targets with ${accuracy}% accuracy.`, assessment: "Continuing to progress.", plan: "Fade cues next session.",
          metrics: { accuracy: setting === 'Spontaneous' ? accuracy - 15 : accuracy, totalTrials: 20, cuingLevel: cuing[Math.min(3, Math.floor(i / 2))], setting, focusGoalId: goal },
          createdAt: date.toISOString(), createdBy: userProfile.name
        });
      }
      return generated;
    };

    const sampleNotes = [
      ...generateNotes(idLeo, "Correct production of /r/ in all positions", 56),
      ...generateNotes(idLucas, "Correct production of /s/ in conversational speech", 56),
      ...generateNotes(idLiam, "Reduce physical tension during blocks", 56),
      ...generateNotes(idJordan, "Maintain topic for 3 turns", 56)
    ];

    setStudents([...newStudents, ...students]);
    setNotes([...sampleNotes, ...notes]);
  };

  const handleNavigate = (view: View, openForm: boolean = false, keepSelection: boolean = false) => {
    setCurrentView(view); setViewKey(prev => prev + 1); setAutoOpenStudentForm(openForm); setIsSidebarOpen(false);
    if (view !== 'notes') {
        if (!keepSelection) setSelectedNoteId(null);
        setPreselectedLessonPlanId(null);
    }
    if (!keepSelection && (view === 'notes' || view === 'planner' || view === 'students')) { setSelectedStudentIds([]); }
  };

  const handleSelectNote = (studentId: string, noteId: string) => {
    setSelectedStudentIds([studentId]);
    setSelectedNoteId(noteId);
    handleNavigate('notes', false, true);
  };

  const handleOpenStudentRecord = (studentId: string, tab: 'profile' | 'timeline' | 'decision-support' = 'profile') => {
    setSelectedStudentIds([studentId]);
    setInitialStudentTab(tab);
    handleNavigate('students', false, true);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const withAudit = { ...updatedStudent, updatedAt: new Date().toISOString(), updatedBy: userProfile.name };
    setStudents(students.map(s => s.id === updatedStudent.id ? withAudit : s));
  };

  const handleArchiveStudent = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, isActive: false, updatedAt: new Date().toISOString(), updatedBy: userProfile.name } : s));
  };

  const handleRestoreStudent = (id: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, isActive: true, updatedAt: new Date().toISOString(), updatedBy: userProfile.name } : s));
  };

  const handleUpdateNote = (updatedNote: SOAPNote) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date().toISOString(), updatedBy: userProfile.name } : n));
  };

  const handleAddStudent = (newStudent: any) => {
    const withAudit: Student = { id: Date.now().toString(), isActive: true, severity: 5, functionalImpact: 5, ...newStudent, avatarConfig: newStudent.avatarConfig || generateDefaultAvatar(), createdAt: new Date().toISOString(), createdBy: userProfile.name };
    setStudents([...students, withAudit]); return withAudit;
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm("Delete student and all notes permanently?")) {
      setStudents(prev => prev.filter(s => s.id !== id)); setNotes(prev => prev.filter(n => n.studentId !== id)); setAppointments(prev => prev.filter(a => !a.studentIds.includes(id))); setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
    }
  };

  const handleAddNewDiagnosis = (diag: string) => { if (!availableDiagnoses.includes(diag)) setAvailableDiagnoses([...availableDiagnoses, diag]); };
  const handleAddNewGoal = (goal: string) => { if (!availableGoals.includes(goal)) setAvailableGoals([...availableGoals, goal]); };

  const handleScheduleSession = (appt: Partial<SessionAppointment>) => {
    const newAppt: SessionAppointment = { id: Date.now().toString(), studentIds: appt.studentIds || [], dateTime: appt.dateTime!, durationMinutes: appt.durationMinutes || 30, notes: appt.notes, lessonPlanId: appt.lessonPlanId, status: 'scheduled', createdAt: new Date().toISOString(), createdBy: userProfile.name } as SessionAppointment;
    setAppointments([...appointments, newAppt]);
  };

  const handleUpdateAppointment = (updated: SessionAppointment) => {
    setAppointments(appointments.map(a => a.id === updated.id ? { ...updated, updatedAt: new Date().toISOString(), updatedBy: userProfile.name } : a));
  };

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm("Remove this session from the calendar?")) {
      setAppointments(appointments.filter(a => a.id !== id));
    }
  };

  const renderView = () => {
    if (!userProfile.acceptedTermsDate) return <Onboarding onAccept={(mic) => setUserProfile(p => ({...p, acceptedTermsDate: new Date().toISOString(), micPermissionGranted: mic}))} />;
    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    const initialNote = notes.find(n => n.id === selectedNoteId) || null;
    
    switch (currentView) {
      case 'home': return <Home key={`home-${viewKey}`} onNavigate={handleNavigate} students={students} notes={notes} availableGoalsCount={availableGoals.length} onSeedSample={handleSeedSampleData} />;
      case 'dashboard': return <Dashboard key={`dash-${viewKey}`} students={students} notes={notes} appointments={appointments} onNavigate={handleNavigate} onSelectStudent={(id) => handleOpenStudentRecord(id, 'profile')} onSelectNote={handleSelectNote} onExport={() => {}} onExportSheets={() => {}} onImport={() => {}} onSeedSample={handleSeedSampleData} />;
      case 'calendar': return <CalendarView key={`cal-${viewKey}`} students={students} appointments={appointments} notes={notes} lessonPlans={lessonPlans} onSchedule={handleScheduleSession} onUpdateAppointment={handleUpdateAppointment} onDeleteAppointment={handleDeleteAppointment} onQuickAddStudent={(name) => handleAddStudent({ name, grade: 'K', diagnoses: [], goals: [] })} onStartSession={(studentIds, apptId, lpId) => { setSelectedStudentIds(studentIds); setPreselectedLessonPlanId(lpId || null); handleNavigate('notes', false, true); }} />;
      case 'students': return <StudentList key={`students-${viewKey}`} students={students} notes={notes} appointments={appointments} lessonPlans={lessonPlans} userName={userProfile.name} initialOpenForm={autoOpenStudentForm} initialViewingStudentId={selectedStudentIds.length === 1 ? selectedStudentIds[0] : undefined} initialTab={initialStudentTab} availableDiagnoses={availableDiagnoses} availableGoals={availableGoals} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onArchiveStudent={handleArchiveStudent} onRestoreStudent={handleRestoreStudent} onAddDiagnosisToBank={handleAddNewDiagnosis} onAddGoalToBank={handleAddNewGoal} onSelectStudent={(id, view) => { setSelectedStudentIds([id]); handleNavigate(view || 'notes', false, true); }} onSelectMultipleStudents={(ids) => { setSelectedStudentIds(ids); handleNavigate('notes', false, true); }} onEditNote={(sid, nid) => { setSelectedStudentIds([sid]); setSelectedNoteId(nid); handleNavigate('notes', false, true); }} onCloseForm={() => setAutoOpenStudentForm(false)} onSeedSample={handleSeedSampleData} />;
      case 'notes':
        if (!!selectedNoteId || selectedStudentIds.length > 0) return <NoteEditor key={`notes-editor-${viewKey}`} studentsInGroup={selectedStudents} allStudents={students} notes={notes} lessonPlans={lessonPlans} userName={userProfile.name} initialNote={initialNote} initialLessonPlanId={preselectedLessonPlanId} onSelectStudents={(ids) => setSelectedStudentIds(ids)} onSaveNotes={(noteDataArray) => {
            if (initialNote) setNotes(prev => prev.map(n => n.id === initialNote.id ? { ...initialNote, ...noteDataArray[0], updatedAt: new Date().toISOString(), updatedBy: userProfile.name } : n));
            else {
              const newNotes = noteDataArray.map(data => ({ ...data, createdAt: new Date().toISOString(), createdBy: userProfile.name } as SOAPNote));
              setNotes([...newNotes, ...notes]);
              const studentIds = noteDataArray.map(n => n.studentId);
              setStudents(prev => prev.map(s => studentIds.includes(s.id) ? { ...s, lastSeen: noteDataArray[0].date } : s));
              const matchedApptIds: string[] = [];
              const updatedAppts = appointments.map(appt => { if (appt.dateTime.split('T')[0] === new Date().toISOString().split('T')[0] && appt.studentIds.some(id => studentIds.includes(id)) && appt.status === 'scheduled') { matchedApptIds.push(appt.id); return { ...appt, status: 'completed' as const }; } return appt; });
              if (matchedApptIds.length === 0) setAppointments([{ id: 'adhoc-' + Date.now(), studentIds: studentIds, dateTime: new Date().toISOString(), durationMinutes: 30, status: 'completed', notes: 'Ad-hoc session note', createdAt: new Date().toISOString(), createdBy: userProfile.name, linkedNoteIds: newNotes.map(n => n.id) }, ...updatedAppts]);
              else setAppointments(updatedAppts.map(a => matchedApptIds.includes(a.id) ? { ...a, linkedNoteIds: newNotes.map(n => n.id) } : a));
            }
            setSelectedNoteId(null); setSelectedStudentIds([]); setPreselectedLessonPlanId(null); handleNavigate('notes');
          }} onCancelEdit={() => { setSelectedNoteId(null); setSelectedStudentIds([]); setPreselectedLessonPlanId(null); handleNavigate('notes'); }} />;
        return <NoteList key={`notes-list-${viewKey}`} notes={notes} students={students} lessonPlans={lessonPlans} onEditNote={(sid, nid) => { setSelectedStudentIds([sid]); setSelectedNoteId(nid); setViewKey(v => v + 1); }} onStartNewSession={(ids) => { setSelectedStudentIds(ids); setViewKey(v => v + 1); }} onUpdateNote={handleUpdateNote} />;
      case 'planner': return <LessonPlanner key={`planner-${viewKey}`} student={selectedStudents[0] || null} students={students} userName={userProfile.name} notes={notes} lessonPlans={lessonPlans} onSavePlan={(p) => setLessonPlans([{...p, createdAt: new Date().toISOString(), createdBy: userProfile.name}, ...lessonPlans])} onSelectStudent={(id) => setSelectedStudentIds([id])} onStartSession={(studentId, planId) => { setSelectedStudentIds([studentId]); setPreselectedLessonPlanId(planId); handleNavigate('notes', false, true); }} />;
      case 'profile': return <ProfileEditor key={`profile-${viewKey}`} profile={userProfile} onUpdateProfile={setUserProfile} />;
      default: return <Home onNavigate={handleNavigate} students={students} notes={notes} availableGoalsCount={availableGoals.length} onSeedSample={handleSeedSampleData} />;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {userProfile.acceptedTermsDate && (
        <nav className={`fixed lg:relative z-30 h-screen bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 no-print ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-64'}`}>
          <div className="p-6"><h1 className="text-2xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('home')}><i className="fas fa-comment-dots text-indigo-400"></i><span>SpeechPath</span></h1></div>
          <div className="mt-4 flex-1 overflow-y-auto">
            {[{id:'home',i:'fa-home',l:'Home'}, {id:'dashboard',i:'fa-chart-pie',l:'Dashboard'}, {id:'calendar',i:'fa-calendar-alt',l:'Session Calendar'}, {id:'students',i:'fa-users',l:'Student Roster'}, {id:'notes',i:'fa-file-signature',l:'Session Notes'}, {id:'planner',i:'fa-calendar-check',l:'Lesson Planner'}].map(item => (
              <button key={item.id} onClick={() => handleNavigate(item.id as View)} className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${currentView === item.id ? 'bg-indigo-700 border-r-4 border-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}><i className={`fas ${item.i} w-5 text-center`}></i><span>{item.l}</span></button>
            ))}
          </div>
          <button onClick={() => handleNavigate('profile')} className="p-6 border-t border-slate-800 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold shrink-0">{userProfile.initials}</div><div className="truncate"><p className="font-bold text-sm truncate">{userProfile.name}</p></div></button>
        </nav>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        {userProfile.acceptedTermsDate && (
          <header className="bg-white border-b border-slate-300 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm no-print">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-800 text-white"><i className="fas fa-bars"></i></button>
            <div className="flex flex-col"><h2 className="text-lg font-black text-slate-900 capitalize">{currentView}</h2></div>
            <button onClick={() => handleNavigate('profile')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-cog"></i></button>
          </header>
        )}
        <div id="printable-area" className="w-full flex-1 p-4 md:p-8 max-w-[1600px] mx-auto">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
