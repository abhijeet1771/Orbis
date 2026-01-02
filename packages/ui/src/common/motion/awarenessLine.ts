/**
 * Awareness Line Implementation
 *
 * The reframed "blue ray" - a horizontal presence line that reacts to system events.
 * No constant movement. No decoration. Pure intelligence signaling.
 */

import { AwarenessSystem, AwarenessEvent } from './stateMachine.js';

export interface AwarenessLineState {
  opacity: number
  isPulsing: boolean
  lastPulse: AwarenessEvent | null
  confidence: number
}

export class AwarenessLineController {
  private awareness: AwarenessSystem;
  private currentState: AwarenessLineState;
  private listeners: Array<(state: AwarenessLineState) => void> = [];

  constructor() {
    this.awareness = new AwarenessSystem();
    this.currentState = {
      opacity: 0.4, // Base presence opacity
      isPulsing: false,
      lastPulse: null,
      confidence: 0.5
    };
  }

  getState(): AwarenessLineState {
    return { ...this.currentState };
  }

  subscribe(listener: (state: AwarenessLineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Event triggers - these cause the awareness pulses
  onDataLoadComplete(confidence: number = 0.9): void {
    if (this.awareness.shouldPulse('data-load-complete')) {
      this.awareness.triggerPulse('data-load-complete', confidence);
      this.executePulse(confidence);
    }
  }

  onDecisionUpdate(confidence: number = 0.8): void {
    if (this.awareness.shouldPulse('decision-update')) {
      this.awareness.triggerPulse('decision-update', confidence);
      this.executePulse(confidence);
    }
  }

  onUserHoverDecision(confidence: number = 0.7): void {
    if (this.awareness.shouldPulse('user-hover-decision')) {
      this.awareness.triggerPulse('user-hover-decision', confidence);
      this.executePulse(confidence);
    }
  }

  onDrillDownAvailable(confidence: number = 0.6): void {
    if (this.awareness.shouldPulse('drill-down-available')) {
      this.awareness.triggerPulse('drill-down-available', confidence);
      this.executePulse(confidence);
    }
  }

  private executePulse(confidence: number): void {
    const lastPulse = this.awareness.getLastPulse();
    if (!lastPulse) return;

    // Start pulse
    this.currentState.isPulsing = true;
    this.currentState.lastPulse = lastPulse;
    this.currentState.confidence = confidence;

    // Calculate pulse intensity based on confidence
    const baseOpacity = 0.4;
    const pulseIntensity = Math.max(0.6, Math.min(0.9, baseOpacity + (confidence * 0.5)));

    this.currentState.opacity = pulseIntensity;
    this.notifyListeners();

    // End pulse after timing scale (120-160ms)
    const pulseDuration = 140; // Within awareness-pulse range
    setTimeout(() => {
      this.currentState.isPulsing = false;
      this.currentState.opacity = baseOpacity;
      this.notifyListeners();
    }, pulseDuration);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

// =============================================================================
// AWARENESS LINE VALIDATION
// =============================================================================

export function validateAwarenessLineBehavior(state: AwarenessLineState): boolean {
  // CEO Test: Does this feel assured or nervous when stared at for 30 seconds?

  // Should not be constantly pulsing
  if (state.isPulsing && !state.lastPulse) return false;

  // Opacity should be subtle, not attention-grabbing
  if (state.opacity > 0.9) return false;

  // Should communicate intelligence, not decoration
  if (state.isPulsing && state.confidence < 0.3) return false;

  return true;
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const awarenessLineController = new AwarenessLineController();
