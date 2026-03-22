import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, X } from 'lucide-react';
import { Lead } from '../data/leads';

interface CallPanelProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

type CallState = 'dialing' | 'connected' | 'ended';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CallPanel({ lead, isOpen, onClose }: CallPanelProps) {
  const [callState, setCallState] = useState<CallState>('dialing');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCallState('dialing');
      setElapsed(0);
      // Simulate call connecting after 3 seconds
      const connectTimer = setTimeout(() => setCallState('connected'), 3000);
      return () => clearTimeout(connectTimer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const handleHangUp = () => {
    setCallState('ended');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="call-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          <motion.div
            key="call-panel"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-80 rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
          >
            {/* Close */}
            <div className="flex justify-end px-5 pt-4">
              <button
                onClick={handleHangUp}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            {/* Call info */}
            <div className="px-8 pb-6 flex flex-col items-center text-center">
              {/* Pulsing avatar */}
              <div className="relative mb-5">
                {callState === 'dialing' && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full bg-blue-500/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.9, 1], opacity: [0.2, 0, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                      className="absolute inset-0 rounded-full bg-blue-500/20"
                    />
                  </>
                )}
                {callState === 'connected' && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full bg-emerald-500/30"
                  />
                )}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{lead.name[0]}</span>
                </div>
              </div>

              <h3 className="text-white font-bold text-xl mb-1">{lead.name}</h3>
              <p className="text-white/60 text-sm mb-1">{lead.title}</p>
              <p className="text-white/40 text-xs mb-4">{lead.company}</p>

              {/* Status */}
              <div className="mb-2">
                {callState === 'dialing' && (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="flex items-center gap-2 text-blue-300 text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Calling {lead.phone}...</span>
                  </motion.div>
                )}
                {callState === 'connected' && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Connected</span>
                    </div>
                    <p className="text-white font-mono text-2xl mt-1">{formatTime(elapsed)}</p>
                  </div>
                )}
                {callState === 'ended' && (
                  <p className="text-white/50 text-sm">Call ended</p>
                )}
              </div>
            </div>

            {/* Hang up button */}
            <div className="px-8 pb-8 flex justify-center">
              <motion.button
                onClick={handleHangUp}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center shadow-lg transition-colors"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
