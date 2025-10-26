import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface Props {
  status: 'paused' | 'expired';
  message: string;
}

export const OrgBlockedOverlay: React.FC<Props> = ({ status, message }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ pointerEvents: 'all' }}>
      {/* Blurred Background */}
      <div 
        className="absolute inset-0 bg-slate-900/95"
        style={{ backdropFilter: 'blur(10px)', pointerEvents: 'all' }}
      />
      
      {/* Modal */}
      <div className="relative z-10 bg-slate-800 rounded-2xl p-8 max-w-md mx-4 border-2 border-red-500 shadow-2xl animate-in fade-in duration-300">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            {status === 'paused' ? (
              <XCircle className="w-12 h-12 text-red-500" />
            ) : (
              <AlertCircle className="w-12 h-12 text-orange-500" />
            )}
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            {status === 'paused' ? 'Organization Paused' : 'License Expired'}
          </h2>
          
          {/* Message */}
          <p className="text-slate-300 mb-6 leading-relaxed text-base">
            {message}
          </p>
          
          {/* Contact Info */}
          <div className="w-full p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 mb-2">Contact Support:</p>
            <p className="text-white font-semibold text-lg">support@dataction.com</p>
          </div>
          
          {/* Additional Info */}
          <p className="text-xs text-slate-500 mt-4">
            {status === 'expired' 
              ? 'Access will be restored once your license is renewed'
              : 'Access will be restored once your organization is reactivated'
            }
          </p>
        </div>
      </div>
    </div>
  );
};
