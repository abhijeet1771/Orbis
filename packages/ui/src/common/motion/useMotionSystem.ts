/**
 * React Hooks for Orbis Motion System
 *
 * Provides behavioral integration for components using the motion system.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ExecutiveHomeStateMachine,
  AwarenessLineController,
  StateMachineEvent,
  AwarenessLineState
} from './stateMachine.js';
import { awarenessLineController } from './awarenessLine.js';
import { ExecutiveHomeState, StateTrigger } from './motionSystem.js';

// =============================================================================
// STATE MACHINE HOOK
// =============================================================================

export function useExecutiveHomeState(): {
  currentState: ExecutiveHomeState
  transition: (trigger: StateTrigger) => boolean
  canTransition: (trigger: StateTrigger) => boolean
  validTransitions: string[]
} {
  const [currentState, setCurrentState] = useState<ExecutiveHomeState>('cold-entry');
  const stateMachineRef = useRef<ExecutiveHomeStateMachine>();

  useEffect(() => {
    stateMachineRef.current = new ExecutiveHomeStateMachine();

    const unsubscribe = stateMachineRef.current.subscribe((event) => {
      if (event.type === 'state-change') {
        setCurrentState(event.toState);
      }
    });

    return unsubscribe;
  }, []);

  const transition = useCallback((trigger: StateTrigger) => {
    return stateMachineRef.current?.transition(trigger) ?? false;
  }, []);

  const canTransition = useCallback((trigger: StateTrigger) => {
    return stateMachineRef.current?.canTransition(trigger) ?? false;
  }, []);

  const validTransitions = stateMachineRef.current?.getValidTransitions().map(t => t.trigger) ?? [];

  return {
    currentState,
    transition,
    canTransition,
    validTransitions
  };
}

// =============================================================================
// AWARENESS LINE HOOK
// =============================================================================

export function useAwarenessLine(): {
  awarenessState: AwarenessLineState
  triggerPulse: (event: 'data-load' | 'decision-update' | 'user-hover' | 'drill-down') => void
} {
  const [awarenessState, setAwarenessState] = useState<AwarenessLineState>(
    awarenessLineController.getState()
  );

  useEffect(() => {
    const unsubscribe = awarenessLineController.subscribe(setAwarenessState);
    return unsubscribe;
  }, []);

  const triggerPulse = useCallback((event: 'data-load' | 'decision-update' | 'user-hover' | 'drill-down') => {
    switch (event) {
      case 'data-load':
        awarenessLineController.onDataLoadComplete(0.9);
        break;
      case 'decision-update':
        awarenessLineController.onDecisionUpdate(0.8);
        break;
      case 'user-hover':
        awarenessLineController.onUserHoverDecision(0.7);
        break;
      case 'drill-down':
        awarenessLineController.onDrillDownAvailable(0.6);
        break;
    }
  }, []);

  return {
    awarenessState,
    triggerPulse
  };
}

// =============================================================================
// MOTION TIMING HOOK
// =============================================================================

export function useMotionTiming(duration: 'system-response' | 'awareness-pulse' | 'section-reveal' | 'state-transition'): number {
  // Return the midpoint of the timing range
  const ranges = {
    'system-response': 100,    // 80-120ms -> 100ms
    'awareness-pulse': 140,    // 120-160ms -> 140ms
    'section-reveal': 200,     // 180-220ms -> 200ms
    'state-transition': 270    // 240-300ms -> 270ms
  };

  return ranges[duration];
}

// =============================================================================
// MOTION VALIDATION HOOK
// =============================================================================

export function useMotionValidation() {
  const validateMotion = useCallback((
    motion: {
      reducesCognitiveLoad: boolean
      guidesAttention: boolean
      communicatesConfidence: boolean
      respectsAura: boolean
    }
  ) => {
    // CEO Test: If stared at for 30 seconds, does it feel assured or nervous?
    return (
      motion.reducesCognitiveLoad &&
      motion.guidesAttention &&
      motion.communicatesConfidence &&
      motion.respectsAura
    );
  }, []);

  return { validateMotion };
}

// =============================================================================
// STATE TRANSITION HOOK
// =============================================================================

export function useStateTransition(
  onTransition?: (from: ExecutiveHomeState, to: ExecutiveHomeState, trigger: StateTrigger) => void
) {
  const [transitionHistory, setTransitionHistory] = useState<StateMachineEvent[]>([]);
  const stateMachineRef = useRef<ExecutiveHomeStateMachine>();

  useEffect(() => {
    stateMachineRef.current = new ExecutiveHomeStateMachine();

    const unsubscribe = stateMachineRef.current.subscribe((event) => {
      if (event.type === 'state-change' && onTransition) {
        onTransition(event.fromState, event.toState, event.trigger);
      }
      setTransitionHistory(prev => [...prev, event]);
    });

    return unsubscribe;
  }, [onTransition]);

  return {
    transitionHistory: transitionHistory.slice(-10), // Last 10 transitions
    getCurrentState: () => stateMachineRef.current?.getCurrentState() ?? 'cold-entry'
  };
}
