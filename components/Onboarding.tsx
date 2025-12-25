
import React, { useState, useRef, useEffect } from 'react';

interface OnboardingProps {
  onAccept: (micGranted: boolean) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onAccept }) => {
  const [step, setStep] = useState(1);
  const [micStatus, setMicStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('granted');
    } catch (err) {
      setMicStatus('denied');
    }
  };

  const handleScroll = () => {
    if (termsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
      // Use a small buffer (5px) to ensure reliability across browsers
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setHasScrolledToBottom(true);
      }
    }
  };

  // Initial check in case the container is too small to scroll
  useEffect(() => {
    if (step === 1 && termsRef.current) {
      const { scrollHeight, clientHeight } = termsRef.current;
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [step]);

  const handleFinalize = () => {
    onAccept(micStatus === 'granted');
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2">Welcome to SpeechPath Pro</h1>
            <p className="text-indigo-100 font-medium">Professional Clinical Assistant Setup</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>

        <div className="p-8 md:p-12">
          {step === 1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-3 text-indigo-700 mb-4">
                <i className="fas fa-shield-check text-2xl"></i>
                <h2 className="text-xl font-black">User Agreement & Privacy Policy</h2>
              </div>
              <div 
                ref={termsRef}
                onScroll={handleScroll}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6 h-64 overflow-y-auto text-sm text-slate-700 leading-relaxed font-medium"
              >
                <h3 className="font-black text-slate-900 mb-2">1. Data Privacy & Local Storage</h3>
                <p className="mb-4">SpeechPath Pro is designed with "Privacy by Default." All student identifiers, diagnoses, and session notes are stored exclusively in your browser's local storage. No student data is uploaded to our servers.</p>
                
                <h3 className="font-black text-slate-900 mb-2">2. Professional Responsibility</h3>
                <p className="mb-4">As a Speech-Language Pathologist, you are solely responsible for ensuring that your use of this tool complies with your district's HIPAA and FERPA policies. Avoid entering full Social Security numbers or highly sensitive non-clinical personal data.</p>
                
                <h3 className="font-black text-slate-900 mb-2">3. AI Content Disclaimer</h3>
                <p className="mb-4">AI-generated Lesson Plans and SOAP notes are clinical drafts. You MUST review, edit, and verify all output for clinical accuracy before finalizing professional documentation.</p>
                
                <h3 className="font-black text-slate-900 mb-2">4. Microphone Usage</h3>
                <p className="mb-4">We request microphone access solely to enable future voice-to-text features and real-time session transcription assistance. Audio is processed but not stored on our servers.</p>
                
                <div className="mt-8 p-4 bg-indigo-100 border border-indigo-200 rounded-xl text-center">
                  <p className="font-black text-indigo-900 text-xs uppercase tracking-widest">End of Terms</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
                <div className="flex-1 text-xs text-slate-500 font-bold">
                  {hasScrolledToBottom 
                    ? "Thank you for reviewing. You may now proceed." 
                    : "Please scroll to the bottom of the terms to enable the 'Accept' button."}
                </div>
                <button 
                  disabled={!hasScrolledToBottom}
                  onClick={() => setStep(2)}
                  className={`w-full md:w-auto px-10 py-4 font-black rounded-xl transition-all shadow-lg active:scale-95 ${
                    hasScrolledToBottom 
                      ? 'bg-indigo-700 text-white hover:bg-indigo-800' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl mb-6 transition-colors ${
                  micStatus === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <i className={micStatus === 'granted' ? "fas fa-microphone" : "fas fa-microphone-slash"}></i>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Microphone Permissions</h2>
                <p className="text-slate-600 font-medium max-w-md mx-auto">
                  SpeechPath Pro uses microphone access for streamlined session documentation and voice-assist features.
                </p>
              </div>

              <div className="max-w-sm mx-auto space-y-4">
                {micStatus === 'pending' ? (
                  <button 
                    onClick={requestMic}
                    className="w-full py-4 bg-white border-2 border-indigo-700 text-indigo-700 font-black rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-lock-open"></i>
                    Authorize Microphone
                  </button>
                ) : micStatus === 'granted' ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center font-black flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    Access Granted
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center font-black flex items-center justify-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    Access Denied
                  </div>
                )}

                <button 
                  onClick={handleFinalize}
                  className="w-full py-4 bg-indigo-700 text-white font-black rounded-xl hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                  Finish Setup
                </button>
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                  You can change this anytime in your profile settings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
