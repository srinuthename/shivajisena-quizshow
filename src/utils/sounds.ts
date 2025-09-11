// Simple sound utility for game events
export const playSound = (type: 'correct' | 'incorrect' | 'reveal' | 'celebration') => {
  // Create audio context for simple beep sounds
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const createBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };
  
  switch (type) {
    case 'correct':
      // Pleasant ascending chime
      createBeep(523.25, 0.2); // C5
      setTimeout(() => createBeep(659.25, 0.2), 100); // E5
      setTimeout(() => createBeep(783.99, 0.3), 200); // G5
      break;
      
    case 'incorrect':
      // Descending sad tone
      createBeep(349.23, 0.3, 'triangle'); // F4
      setTimeout(() => createBeep(293.66, 0.4, 'triangle'), 150); // D4
      break;
      
    case 'reveal':
      // Dramatic reveal sound
      createBeep(440, 0.5, 'sawtooth'); // A4
      break;
      
    case 'celebration':
      // Victory fanfare
      createBeep(523.25, 0.15); // C5
      setTimeout(() => createBeep(659.25, 0.15), 100); // E5
      setTimeout(() => createBeep(783.99, 0.15), 200); // G5
      setTimeout(() => createBeep(1046.5, 0.4), 300); // C6
      break;
  }
};