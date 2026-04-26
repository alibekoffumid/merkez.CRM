import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

interface JarvisResult {
  patient_name: string;
  procedure_type: string;
  date: string;
  time: string;
  doctor_id?: string;
}

const JarvisVoice: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [result, setResult] = useState<JarvisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const speak = (text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; // Set to Russian
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Chrome/Blink browsers prefer webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
        
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        await processAudio(audioBlob, mimeType.split('/')[1]);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (blob: Blob, ext: string = 'webm') => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);

      // @ts-ignore
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // @ts-ignore
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/jarvis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Jarvis API Error:', errorData);
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (!data.isAvailable) {
        setError('Time slot is already taken! 🛑');
        speak('К сожалению, это время уже занято.');
      } else if (data.message) {
        speak(data.message);
      }

      setResult(data.result);
      setShowConfirmModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmBooking = async () => {
    if (!result) return;
    try {
      setIsProcessing(true);
      const { error: dbError } = await supabase
        .from('dental_appointments')
        .insert([{
          patient_name: result.patient_name,
          procedure_type: result.procedure_type,
          appointment_date: result.date,
          start_time: result.time,
          status: 'SCHEDULED'
        }]);

      if (dbError) throw dbError;
      
      speak('Запись успешно подтверждена и сохранена.');
      setShowConfirmModal(false);
      setResult(null);
      alert('Appointment created successfully! 🎉');
    } catch (err: any) {
      alert('Error saving to DB: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-24 z-[400]">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90
            ${isRecording 
              ? 'bg-rose-500 animate-pulse ring-4 ring-rose-500/30' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/40'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        
        {/* Helper Label */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest opacity-0 hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Jarvis Assistant
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && result && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-blue-600 text-white relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Confirm Appointment</h3>
                  <p className="text-blue-100 text-xs font-medium">Jarvis successfully parsed your request</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient</label>
                  <input 
                    type="text" 
                    value={result.patient_name}
                    onChange={(e) => setResult({...result, patient_name: e.target.value})}
                    className="w-full bg-gray-50 border-b-2 border-transparent focus:border-blue-600 outline-none text-lg font-black text-gray-900 transition-all py-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Procedure</label>
                  <input 
                    type="text" 
                    value={result.procedure_type}
                    onChange={(e) => setResult({...result, procedure_type: e.target.value})}
                    className="w-full bg-gray-50 border-b-2 border-transparent focus:border-blue-600 outline-none text-lg font-black text-gray-900 transition-all py-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                  <input 
                    type="date" 
                    value={result.date}
                    onChange={(e) => setResult({...result, date: e.target.value})}
                    className="w-full bg-gray-50 border-b-2 border-transparent focus:border-blue-600 outline-none text-lg font-black text-gray-900 transition-all py-1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</label>
                  <input 
                    type="time" 
                    value={result.time}
                    onChange={(e) => setResult({...result, time: e.target.value})}
                    className="w-full bg-gray-50 border-b-2 border-transparent focus:border-blue-600 outline-none text-lg font-black text-gray-900 transition-all py-1"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBooking}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-28 right-8 z-[400] bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <p className="text-sm font-bold text-rose-700">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}
    </>
  );
};

export default JarvisVoice;
