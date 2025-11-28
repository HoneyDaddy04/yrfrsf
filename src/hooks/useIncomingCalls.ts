import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToPendingCalls,
  getPendingCalls,
  updatePendingCallStatus,
  PendingCall
} from '../services/supabaseSync';

export function useIncomingCalls() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<PendingCall | null>(null);
  const [pendingCalls, setPendingCalls] = useState<PendingCall[]>([]);

  // Fetch existing pending calls on mount
  useEffect(() => {
    if (!user) return;

    const fetchPendingCalls = async () => {
      const calls = await getPendingCalls(user.id);
      setPendingCalls(calls);

      // If there are pending calls, show the most recent one
      if (calls.length > 0) {
        setIncomingCall(calls[0]);
      }
    };

    fetchPendingCalls();
  }, [user]);

  // Subscribe to real-time pending calls
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPendingCalls(user.id, (newCall) => {
      console.log('📞 Incoming call from:', newCall.sender_name || newCall.sender_email);
      setIncomingCall(newCall);
      setPendingCalls(prev => [newCall, ...prev]);

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(`📞 Incoming Reminder from ${newCall.sender_name || 'Someone'}`, {
          body: newCall.reminder_title,
          icon: '/favicon.ico',
          tag: `incoming-${newCall.id}`,
          requireInteraction: true,
        });
      }

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback: use system beep via Web Audio API
          const ctx = new AudioContext();
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = 440;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.3;
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            ctx.close();
          }, 200);
        });
      } catch (e) {
        console.log('Could not play notification sound');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const answerIncomingCall = useCallback(async () => {
    if (!incomingCall) return null;

    // Update status to answered
    await updatePendingCallStatus(incomingCall.id, 'answered', Date.now());

    // Remove from pending list
    setPendingCalls(prev => prev.filter(c => c.id !== incomingCall.id));

    // Return the call data so the call manager can handle it
    const callData = { ...incomingCall };
    setIncomingCall(null);

    return callData;
  }, [incomingCall]);

  const declineIncomingCall = useCallback(async () => {
    if (!incomingCall) return;

    // Update status to missed
    await updatePendingCallStatus(incomingCall.id, 'missed');

    // Remove from pending list
    setPendingCalls(prev => prev.filter(c => c.id !== incomingCall.id));

    // Check if there are more pending calls
    const remaining = pendingCalls.filter(c => c.id !== incomingCall.id);
    if (remaining.length > 0) {
      setIncomingCall(remaining[0]);
    } else {
      setIncomingCall(null);
    }
  }, [incomingCall, pendingCalls]);

  const dismissIncomingCall = useCallback(() => {
    // Just dismiss without marking as missed (for snooze-like behavior)
    if (incomingCall) {
      const remaining = pendingCalls.filter(c => c.id !== incomingCall.id);
      if (remaining.length > 0) {
        setIncomingCall(remaining[0]);
      } else {
        setIncomingCall(null);
      }
    }
  }, [incomingCall, pendingCalls]);

  return {
    incomingCall,
    pendingCalls,
    answerIncomingCall,
    declineIncomingCall,
    dismissIncomingCall,
  };
}
