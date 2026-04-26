import { useCallback, useReducer } from 'react';

type RevealPhase = 'idle' | 'countdown' | 'revealed';

interface RevealState {
  phase: RevealPhase;
  countdownValue: number;
}

type RevealAction =
  | { type: 'start'; duration: number }
  | { type: 'tick' }
  | { type: 'reveal' }
  | { type: 'reset'; defaultValue: number }
  | { type: 'hydrate'; showCountdown: boolean; showReveal: boolean; value: number };

const reducer = (state: RevealState, action: RevealAction): RevealState => {
  switch (action.type) {
    case 'start':
      return { phase: 'countdown', countdownValue: action.duration };
    case 'tick': {
      if (state.phase !== 'countdown') return state;
      const nextValue = Math.max(0, state.countdownValue - 1);
      if (nextValue === 0) {
        return { phase: 'revealed', countdownValue: 0 };
      }
      return { ...state, countdownValue: nextValue };
    }
    case 'reveal':
      return { phase: 'revealed', countdownValue: 0 };
    case 'reset':
      return { phase: 'idle', countdownValue: action.defaultValue };
    case 'hydrate': {
      if (action.showReveal) {
        return { phase: 'revealed', countdownValue: action.value };
      }
      if (action.showCountdown) {
        return { phase: 'countdown', countdownValue: action.value };
      }
      return { phase: 'idle', countdownValue: action.value };
    }
    default:
      return state;
  }
};

export const useRevealStateMachine = (defaultCountdownValue = 5) => {
  const [state, dispatch] = useReducer(reducer, {
    phase: 'idle',
    countdownValue: defaultCountdownValue,
  });

  const start = useCallback(
    (duration: number) => dispatch({ type: 'start', duration }),
    []
  );
  const tick = useCallback(() => dispatch({ type: 'tick' }), []);
  const revealNow = useCallback(() => dispatch({ type: 'reveal' }), []);
  const reset = useCallback(
    () => dispatch({ type: 'reset', defaultValue: defaultCountdownValue }),
    [defaultCountdownValue]
  );
  const hydrate = useCallback(
    (showCountdown: boolean, showReveal: boolean, value: number) =>
      dispatch({ type: 'hydrate', showCountdown, showReveal, value }),
    []
  );

  return {
    phase: state.phase,
    countdownValue: state.countdownValue,
    showCountdown: state.phase === 'countdown',
    showRevealAnimation: state.phase === 'revealed',
    start,
    tick,
    revealNow,
    reset,
    hydrate,
  };
};
