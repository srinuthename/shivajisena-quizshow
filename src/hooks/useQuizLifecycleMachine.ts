import { useCallback, useReducer } from 'react';

export type GamePhase = 'idle' | 'running' | 'ended';
export type QuestionPhase = 'idle' | 'open' | 'revealCountdown' | 'revealed';
export type PowerplayPhase = 'inactive' | 'active';

export interface QuizLifecycleState {
  gamePhase: GamePhase;
  questionPhase: QuestionPhase;
  powerplayPhase: PowerplayPhase;
}

type QuizLifecycleAction =
  | { type: 'startGame' }
  | { type: 'endGame' }
  | { type: 'clearGameEnd' }
  | { type: 'openQuestion' }
  | { type: 'startReveal' }
  | { type: 'completeReveal' }
  | { type: 'closeQuestion' }
  | { type: 'startPowerplay' }
  | { type: 'endPowerplay' }
  | {
      type: 'hydrate';
      gameStarted: boolean;
      gameEnded: boolean;
      questionActive: boolean;
      showCountdown: boolean;
      showRevealAnimation: boolean;
      powerplayActive: boolean;
    }
  | { type: 'reset' };

const initialState: QuizLifecycleState = {
  gamePhase: 'idle',
  questionPhase: 'idle',
  powerplayPhase: 'inactive',
};

const reducer = (state: QuizLifecycleState, action: QuizLifecycleAction): QuizLifecycleState => {
  switch (action.type) {
    case 'startGame':
      return { ...state, gamePhase: 'running' };
    case 'endGame':
      return { gamePhase: 'ended', questionPhase: 'idle', powerplayPhase: 'inactive' };
    case 'clearGameEnd':
      return { ...state, gamePhase: 'running' };
    case 'openQuestion':
      if (state.gamePhase !== 'running') return state;
      return { ...state, questionPhase: 'open' };
    case 'startReveal':
      if (state.questionPhase === 'idle') return state;
      return { ...state, questionPhase: 'revealCountdown' };
    case 'completeReveal':
      if (state.questionPhase === 'idle') return state;
      return { ...state, questionPhase: 'revealed' };
    case 'closeQuestion':
      return { ...state, questionPhase: 'idle' };
    case 'startPowerplay':
      return { ...state, powerplayPhase: 'active' };
    case 'endPowerplay':
      return { ...state, powerplayPhase: 'inactive' };
    case 'hydrate': {
      const gamePhase: GamePhase = action.gameEnded
        ? 'ended'
        : action.gameStarted
          ? 'running'
          : 'idle';
      let questionPhase: QuestionPhase = 'idle';
      if (action.showRevealAnimation) questionPhase = 'revealed';
      else if (action.showCountdown) questionPhase = 'revealCountdown';
      else if (action.questionActive) questionPhase = 'open';

      const powerplayPhase: PowerplayPhase = action.powerplayActive ? 'active' : 'inactive';
      return { gamePhase, questionPhase, powerplayPhase };
    }
    case 'reset':
      return initialState;
    default:
      return state;
  }
};

export const useQuizLifecycleMachine = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startGame = useCallback(() => dispatch({ type: 'startGame' }), []);
  const endGame = useCallback(() => dispatch({ type: 'endGame' }), []);
  const clearGameEnd = useCallback(() => dispatch({ type: 'clearGameEnd' }), []);
  const openQuestion = useCallback(() => dispatch({ type: 'openQuestion' }), []);
  const startReveal = useCallback(() => dispatch({ type: 'startReveal' }), []);
  const completeReveal = useCallback(() => dispatch({ type: 'completeReveal' }), []);
  const closeQuestion = useCallback(() => dispatch({ type: 'closeQuestion' }), []);
  const startPowerplay = useCallback(() => dispatch({ type: 'startPowerplay' }), []);
  const endPowerplay = useCallback(() => dispatch({ type: 'endPowerplay' }), []);
  const hydrate = useCallback((payload: {
    gameStarted: boolean;
    gameEnded: boolean;
    questionActive: boolean;
    showCountdown: boolean;
    showRevealAnimation: boolean;
    powerplayActive: boolean;
  }) => {
    dispatch({ type: 'hydrate', ...payload });
  }, []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    ...state,
    startGame,
    endGame,
    clearGameEnd,
    openQuestion,
    startReveal,
    completeReveal,
    closeQuestion,
    startPowerplay,
    endPowerplay,
    hydrate,
    reset,
  };
};
