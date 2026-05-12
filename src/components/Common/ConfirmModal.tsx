import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bəli',
  cancelText = 'Xeyr',
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
          onClick={onClose} 
        />
        
        <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} rounded-2xl flex items-center justify-center mb-6`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">{message}</p>

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-4 ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-95`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ConfirmModal;
