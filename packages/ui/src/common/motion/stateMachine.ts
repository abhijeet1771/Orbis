/**
 * Executive Home State Machine Implementation
 *
 * Manages state transitions and motion contracts for the Orbis Executive Home.
 * Pure behavioral logic - no DOM manipulation.
 */

import {
  ExecutiveHomeState,
  StateTransition,
  StateTrigger,
  EXECUTIVE_HOME_TRANSITIONS,
  MotionContract,
  validateStateTransition
} from './motionSystem.js';

export interface StateMachineEvent {
  type: 'state-change' | 'motion-trigger' | 'validation-failure'
  fromState: ExecutiveHomeState
  toState: ExecutiveHomeState
  trigger: StateTrigger
  motion?: MotionContract
  timestamp: number
}

export class ExecutiveHomeStateMachine {
  private currentState: ExecutiveHomeState = 'cold-entry';
  private eventHistory: StateMachineEvent[] = [];
  private listeners: Array<(event: StateMachineEvent) => void> = [];

  constructor() {
    this.logEvent({
      type: 'state-change',
      fromState: 'cold-entry',
      toState: 'cold-entry',
      trigger: 'ftx-complete',
      timestamp: Date.now()
    });
  }

  getCurrentState(): ExecutiveHomeState {
    return this.currentState;
  }

  getValidTransitions(): StateTransition[] {
    return EXECUTIVE_HOME_TRANSITIONS.filter(t => t.from === this.currentState);
  }

  canTransition(trigger: StateTrigger): boolean {
    return this.getValidTransitions().some(t => t.trigger === trigger);
  }

  transition(trigger: StateTrigger): boolean {
    const validTransition = EXECUTIVE_HOME_TRANSITIONS.find(
      t => t.from === this.currentState && t.trigger === trigger
    );

    if (!validTransition) {
      this.logEvent({
        type: 'validation-failure',
        fromState: this.currentState,
        toState: this.currentState,
        trigger,
        timestamp: Date.now()
      });
      return false;
    }

    // Validate motion contract against executive test
    if (!validateStateTransition(validTransition)) {
      this.logEvent({
        type: 'validation-failure',
        fromState: this.currentState,
        toState: validTransition.to,
        trigger,
        motion: validTransition.motion,
        timestamp: Date.now()
      });
      return false;
    }

    const previousState = this.currentState;
    this.currentState = validTransition.to;

    this.logEvent({
      type: 'state-change',
      fromState: previousState,
      toState: this.currentState,
      trigger,
      motion: validTransition.motion,
      timestamp: Date.now()
    });

    this.logEvent({
      type: 'motion-trigger',
      fromState: previousState,
      toState: this.currentState,
      trigger,
      motion: validTransition.motion,
      timestamp: Date.now()
    });

    return true;
  }

  subscribe(listener: (event: StateMachineEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getEventHistory(): StateMachineEvent[] {
    return [...this.eventHistory];
  }

  private logEvent(event: StateMachineEvent): void {
    this.eventHistory.push(event);
    this.listeners.forEach(listener => listener(event));

    // Keep only last 100 events for memory efficiency
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
  }
}

// =============================================================================
// AWARENESS SYSTEM (Reframed from "Blue Ray")
// =============================================================================

export interface AwarenessEvent {
  type: 'pulse-trigger' | 'presence-update'
  trigger: 'data-load-complete' | 'decision-update' | 'user-hover-decision' | 'drill-down-available'
  timestamp: number
  confidence: number // 0-1, affects pulse intensity
}

export class AwarenessSystem {
  private pulseHistory: AwarenessEvent[] = [];
  private isActive: boolean = true;

  triggerPulse(trigger: AwarenessEvent['trigger'], confidence: number = 0.8): void {
    if (!this.isActive) return;

    const event: AwarenessEvent = {
      type: 'pulse-trigger',
      trigger,
      timestamp: Date.now(),
      confidence
    };

    this.pulseHistory.push(event);

    // Keep only last 50 pulses
    if (this.pulseHistory.length > 50) {
      this.pulseHistory = this.pulseHistory.slice(-50);
    }
  }

  setActive(active: boolean): void {
    this.isActive = active;
  }

  getPulseHistory(): AwarenessEvent[] {
    return [...this.pulseHistory];
  }

  getLastPulse(): AwarenessEvent | null {
    return this.pulseHistory[this.pulseHistory.length - 1] || null;
  }

  shouldPulse(trigger: AwarenessEvent['trigger']): boolean {
    // Only pulse for meaningful events, not constant traversal
    return [
      'data-load-complete',
      'decision-update',
      'user-hover-decision',
      'drill-down-available'
    ].includes(trigger);
  }
}

// =============================================================================
// MOTION EXECUTOR CONTRACT
// =============================================================================

export interface MotionExecutionRequest {
  contract: MotionContract
  elementId: string
  stateContext: {
    fromState: ExecutiveHomeState
    toState: ExecutiveHomeState
    trigger: StateTrigger
  }
}

export interface MotionExecutor {
  execute(request: MotionExecutionRequest): Promise<void>
  cancel(elementId: string): void
  getActiveMotions(): string[]
}

// This would be implemented by the view layer (React/CSS)
// Here we define the contract only
