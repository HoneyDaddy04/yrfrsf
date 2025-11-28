import { AlertCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface PanicButtonProps {
  onPanic: () => void;
}

export default function PanicButton({ onPanic }: PanicButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Load saved position and minimized state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('panicButtonState');
    if (savedState) {
      const { minimized, pos } = JSON.parse(savedState);
      setIsMinimized(minimized || false);
      if (pos) setPosition(pos);
    }
  }, []);

  // Save state to localStorage
  const saveState = (minimized: boolean, pos: { x: number; y: number }) => {
    localStorage.setItem('panicButtonState', JSON.stringify({ minimized, pos }));
  };

  const handlePanicClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
      saveState(false, position);
    } else {
      setShowConfirm(true);
    }
  };

  const confirmPanic = () => {
    setShowConfirm(false);
    onPanic();
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    saveState(newMinimized, position);
  };

  const handleDragEnd = (_: any, info: any) => {
    const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
    setPosition(newPos);
    saveState(isMinimized, newPos);
  };

  return (
    <>
      {/* Drag constraints container - full viewport */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

      {/* Panic Button */}
      <motion.div
        drag
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: position.x,
          y: position.y,
        }}
        className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40 pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        {isMinimized ? (
          // Minimized view - small pill on the side
          <motion.button
            onClick={handlePanicClick}
            className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full shadow-lg hover:shadow-red-500/50 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Click to expand panic button"
          >
            <AlertCircle className="w-4 h-4" />
            <Maximize2 className="w-3 h-3" />
          </motion.button>
        ) : (
          // Full view
          <div className="relative group">
            <motion.button
              onClick={handlePanicClick}
              className="relative p-3 sm:p-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full shadow-2xl hover:shadow-red-500/50 hover:scale-110 transition-all duration-300"
              title="Emergency Support - Click for immediate help (drag to move)"
              whileTap={{ scale: 0.95 }}
            >
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />

              {/* Pulse Animation */}
              <span className="absolute inset-0 rounded-full bg-red-400 opacity-0 group-hover:opacity-75 group-hover:animate-ping pointer-events-none"></span>
            </motion.button>

            {/* Minimize button */}
            <button
              onClick={toggleMinimize}
              className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-gray-600"
              title="Minimize"
            >
              <Minimize2 className="w-3 h-3" />
            </button>

            {/* Label - Hidden on mobile */}
            <div className="hidden sm:block text-xs text-gray-600 font-medium text-center px-2 mt-2 whitespace-nowrap pointer-events-none">
              Panic Button
            </div>

            {/* Drag hint */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Drag to move
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Need Support?</h3>
                    <p className="text-sm text-gray-600">We're here to help you</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Message */}
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Clicking this will immediately trigger a call to remind you of your goals and why you started this journey.
                  <br /><br />
                  <strong>You've got this. Stay strong.</strong>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPanic}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Get Support Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
