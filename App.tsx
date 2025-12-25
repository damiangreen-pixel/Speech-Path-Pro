
import React, { useState, useEffect } from 'react';
import { View, Student, SOAPNote, LessonPlan, Goal, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import NoteEditor from './components/NoteEditor';
import LessonPlanner from './components/LessonPlanner';
import ProfileEditor from './components/ProfileEditor';
import Home from './components/Home';
import Onboarding from './components/Onboarding';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewKey, setViewKey] = useState(0); // Used to force reset views on navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<SOAPNote[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [preselectedLessonPlanId, setPreselectedLessonPlanId] = useState<string | null>(null);
  const [autoOpenStudentForm, setAutoOpenStudentForm] = useState(false);
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Dana Green, MS, CCC-SLP',
    title: 'Speech-Language Pathologist',
    facility: 'Central School District',
    initials: 'DG'
  });

  const [availableDiagnoses, setAvailableDiagnoses] = useState<string[]>([
    'Articulation Disorder',
    'Expressive Language Delay',
    'Social Communication Disorder',
    'Autism Spectrum Disorder',
    'Phonological Disorder',
    'Fluency Disorder',
    'Voice Disorder',
    'Receptive Language Delay'
  ]);

  const [availableGoals, setAvailableGoals] = useState<string[]>([
    'Correct production of /r/ in all positions',
    'Correct production of /s/ in conversational speech',
    'Improve phonological awareness skills',
    'Use 3-word phrases to communicate wants/needs',
    'Follow 2-step directions consistently',
    'Initiate conversation with peers',
    'Maintain topic for 3 turns in conversation',
    'Use age-appropriate syntax in complex sentences',
    'Improve auditory processing speed',
    'Identify and express basic emotions'
  ]);

  useEffect(() => {
    const savedData = localStorage.getItem('speechpath_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setStudents(parsed.students || []);
      setNotes(parsed.notes || []);
      setLessonPlans(parsed.lessonPlans || []);
      setAvailableDiagnoses(parsed.availableDiagnoses || availableDiagnoses);
      setAvailableGoals(parsed.availableGoals || availableGoals);
      if (parsed.userProfile) {
        setUserProfile(parsed.userProfile);
      }
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      students,
      notes,
      lessonPlans,
      availableDiagnoses,
      availableGoals,
      userProfile
    };
    localStorage.setItem('speechpath_data', JSON.stringify(dataToSave));
  }, [students, notes, lessonPlans, availableDiagnoses, availableGoals, userProfile]);

  const handleSeedSampleData = () => {
    if (students.find(s => s.name === "Leo Martinez")) {
      alert("Sample data already exists.");
      return;
    }

    const sampleStudentId = "leo-sample-" + Date.now();
    const primaryGoal = "Correct production of /r/ in all positions";
    
    const sampleStudent: Student = {
      id: sampleStudentId,
      name: "Leo Martinez",
      grade: "3rd",
      isActive: true,
      diagnoses: ["Articulation Disorder", "Expressive Language Delay"],
      goals: [
        { text: primaryGoal, isPrimary: true },
        { text: "Use 3-word phrases to communicate wants/needs", isPrimary: false }
      ],
      createdAt: new Date().toISOString(),
      createdBy: userProfile.name,
      lastSeen: new Date().toISOString().split('T')[0]
    };

    const sampleNotes: SOAPNote[] = [
      {
        id: "n1-" + Date.now(),
        studentId: sampleStudentId,
        date: "2024-12-01",
        subjective: "Leo was motivated and cooperative.",
        objective: "Leo produced /r/ with 60% accuracy.",
        assessment: "Requires heavy modeling.",
        plan: "Continue word-level drills.",
        metrics: { accuracy: 60, totalTrials: 20, cuingLevel: 'Maximal', setting: 'Structured', focusGoalId: primaryGoal },
        createdAt: new Date().toISOString(),
        createdBy: userProfile.name
      }
    ];

    setStudents([sampleStudent, ...students]);
    setNotes([...sampleNotes, ...notes]);
    alert("Sample data loaded.");
  };

  const handleNavigate = (view: View, openForm: boolean = false, keepSelection: boolean = false) => {
    setCurrentView(view);
    setViewKey(prev => prev + 1); // Incrementing the key forces a component reset
    setAutoOpenStudentForm(openForm);
    setIsSidebarOpen(false);
    
    if (view !== 'notes') setPreselectedLessonPlanId(null);
    
    if (!keepSelection && (view === 'notes' || view === 'planner')) {
      setSelectedStudentIds([]);
      setSelectedNoteId(null);
    }
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const withAudit = {
      ...updatedStudent,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile.name
    };
    setStudents(students.map(s => s.id === updatedStudent.id ? withAudit : s));
  };

  const handleAddStudent = (newStudent: any) => {
    const withAudit: Student = {
      isActive: true,
      ...newStudent,
      createdAt: new Date().toISOString(),
      createdBy: userProfile.name
    };
    setStudents([...students, withAudit]);
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm("Delete student and all notes permanently? Use 'Archive' to keep data but hide from active caseload.")) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setNotes(prev => prev.filter(n => n.studentId !== id));
      setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
    }
  };

  const renderView = () => {
    if (!userProfile.acceptedTermsDate) {
      return <Onboarding onAccept={(mic) => setUserProfile(p => ({...p, acceptedTermsDate: new Date().toISOString(), micPermissionGranted: mic}))} />;
    }

    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    const initialNote = notes.find(n => n.id === selectedNoteId) || null;
    
    switch (currentView) {
      case 'home':
        return <Home key={`home-${viewKey}`} onNavigate={handleNavigate} students={students} notes={notes} availableGoalsCount={availableGoals.length} onSeedSample={handleSeedSampleData} />;
      case 'dashboard':
        return <Dashboard key={`dash-${viewKey}`} students={students} notes={notes} onNavigate={handleNavigate} onSelectStudent={(id) => { setSelectedStudentIds([id]); handleNavigate('notes', false, true); }} onExport={() => {}} onExportSheets={() => {}} onImport={() => {}} onSeedSample={handleSeedSampleData} />;
      case 'students':
        return <StudentList 
          key={`students-${viewKey}`}
          students={students} 
          notes={notes} 
          userName={userProfile.name} 
          initialOpenForm={autoOpenStudentForm} 
          availableDiagnoses={availableDiagnoses} 
          availableGoals={availableGoals} 
          onAddStudent={handleAddStudent} 
          onUpdateStudent={handleUpdateStudent} 
          onDeleteStudent={handleDeleteStudent} 
          onSelectStudent={(id, view) => { setSelectedStudentIds([id]); handleNavigate(view || 'notes', false, true); }}
          onSelectMultipleStudents={(ids) => { setSelectedStudentIds(ids); handleNavigate('notes', false, true); }}
          onEditNote={(sid, nid) => { setSelectedStudentIds([sid]); setSelectedNoteId(nid); handleNavigate('notes', false, true); }} 
          onCloseForm={() => setAutoOpenStudentForm(false)} 
          onSeedSample={handleSeedSampleData} 
        />;
      case 'notes':
        return <NoteEditor 
          key={`notes-${viewKey}`}
          studentsInGroup={selectedStudents} 
          allStudents={students} 
          notes={notes}
          lessonPlans={lessonPlans}
          userName={userProfile.name} 
          initialNote={initialNote} 
          initialLessonPlanId={preselectedLessonPlanId}
          onSelectStudents={(ids) => setSelectedStudentIds(ids)} 
          onSaveNotes={(noteDataArray) => {
            const groupSessionId = noteDataArray.length > 1 ? Date.now().toString() : undefined;
            const newNotes = noteDataArray.map(data => ({
              ...data,
              groupSessionId,
              createdAt: new Date().toISOString(),
              createdBy: userProfile.name
            } as SOAPNote));

            if (initialNote) {
              setNotes(prev => prev.map(n => n.id === initialNote.id ? {...n, ...noteDataArray[0], updatedAt: new Date().toISOString(), updatedBy: userProfile.name} : n));
            } else {
              setNotes([...newNotes, ...notes]);
              // Update last seen for all students in group
              const studentIds = noteDataArray.map(n => n.studentId);
              setStudents(prev => prev.map(s => studentIds.includes(s.id) ? { ...s, lastSeen: noteDataArray[0].date } : s));
            }
            setSelectedNoteId(null);
            setPreselectedLessonPlanId(null);
            handleNavigate('notes');
          }}
          onCancelEdit={() => { setSelectedNoteId(null); setPreselectedLessonPlanId(null); }}
        />;
      case 'planner':
        return <LessonPlanner 
          key={`planner-${viewKey}`}
          student={selectedStudents[0] || null} 
          students={students} 
          userName={userProfile.name} 
          notes={notes}
          lessonPlans={lessonPlans} 
          onSavePlan={(p) => setLessonPlans([{...p, createdAt: new Date().toISOString(), createdBy: userProfile.name}, ...lessonPlans])} 
          onSelectStudent={(id) => setSelectedStudentIds([id])} 
          onStartSession={(studentId, planId) => {
            setSelectedStudentIds([studentId]);
            setPreselectedLessonPlanId(planId);
            handleNavigate('notes', false, true);
          }}
        />;
      case 'profile':
        return <ProfileEditor key={`profile-${viewKey}`} profile={userProfile} onUpdateProfile={setUserProfile} />;
      default:
        return <Home onNavigate={handleNavigate} students={students} notes={notes} availableGoalsCount={availableGoals.length} onSeedSample={handleSeedSampleData} />;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      {userProfile.acceptedTermsDate && (
        <nav className={`fixed lg:relative z-30 h-full bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0'}`}>
          <div className="p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('home')}>
              <i className="fas fa-comment-dots text-indigo-400"></i><span>SpeechPath</span>
            </h1>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            {[{id:'home',i:'fa-home',l:'Home'},{id:'dashboard',i:'fa-chart-pie',l:'Dashboard'},{id:'students',i:'fa-users',l:'Student Roster'},{id:'notes',i:'fa-file-signature',l:'Session Notes'},{id:'planner',i:'fa-calendar-check',l:'Lesson Planner'}].map(item => (
              <button key={item.id} onClick={() => handleNavigate(item.id as View)} className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${currentView === item.id ? 'bg-indigo-700 border-r-4 border-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>
                <i className={`fas ${item.i} w-5 text-center`}></i><span>{item.l}</span>
              </button>
            ))}
          </div>
          <button onClick={() => handleNavigate('profile')} className="p-6 border-t border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">{userProfile.initials}</div>
            <div className="truncate"><p className="font-bold text-sm truncate">{userProfile.name}</p></div>
          </button>
        </nav>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        {userProfile.acceptedTermsDate && (
          <header className="bg-white border-b border-slate-300 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-800 text-white"><i className="fas fa-bars"></i></button>
            <div className="flex flex-col"><h2 className="text-lg font-black text-slate-900 capitalize">{currentView}</h2></div>
            <button onClick={() => handleNavigate('profile')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><i className="fas fa-cog"></i></button>
          </header>
        )}
        <div className="w-full flex-1 p-4 md:p-8 max-w-[1600px] mx-auto">{renderView()}</div>
      </main>
    </div>
  );
};

export default App;
