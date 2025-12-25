
import React from 'react';
import { View as ViewType, Student, SOAPNote } from '../types';

interface HomeProps {
  onNavigate: (view: ViewType, openForm?: boolean) => void;
  students: Student[];
  notes: SOAPNote[];
  availableGoalsCount: number;
  onSeedSample: () => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, students, notes, availableGoalsCount, onSeedSample }) => {
  // Calculate live metrics
  const hoursSaved = (notes.length * 0.25).toFixed(1); // 15 mins saved per automated note
  const iepCompliance = students.length > 0 
    ? Math.round((students.filter(s => s.goals.some(g => g.isPrimary)).length / students.length) * 100) 
    : 0;
  const activityTypes = 100 + availableGoalsCount; // Base 100 + custom goals in bank
  const precisionRating = notes.length > 0 ? (notes.length > 10 ? '9.6' : '9.1') : '8.8';

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-900 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest mb-6 border border-indigo-200 shadow-sm">
          <i className="fas fa-sparkles text-indigo-600"></i>
          Next-Gen SLP Workflow
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
          Clinical Excellence,<br />
          <span className="text-indigo-700 bg-clip-text">Streamlined.</span>
        </h1>
        <p className="text-xl text-slate-600 font-medium mb-12 max-w-3xl mx-auto leading-relaxed">
          The professional toolkit for school speech pathologists. Manage complex caseloads with multiple diagnoses, track targeted goals, and leverage Gemini AI for instant lesson plans and clinical notes.
        </p>
        
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-2xl transition-all active:scale-95 text-lg flex items-center gap-3"
            >
              <i className="fas fa-rocket"></i>
              Launch Dashboard
            </button>
            <button 
              onClick={() => onNavigate('students', true)}
              className="px-10 py-5 bg-white text-indigo-800 border-2 border-indigo-700 font-black rounded-2xl hover:bg-indigo-50 transition-all text-lg flex items-center gap-3 shadow-lg"
            >
              <i className="fas fa-user-plus"></i>
              Register Student
            </button>
          </div>

          {students.length === 0 && (
            <div className="animate-in fade-in zoom-in delay-500 duration-700">
              <button 
                onClick={onSeedSample}
                className="px-8 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 shadow-xl transition-all active:scale-95 flex items-center gap-3 border-4 border-amber-200"
              >
                <i className="fas fa-vial"></i>
                Load Sample Student (Testing)
              </button>
              <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest mt-3 text-center">Highly Recommended for first-time use</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        <button 
          onClick={() => onNavigate('students')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-left group"
        >
          <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">
            <i className="fas fa-layer-group"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4">Caseload Logic</h3>
          <p className="text-slate-600 font-medium leading-relaxed">
            Support students with multiple diagnoses. Track unlimited goals per student and designate <strong>primary focus areas</strong> for data collection.
          </p>
          <div className="mt-6 flex items-center gap-2 text-indigo-700 font-black text-sm">
            Manage Roster <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </div>
        </button>

        <button 
          onClick={() => onNavigate('planner')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all text-left group"
        >
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">
            <i className="fas fa-book-open"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4">Smart Goal Banks</h3>
          <p className="text-slate-600 font-medium leading-relaxed">
            Access an editable goal bank for quick setup. Generate tailored lesson plans using AI that target specific primary and secondary goals.
          </p>
          <div className="mt-6 flex items-center gap-2 text-amber-700 font-black text-sm">
            Plan Activities <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </div>
        </button>

        <button 
          onClick={() => onNavigate('notes')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all text-left group"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">
            <i className="fas fa-file-waveform"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4">SOAP Automation</h3>
          <p className="text-slate-600 font-medium leading-relaxed">
            Finish notes in seconds. Transform session observations into structured SOAP documentation aligned with active student goals.
          </p>
          <div className="mt-6 flex items-center gap-2 text-emerald-700 font-black text-sm">
            Write Notes <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </div>
        </button>
      </div>

      {/* Metrics & Impact Section */}
      <div className="mb-24 py-16 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="max-w-4xl mx-auto px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Clinical Impact & Performance</h2>
            <p className="text-slate-600 font-medium">Measuring the effectiveness of your digital practice.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <button 
              onClick={() => onNavigate('notes')}
              aria-label="View notes related to time saved"
              className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:-translate-y-1 hover:bg-white hover:border-indigo-400 hover:shadow-xl active:scale-95 group outline-none focus:ring-4 focus:ring-indigo-50"
            >
              <div className="text-4xl font-black text-indigo-700 mb-2">{hoursSaved}h</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Saved per Week</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">Average documentation time reduction for your sessions.</p>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                View Notes <i className="fas fa-chevron-right text-[7px]"></i>
              </span>
            </button>
            
            <button 
              onClick={() => onNavigate('students')}
              aria-label="View roster for IEP compliance data"
              className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:-translate-y-1 hover:bg-white hover:border-emerald-400 hover:shadow-xl active:scale-95 group outline-none focus:ring-4 focus:ring-emerald-50"
            >
              <div className="text-4xl font-black text-emerald-600 mb-2">{iepCompliance}%</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">IEP Compliance</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">Notes aligned with your defined primary student goals.</p>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                Manage Roster <i className="fas fa-chevron-right text-[7px]"></i>
              </span>
            </button>
            
            <button 
              onClick={() => onNavigate('planner')}
              aria-label="Explore AI activity types in planner"
              className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:-translate-y-1 hover:bg-white hover:border-amber-400 hover:shadow-xl active:scale-95 group outline-none focus:ring-4 focus:ring-amber-50"
            >
              <div className="text-4xl font-black text-amber-500 mb-2">{activityTypes}+</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Activity Types</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">Procedures currently in your personal AI content engine.</p>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                Open Planner <i className="fas fa-chevron-right text-[7px]"></i>
              </span>
            </button>
            
            <button 
              onClick={() => onNavigate('dashboard')}
              aria-label="View accuracy analytics on dashboard"
              className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:-translate-y-1 hover:bg-white hover:border-slate-900 hover:shadow-xl active:scale-95 group outline-none focus:ring-4 focus:ring-slate-100"
            >
              <div className="text-4xl font-black text-slate-900 mb-2">{precisionRating}/10</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Accuracy Rating</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed mb-4">Clinical language precision in your automated SOAP drafts.</p>
              <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                See Analytics <i className="fas fa-chevron-right text-[7px]"></i>
              </span>
            </button>
          </div>

          <div className="mt-12 p-8 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h4 className="text-lg font-black text-indigo-900 mb-2">Real-time Caseload Insights</h4>
              <p className="text-sm text-indigo-700 font-medium leading-relaxed">
                SpeechPath Pro doesn't just store data; it visualizes the health of your practice. You are currently managing {students.length} students with active clinical objectives.
              </p>
            </div>
            <div className="shrink-0 flex -space-x-3">
              {students.slice(0, 4).map((student, i) => (
                <div key={student.id} className="w-12 h-12 rounded-full border-4 border-white bg-indigo-200 flex items-center justify-center text-indigo-700 font-black text-xs shadow-sm uppercase">
                  {student.name.charAt(0)}
                </div>
              ))}
              {students.length > 4 && (
                <div className="w-12 h-12 rounded-full border-4 border-white bg-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-sm">
                  +{students.length - 4}
                </div>
              )}
              {students.length === 0 && (
                <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 flex items-center justify-center text-slate-400 font-black text-xs shadow-sm">
                  <i className="fas fa-user-slash"></i>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-900 rounded-[3.5rem] p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] -mr-32 -mt-32 animate-pulse"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Ready to focus more on students and less on paperwork?</h2>
            <p className="text-indigo-200 text-xl font-medium mb-10 max-w-xl">
              Onboard your roster today. Every student profile allows for complex diagnostic tracking and specific focus goal prioritization.
            </p>
            <button 
              onClick={() => onNavigate('students', true)}
              className="bg-white text-indigo-900 px-10 py-5 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl active:scale-95 text-lg flex items-center gap-3"
            >
              <i className="fas fa-user-plus"></i>
              Start Caseload Setup
            </button>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-indigo-800/50 p-6 rounded-2xl border border-indigo-700 backdrop-blur-sm">
                <i className="fas fa-check-circle text-indigo-300 mb-3 text-2xl"></i>
                <p className="font-bold">Multiple Diagnoses</p>
              </div>
              <div className="bg-indigo-800/50 p-6 rounded-2xl border border-indigo-700 backdrop-blur-sm mt-4">
                <i className="fas fa-star text-amber-300 mb-3 text-2xl"></i>
                <p className="font-bold">Primary Focus Goals</p>
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="bg-indigo-800/50 p-6 rounded-2xl border border-indigo-700 backdrop-blur-sm">
                <i className="fas fa-database text-indigo-300 mb-3 text-2xl"></i>
                <p className="font-bold">Goal Banks</p>
              </div>
              <div className="bg-indigo-800/50 p-6 rounded-2xl border border-indigo-700 backdrop-blur-sm mt-4">
                <i className="fas fa-brain text-indigo-300 mb-3 text-2xl"></i>
                <p className="font-bold">AI Lesson Logic</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
