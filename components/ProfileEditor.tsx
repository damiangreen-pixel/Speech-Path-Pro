
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onUpdateProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleMic = async () => {
    try {
      if (formData.micPermissionGranted) {
        setFormData({...formData, micPermissionGranted: false});
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setFormData({...formData, micPermissionGranted: true});
      }
    } catch (err) {
      alert("Please enable microphone permissions in your browser settings.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white relative">
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white/10">
              {formData.initials || '??'}
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight leading-tight">{formData.name || 'User Name'}</h3>
              <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs mt-1">{formData.title || 'Professional Title'}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          <section className="space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Professional Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-900 mb-2">Full Name & Credentials</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-indigo-700 font-bold text-slate-900 shadow-sm"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    setFormData({...formData, name, initials});
                  }}
                  placeholder="e.g. Sarah Parker, MS, CCC-SLP"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Professional Title</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-indigo-700 font-bold text-slate-900 shadow-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Speech-Language Pathologist"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Facility / School</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:ring-2 focus:ring-indigo-700 font-bold text-slate-900 shadow-sm"
                  value={formData.facility}
                  onChange={(e) => setFormData({...formData, facility: e.target.value})}
                  placeholder="e.g. Lincoln Elementary"
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Permissions & Privacy</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${formData.micPermissionGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  <i className={formData.micPermissionGranted ? "fas fa-microphone" : "fas fa-microphone-slash"}></i>
                </div>
                <div>
                  <p className="font-black text-slate-900">Microphone Access</p>
                  <p className="text-xs text-slate-500 font-medium">Used for smart transcription features.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={toggleMic}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${formData.micPermissionGranted ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-600'}`}
              >
                {formData.micPermissionGranted ? 'Granted' : 'Authorize'}
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl">
                    <i className="fas fa-file-contract"></i>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">User Agreement</p>
                    <p className="text-xs text-slate-500 font-medium italic">Accepted on {formData.acceptedTermsDate ? new Date(formData.acceptedTermsDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAgreement(!showAgreement)}
                  className="text-xs font-black text-indigo-700 hover:underline"
                >
                  {showAgreement ? 'Hide Agreement' : 'View Full Text'}
                </button>
              </div>

              {showAgreement && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed font-medium h-48 overflow-y-auto animate-in slide-in-from-top-2">
                  <h5 className="font-black text-slate-900 mb-2">SpeechPath Pro Clinical Terms</h5>
                  <p className="mb-2"><strong>Data Privacy:</strong> All student data is stored locally in this browser. You are responsible for clearing browser storage if using a shared workstation.</p>
                  <p className="mb-2"><strong>Professional Ethics:</strong> AI documentation assists in drafting. It does not replace the professional clinical judgment of a certified SLP.</p>
                  <p className="mb-2"><strong>Compliance:</strong> Do not enter non-essential PII (Personally Identifiable Information) into AI textareas.</p>
                </div>
              )}
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div>
              {isSaved && (
                <span className="text-emerald-600 font-black text-sm animate-in fade-in slide-in-from-left-2 flex items-center gap-2">
                  <i className="fas fa-check-circle"></i>
                  Changes Saved
                </span>
              )}
            </div>
            <button 
              type="submit"
              className="px-10 py-4 bg-indigo-700 text-white font-black rounded-xl hover:bg-indigo-800 shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <i className="fas fa-save"></i>
              Save Profile
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
        <i className="fas fa-info-circle text-indigo-600 mt-1"></i>
        <div className="text-sm text-indigo-900 leading-relaxed">
          <p className="font-bold">System Integrity:</p>
          <p className="mt-1 font-medium">Your credentials are automatically appended to exported reports and session notes for professional verification.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
