import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  existingRecording?: string;
  onClearRecording?: () => void;
}

export default function AudioRecorder({ onRecordingComplete, existingRecording, onClearRecording }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(existingRecording || null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL && !existingRecording) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL, existingRecording]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioBase64(base64);
          onRecordingComplete(base64);
        };

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    setError(null);
    // Use audioURL (blob) if available, otherwise use base64
    const audioSource = audioURL || audioBase64;

    if (audioSource) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(audioSource);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsPlaying(false);
        setError('Failed to play recording. Please try recording again.');
      };

      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Play failed:', err);
          setIsPlaying(false);
          setError('Failed to play recording. Please try again.');
        });
    }
  };

  const clearRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setAudioBase64(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    if (onClearRecording) {
      onClearRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <label id="audio-recorder-label" className="block text-sm font-medium text-gray-700 mb-2">
        Custom Voice Message (Optional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Record your own voice instead of using AI text-to-speech. Your recording will play when you answer the call.
      </p>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {!audioURL && !audioBase64 ? (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          {isRecording ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-3 animate-pulse">
                <Mic className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-bold text-gray-900 mb-2">{formatTime(recordingTime)}</p>
              <p className="text-sm text-gray-600 mb-4">Recording...</p>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <Mic className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-4">No recording yet</p>
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Recording saved</p>
                <p className="text-xs text-gray-500">
                  {recordingTime > 0 ? formatTime(recordingTime) : 'Custom audio'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playRecording}
                disabled={isPlaying}
                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                title="Play"
              >
                <Play className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={clearRecording}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={startRecording}
            className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Record again
          </button>
        </div>
      )}
    </div>
  );
}
