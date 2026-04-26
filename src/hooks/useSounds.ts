import { useCallback, useState, useEffect, useRef } from 'react';

export const useSounds = () => {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved ? parseFloat(saved) : 0.5;
  });

  // Background music state
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicTrack, setMusicTrack] = useState<'ambient' | 'intense' | 'victory'>('ambient');
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicNodesRef = useRef<{ oscillators: OscillatorNode[], gains: GainNode[] } | null>(null);
  const musicIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('soundVolume', volume.toString());
    // Update music volume if playing
    if (musicNodesRef.current) {
      musicNodesRef.current.gains.forEach(gain => {
        gain.gain.setValueAtTime(volume * 0.15, audioContextRef.current?.currentTime || 0);
      });
    }
  }, [volume]);

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      stopBackgroundMusic();
    };
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    if (musicNodesRef.current) {
      musicNodesRef.current.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      musicNodesRef.current = null;
    }
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    setMusicPlaying(false);
  }, []);

  const playBackgroundMusic = useCallback((track: 'ambient' | 'intense' | 'victory' = 'ambient') => {
    stopBackgroundMusic();
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const createAmbientLoop = () => {
        const chords = track === 'ambient' 
          ? [[130.81, 164.81, 196.00], [146.83, 174.61, 220.00], [164.81, 196.00, 246.94], [146.83, 174.61, 220.00]]
          : track === 'intense'
          ? [[130.81, 155.56, 196.00], [123.47, 146.83, 185.00], [138.59, 164.81, 207.65], [130.81, 155.56, 196.00]]
          : [[261.63, 329.63, 392.00], [293.66, 369.99, 440.00], [329.63, 415.30, 493.88], [349.23, 440.00, 523.25]];
        
        let chordIndex = 0;
        const oscillators: OscillatorNode[] = [];
        const gains: GainNode[] = [];

        const playChord = () => {
          // Clean up previous chord
          oscillators.forEach(osc => { try { osc.stop(); } catch {} });
          oscillators.length = 0;
          gains.length = 0;

          const chord = chords[chordIndex % chords.length];
          chord.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.value = 800;

            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.5);
            gain.gain.setValueAtTime(volume * 0.15, now + 1.5);
            gain.gain.linearRampToValueAtTime(0, now + 2);

            osc.start(now);
            osc.stop(now + 2);

            oscillators.push(osc);
            gains.push(gain);
          });

          musicNodesRef.current = { oscillators, gains };
          chordIndex++;
        };

        playChord();
        musicIntervalRef.current = setInterval(playChord, 2000);
      };

      createAmbientLoop();
      setMusicPlaying(true);
      setMusicTrack(track);
    } catch (error) {
      console.log('Background music not available');
    }
  }, [volume, stopBackgroundMusic]);

  const toggleBackgroundMusic = useCallback((track?: 'ambient' | 'intense' | 'victory') => {
    if (musicPlaying) {
      stopBackgroundMusic();
    } else {
      playBackgroundMusic(track || 'ambient');
    }
  }, [musicPlaying, playBackgroundMusic, stopBackgroundMusic]);

  const playCorrect = useCallback(() => {
    try {
      const audio = new Audio('/sounds/correct.wav');
      audio.volume = volume;
      audio.play().catch(() => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.value = volume * 0.3;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.3);
      });
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playWrong = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 200;
      gainNode.gain.value = volume * 0.3;
      
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playPass = useCallback(() => {
    try {
      const audio = new Audio('/sounds/pass.wav');
      audio.volume = volume;
      audio.play().catch(() => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 400;
        gainNode.gain.value = volume * 0.3;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
      });
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playBuzzer = useCallback(() => {
    try {
      const audio = new Audio('/sounds/buzzer.wav');
      audio.volume = volume;
      audio.play().catch(() => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 150;
        gainNode.gain.value = volume * 0.5;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);
      });
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playTick = useCallback(() => {
    try {
      const audio = new Audio('/sounds/tick.wav');
      audio.volume = volume * 0.3;
      audio.play().catch(() => {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 600;
        gainNode.gain.value = volume * 0.1;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.05);
      });
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playCountdownTick = useCallback((secondsRemaining: number) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      const baseFreq = 400;
      const freqIncrease = (6 - secondsRemaining) * 100;
      oscillator.frequency.value = baseFreq + freqIncrease;
      
      if (secondsRemaining === 1) {
        gainNode.gain.value = volume * 0.5;
        oscillator.start();
        oscillator.stop(context.currentTime + 0.3);
      } else {
        gainNode.gain.value = volume * 0.3;
        oscillator.start();
        oscillator.stop(context.currentTime + 0.15);
      }
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playHeartbeat = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      osc1.connect(gain1);
      gain1.connect(context.destination);
      osc1.frequency.value = 60;
      gain1.gain.setValueAtTime(volume * 0.4, context.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
      osc1.start(context.currentTime);
      osc1.stop(context.currentTime + 0.15);
      
      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      osc2.connect(gain2);
      gain2.connect(context.destination);
      osc2.frequency.value = 55;
      gain2.gain.setValueAtTime(volume * 0.3, context.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.35);
      osc2.start(context.currentTime + 0.2);
      osc2.stop(context.currentTime + 0.35);
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playBigReveal = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.setValueAtTime(300, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.5, context.currentTime + 0.2);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 1.5);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 1.5);
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playVictoryFanfare = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        
        const startTime = context.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playDrumroll = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          const filter = context.createBiquadFilter();
          
          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(context.destination);
          
          oscillator.frequency.value = 80 + Math.random() * 20;
          filter.type = 'lowpass';
          filter.frequency.value = 200;
          
          const now = context.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          
          oscillator.start(now);
          oscillator.stop(now + 0.05);
        }, i * 100);
      }
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  const playTensionBuild = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const filter = context.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, context.currentTime + 3);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, context.currentTime + 3);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.2, context.currentTime + 0.5);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, context.currentTime + 2.5);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 3);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 3);
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  // Rapid Fire Start - Epic power-up sound
  const playRapidFireStart = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Rising synth sweep
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      const filter1 = context.createBiquadFilter();
      
      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(context.destination);
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(100, context.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.3);
      osc1.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.5);
      
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(500, context.currentTime);
      filter1.frequency.exponentialRampToValueAtTime(4000, context.currentTime + 0.5);
      
      gain1.gain.setValueAtTime(0, context.currentTime);
      gain1.gain.linearRampToValueAtTime(volume * 0.4, context.currentTime + 0.1);
      gain1.gain.linearRampToValueAtTime(volume * 0.3, context.currentTime + 0.4);
      gain1.gain.linearRampToValueAtTime(0, context.currentTime + 0.6);
      
      osc1.start(context.currentTime);
      osc1.stop(context.currentTime + 0.6);
      
      // Impact hit
      setTimeout(() => {
        const osc2 = context.createOscillator();
        const gain2 = context.createGain();
        
        osc2.connect(gain2);
        gain2.connect(context.destination);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(150, context.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(50, context.currentTime + 0.2);
        
        gain2.gain.setValueAtTime(volume * 0.5, context.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
        
        osc2.start(context.currentTime);
        osc2.stop(context.currentTime + 0.3);
      }, 500);
      
      // Electric crackle
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          
          osc.connect(gain);
          gain.connect(context.destination);
          
          osc.type = 'square';
          osc.frequency.value = 2000 + Math.random() * 2000;
          
          gain.gain.setValueAtTime(volume * 0.15, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.05);
          
          osc.start(context.currentTime);
          osc.stop(context.currentTime + 0.05);
        }, 600 + i * 50);
      }
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  // Rapid Fire End - Power down sound
  const playRapidFireEnd = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Descending sweep
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      const filter1 = context.createBiquadFilter();
      
      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(context.destination);
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, context.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, context.currentTime + 0.5);
      
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(3000, context.currentTime);
      filter1.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.5);
      
      gain1.gain.setValueAtTime(volume * 0.3, context.currentTime);
      gain1.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);
      
      osc1.start(context.currentTime);
      osc1.stop(context.currentTime + 0.5);
      
      // Low thud
      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      
      osc2.connect(gain2);
      gain2.connect(context.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(80, context.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(40, context.currentTime + 0.3);
      
      gain2.gain.setValueAtTime(volume * 0.4, context.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      
      osc2.start(context.currentTime);
      osc2.stop(context.currentTime + 0.4);
    } catch (error) {
      console.log('Sound not available');
    }
  }, [volume]);

  // Coin sound for score counting up
  const playCoinScore = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.connect(gain);
      gain.connect(context.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, context.currentTime + 0.08);

      gain.gain.setValueAtTime(volume * 0.25, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);

      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.15);
    } catch {
      // Sound not available
    }
  }, [volume]);

  // Celebration sound for streaks (3+)
  const playStreakCelebration = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

      notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle';

        const startTime = context.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {
      // Sound not available
    }
  }, [volume]);

  return { 
    playCorrect, 
    playWrong, 
    playPass, 
    playBuzzer, 
    playTick, 
    playCountdownTick,
    playHeartbeat,
    playBigReveal, 
    playVictoryFanfare,
    playDrumroll, 
    playTensionBuild,
    playRapidFireStart,
    playRapidFireEnd,
    playCoinScore,
    playStreakCelebration,
    volume, 
    setVolume,
    // Background music controls
    musicPlaying,
    musicTrack,
    playBackgroundMusic,
    stopBackgroundMusic,
    toggleBackgroundMusic,
  };
};