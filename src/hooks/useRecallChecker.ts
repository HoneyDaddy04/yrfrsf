/**
 * Hook to check for due recalls and trigger them
 */

import { useEffect } from 'react';
import { getDueRecalls, removeRecall } from '../utils/autoRecall';

export function useRecallChecker() {
  useEffect(() => {
    // Check every 10 seconds for due recalls
    const interval = setInterval(() => {
      const dueRecalls = getDueRecalls();

      dueRecalls.forEach(recall => {
        console.log(`📞 Triggering recall attempt #${recall.attemptNumber} for ${recall.reminder.title}`);

        // Dispatch reminder event with recall attempt number
        const event = new CustomEvent('reminderTriggered', {
          detail: {
            ...recall.reminder,
            recallAttempt: recall.attemptNumber,
          },
        });
        window.dispatchEvent(event);

        // Remove from pending recalls
        removeRecall(recall.reminderId);
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);
}
