import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Stabilized Custom Hook for Speech Synthesis.
 * Enforces stable references to refs and buffers to avoid re-render loops.
 * Defers naturally finishing onEnd callback execution by 150ms to allow browser audio queues to flush.
 */
export function useSpeechSynthesis(options = {}) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeCharIndex, setActiveCharIndex] = useState(null);

  const onEndRef = useRef(options.onEnd);
  useEffect(() => {
    onEndRef.current = options.onEnd;
  }, [options.onEnd]);

  // Keep references to values needed by speech event handlers without triggering re-renders
  const plainTextRef = useRef('');
  const lastSpokenIndex = useRef(0);
  const baseCharOffset = useRef(0);
  const activeUtterance = useRef(null);

  const playbackRateRef = useRef(1.0);
  const selectedVoiceRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    selectedVoiceRef.current = selectedVoice;
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
  }, [playbackRate, selectedVoice, isPlaying, isPaused]);

  // Check browser support and load voices
  const loadVoices = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      
      // Default to the first English or system voice if none selected
      if (allVoices.length > 0 && !selectedVoice) {
        const defaultVoice = allVoices.find(v => v.default) || 
                             allVoices.find(v => v.lang.startsWith('en')) || 
                             allVoices[0];
        setSelectedVoice(defaultVoice);
      }
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSupported(true);
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Internal helper to create and start a new utterance
  const speakUtterance = useCallback((textToSpeak, offset) => {
    if (!window.speechSynthesis) return;

    // Create the native utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    activeUtterance.current = utterance;
    
    // Configure settings
    utterance.rate = playbackRateRef.current;
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

    // Set up events
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const absoluteIndex = offset + event.charIndex;
        lastSpokenIndex.current = absoluteIndex;
        setActiveCharIndex(absoluteIndex);
      }
    };

    utterance.onend = () => {
      // Only reset state if this is the active utterance ending naturally
      if (activeUtterance.current === utterance) {
        setIsPlaying(false);
        setIsPaused(false);
        setActiveCharIndex(null);
        lastSpokenIndex.current = 0;
        baseCharOffset.current = 0;
        activeUtterance.current = null;
        
        // Defer next paragraph trigger by 150ms to allow speech queue to safely flush
        if (onEndRef.current) {
          setTimeout(() => {
            if (onEndRef.current) {
              onEndRef.current();
            }
          }, 150);
        }
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.error('SpeechSynthesisUtterance error:', event);
        setIsPlaying(false);
        setIsPaused(false);
        setActiveCharIndex(null);
        activeUtterance.current = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Expose play function
  const speak = useCallback((plainText) => {
    if (!supported || !plainText) return;

    window.speechSynthesis.cancel();
    
    plainTextRef.current = plainText;
    lastSpokenIndex.current = 0;
    baseCharOffset.current = 0;
    setActiveCharIndex(null);
    setIsPlaying(true);
    setIsPaused(false);

    speakUtterance(plainText, 0);
  }, [supported, speakUtterance]);

  // Expose pause function
  const pause = useCallback(() => {
    if (supported) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [supported]);

  // Expose resume function
  const resume = useCallback(() => {
    if (supported) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [supported]);

  // Expose stop function
  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setActiveCharIndex(null);
      lastSpokenIndex.current = 0;
      baseCharOffset.current = 0;
      activeUtterance.current = null;
    }
  }, [supported]);

  // Dynamically change rate and adjust active playback
  const setRate = useCallback((newRate) => {
    setPlaybackRate(newRate);
    playbackRateRef.current = newRate;

    // If currently speaking, we must restart the utterance at the new rate from the last spoken word
    if (supported && isPlayingRef.current && !isPausedRef.current) {
      window.speechSynthesis.cancel();
      
      const offset = lastSpokenIndex.current;
      baseCharOffset.current = offset;
      
      const remainingText = plainTextRef.current.slice(offset);
      if (remainingText.trim()) {
        speakUtterance(remainingText, offset);
      } else {
        // Nothing left to speak
        setIsPlaying(false);
        setActiveCharIndex(null);
      }
    }
  }, [supported, speakUtterance]);

  // Dynamically change voice
  const setVoice = useCallback((voice) => {
    setSelectedVoice(voice);
    selectedVoiceRef.current = voice;

    // Restart synthesis with the new voice if currently active
    if (supported && isPlayingRef.current && !isPausedRef.current) {
      window.speechSynthesis.cancel();
      
      const offset = lastSpokenIndex.current;
      baseCharOffset.current = offset;
      
      const remainingText = plainTextRef.current.slice(offset);
      if (remainingText.trim()) {
        const utterance = new SpeechSynthesisUtterance(remainingText);
        activeUtterance.current = utterance;
        utterance.rate = playbackRateRef.current;
        utterance.voice = voice;

        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            const absoluteIndex = offset + event.charIndex;
            lastSpokenIndex.current = absoluteIndex;
            setActiveCharIndex(absoluteIndex);
          }
        };

        utterance.onend = () => {
          if (activeUtterance.current === utterance) {
            setIsPlaying(false);
            setIsPaused(false);
            setActiveCharIndex(null);
            lastSpokenIndex.current = 0;
            baseCharOffset.current = 0;
            activeUtterance.current = null;
            if (onEndRef.current) {
              setTimeout(() => {
                if (onEndRef.current) {
                  onEndRef.current();
                }
              }, 150);
            }
          }
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
        setActiveCharIndex(null);
      }
    }
  }, [supported, speakUtterance]);

  return {
    supported,
    voices,
    selectedVoice,
    playbackRate,
    isPlaying,
    isPaused,
    activeCharIndex,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice
  };
}
