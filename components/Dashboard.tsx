
import React, { useRef } from 'react';
import { Student, SOAPNote, View } from '../types';

interface DashboardProps {
  students: Student[];
  notes: SOAPNote[];
  onNavigate: (view: View) => void;
  onSelectStudent: (id: string) => void;
  onExport: () => void;
  onExportSheets: () => void;
  onImport: (file: File) => void;
  onSeedSample: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ students, notes, onNavigate, onSelectStudent, onExport, onExportSheets, onImport, onSeedSample }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStudents = students.filter(s => s.isActive !== false);
  const archivedCount = students.length - activeStudents.length;
  const studentsWithPredictions = activeStudents.filter(s => s.milestonePrediction);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => onNavigate('students')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left transition-all hover:border-indigo-400 hover:shadow-md active:scale-[0.98] group focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fas fa-user-graduate text-xl"></i>
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active Caseload</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{activeStudents.length}</h3>
          <p className="text-slate-700 text-sm mt-1 font-medium flex items-center gap-1">
            {archivedCount > 0 ? `${archivedCount} students archived` : 'Full roster monitoring'}
            <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"></i>
          </p>
        </button>

        <button 
          onClick={() => onNavigate('notes')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left transition-all hover:border-emerald-400 hover:shadow-md active:scale-[0.98] group focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <i className="fas fa-clipboard-check text-xl"></i>
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Completed Notes</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{notes.length}</h3>
          <p className="text-slate-700 text-sm mt-1 font-medium flex items-center gap-1">
            Historical logs preserved
            <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"></i>
          </p>
        </button>

        <div className="bg-indigo-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
          <i className="fas fa-brain absolute -right-4 -bottom-4 text-white/5 text-7xl transition-transform group-hover:rotate-12"></i>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <i className="fas fa-crystal-ball text-xl"></i>
            </div>
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">AI Projections</span>
          </div>
          <h3 className="text-3xl font-black text-white">{studentsWithPredictions.length}</h3>
          <p className="text-indigo-100 text-sm mt-1 font-medium">Goal mastery predictions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Milestone Projections Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-black text-slate-900 flex items-center gap-2">
                <i className="fas fa-bullseye text-indigo-600"></i> IEP Milestone Tracker
              </h4>
            </div>
            <div className="p-6">
              {studentsWithPredictions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  <i className="fas fa-chart-line text-4xl mb-4 block opacity-20"></i>
                  Run an <strong>IEP Projection</strong> from the student roster <br/>to see mastery predictions here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentsWithPredictions.map(student => (
                    <div key={student.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-indigo-400 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-none">{student.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest truncate max-w-[120px]">
                              {student.goals.find(g => g.isPrimary)?.text || student.goals[0].text}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Mastery By</p>
                          <p className="text-sm font-black text-slate-900">{student.milestonePrediction?.predictedDate}</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-1000" 
                          style={{ width: `${student.milestonePrediction?.confidence}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Confidence</span>
                        <span className="text-[9px] font-black text-indigo-600">{student.milestonePrediction?.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border-2 border-indigo-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-sitemap text-xl"></i>
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xl tracking-tight">Management & Collaboration</h4>
                <p className="text-slate-600 text-sm font-medium italic">Share progress with parents or administrators.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Management Reporting</p>
                <button 
                  onClick={onExportSheets}
                  className="w-full py-3 bg-emerald-700 text-white font-black rounded-lg hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <i className="fas fa-file-csv"></i>
                  Export to CSV
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">System Backup</p>
                <button 
                  onClick={onExport}
                  className="w-full py-3 bg-indigo-700 text-white font-black rounded-lg hover:bg-indigo-800 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <i className="fas fa-file-export"></i>
                  Full Backup
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 bg-white text-indigo-700 border-2 border-indigo-700 font-black rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <i className="fas fa-file-import"></i>
                Import JSON
              </button>
              <button 
                onClick={onSeedSample}
                className="flex-1 py-3 bg-amber-600 text-white font-black rounded-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <i className="fas fa-vial"></i>
                Seed Data
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-900">Recent Activity</h4>
            </div>
            <div className="divide-y divide-slate-50">
              {activeStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-400 font-bold">No active students.</p>
                </div>
              ) : (
                activeStudents.slice(0, 8).map(student => (
                  <button 
                    key={student.id} 
                    onClick={() => onSelectStudent(student.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-800 group-hover:bg-indigo-700 group-hover:text-white transition-all">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Grade {student.grade}</p>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-indigo-600"></i>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-800 to-violet-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group">
            <i className="fas fa-calendar-check absolute -right-6 -bottom-6 text-white/10 text-9xl transition-transform group-hover:scale-110"></i>
            <h4 className="text-xl font-black mb-2">Lesson Planning</h4>
            <p className="text-indigo-100 text-sm mb-6 font-medium">Draft session blueprints targeted specifically to IEP goals.</p>
            <button 
              onClick={() => onNavigate('planner')}
              className="w-full bg-white text-indigo-900 py-3 rounded-xl font-black hover:bg-slate-50 transition-all shadow-lg active:scale-95"
            >
              Open Planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
