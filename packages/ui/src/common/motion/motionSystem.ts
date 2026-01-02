/**
 * Phase 8.3 - Orbis Motion System & State-Based Transitions
 *
 * This file defines the behavioral contracts for Orbis motion.
 * No visuals. No CSS. Pure philosophy + state management.
 *
 * Prime Directive: Motion must communicate state, not decorate UI.
 * Orbis Aura: Quiet Authority (assured, observant, grounded, analytical)
 */

// =============================================================================
// ORBIS MOTION PERSONALITY (LOCKED)
// =============================================================================

export const ORBIS_MOTION_PERSONALITY = {
  calm: true,
  predictable: true,
  intentional: true,
  alive: true, // Not energetic
  playful: false,
  surprising: false,
  aura: 'quiet-authority' as const
} as const;

// =============================================================================
// MOTION TIMING SCALE (LOCKED)
// =============================================================================

export const MOTION_TIMING_SCALE = {
  systemResponse: { min: 80, max: 120 },    // Quick feedback
  awarenessPulse: { min: 120, max: 160 },   // Intelligence signal
  sectionReveal: { min: 180, max: 220 },    // New information
  stateTransition: { min: 240, max: 300 }   // Major change
} as const;

// =============================================================================
// EXECUTIVE HOME STATE MACHINE
// =============================================================================

export type ExecutiveHomeState =
  | 'cold-entry'      // FTX first load
  | 'awareness'       // Idle, system-aware state
  | 'decision-stable' // Content loaded, stable
  | 'attention-shift' // User interaction (hover/focus)
  | 'drill-down-exit' // Navigating to detail views

export interface StateTransition {
  from: ExecutiveHomeState
  to: ExecutiveHomeState
  trigger: StateTrigger
  motion: MotionContract
}

export type StateTrigger =
  | 'ftx-complete'           // FTX finishes
  | 'data-load'              // Initial data arrives
  | 'decision-change'        // Verdict updates
  | 'user-hover'             // Mouse interaction
  | 'user-focus'             // Keyboard focus
  | 'drill-down-click'       // Navigation to details
  | 'idle-timeout'           // Return to stable state

// =============================================================================
// MOTION CONTRACTS (BEHAVIOR DEFINITIONS)
// =============================================================================

export interface MotionContract {
  type: MotionType
  duration: MotionDuration
  easing: MotionEasing
  properties: MotionProperty[]
  trigger: MotionTrigger
  validation: MotionValidation
}

export type MotionType =
  | 'opacity-modulation'    // Awareness line pulse
  | 'vertical-fade-lift'   // Cold entry transition
  | 'horizontal-presence'  // Awareness line base state
  | 'content-compress'     // Drill-down exit
  | 'shared-axis-slide'    // View transitions
  | 'property-weight'      // Hover state changes

export type MotionDuration =
  | 'system-response'      // 80-120ms
  | 'awareness-pulse'      // 120-160ms
  | 'section-reveal'       // 180-220ms
  | 'state-transition'     // 240-300ms

export type MotionEasing =
  | 'ease-out'            // Standard deceleration
  | 'linear'              // Constant velocity (rare)
  | 'ease-out-sine'       // Smooth deceleration

export type MotionProperty =
  | 'opacity'             // Transparency changes
  | 'transform-y'         // Vertical movement
  | 'border-weight'       // Underline thickness
  | 'color-weight'        // Color intensity
  | 'elevation'           // Visual depth (conceptual)

export type MotionTrigger =
  | 'immediate'           // Trigger on state change
  | 'data-event'          // Trigger on data update
  | 'user-event'          // Trigger on interaction
  | 'once-per-session'    // Single occurrence

export interface MotionValidation {
  reducesCognitiveLoad: boolean
  guidesAttention: boolean
  communicatesConfidence: boolean
  respectsAura: boolean
}

// =============================================================================
// STATE TRANSITION MATRIX
// =============================================================================

export const EXECUTIVE_HOME_TRANSITIONS: StateTransition[] = [
  // Cold Entry → Awareness (FTX complete)
  {
    from: 'cold-entry',
    to: 'awareness',
    trigger: 'ftx-complete',
    motion: {
      type: 'vertical-fade-lift',
      duration: 'state-transition',
      easing: 'ease-out',
      properties: ['opacity', 'transform-y'],
      trigger: 'immediate',
      validation: {
        reducesCognitiveLoad: true,
        guidesAttention: true,
        communicatesConfidence: true,
        respectsAura: true
      }
    }
  },

  // Awareness → Decision Stable (data loads)
  {
    from: 'awareness',
    to: 'decision-stable',
    trigger: 'data-load',
    motion: {
      type: 'opacity-modulation',
      duration: 'awareness-pulse',
      easing: 'ease-out',
      properties: ['opacity'],
      trigger: 'data-event',
      validation: {
        reducesCognitiveLoad: true,
        guidesAttention: true,
        communicatesConfidence: true,
        respectsAura: true
      }
    }
  },

  // Decision Stable → Attention Shift (hover/focus)
  {
    from: 'decision-stable',
    to: 'attention-shift',
    trigger: 'user-hover',
    motion: {
      type: 'property-weight',
      duration: 'system-response',
      easing: 'ease-out',
      properties: ['border-weight', 'color-weight', 'elevation'],
      trigger: 'user-event',
      validation: {
        reducesCognitiveLoad: true,
        guidesAttention: true,
        communicatesConfidence: true,
        respectsAura: true
      }
    }
  },

  // Attention Shift → Decision Stable (idle timeout)
  {
    from: 'attention-shift',
    to: 'decision-stable',
    trigger: 'idle-timeout',
    motion: {
      type: 'property-weight',
      duration: 'system-response',
      easing: 'ease-out',
      properties: ['border-weight', 'color-weight', 'elevation'],
      trigger: 'immediate',
      validation: {
        reducesCognitiveLoad: true,
        guidesAttention: true,
        communicatesConfidence: true,
        respectsAura: true
      }
    }
  },

  // Any State → Drill-down Exit (navigation)
  {
    from: 'decision-stable',
    to: 'drill-down-exit',
    trigger: 'drill-down-click',
    motion: {
      type: 'content-compress',
      duration: 'state-transition',
      easing: 'ease-out',
      properties: ['transform-y', 'opacity'],
      trigger: 'immediate',
      validation: {
        reducesCognitiveLoad: true,
        guidesAttention: true,
        communicatesConfidence: true,
        respectsAura: true
      }
    }
  }
];

// =============================================================================
// AWARENESS LINE CONTRACT (Reframed from "Blue Ray")
// =============================================================================

export interface AwarenessLineContract {
  state: 'presence' | 'pulse'
  position: 'executive-core-center'
  behavior: 'reactive-only'
  triggers: AwarenessTrigger[]
  motion: {
    type: 'opacity-modulation'
    duration: 'awareness-pulse'
    range: { min: 0.3, max: 0.6 }
    frequency: 'once-per-event'
  }
}

export type AwarenessTrigger =
  | 'data-load-complete'
  | 'decision-update'
  | 'user-hover-decision'
  | 'drill-down-available'

// =============================================================================
// MOTION ANTI-PATTERNS (BANNED FOREVER)
// =============================================================================

export const BANNED_MOTION_PATTERNS = [
  'infinite-animations',
  'background-gradients-shifting',
  'loading-spinners',
  'skeleton-shimmer-on-home',
  'bounce-elastic-easing',
  'scroll-driven-animations',
  'constant-traversal',
  'pulse-loops',
  'movement-without-cause',
  'decorative-motion'
] as const;

// =============================================================================
// EXECUTIVE TEST VALIDATION
// =============================================================================

export function validateMotionContract(contract: MotionContract): boolean {
  return (
    contract.validation.reducesCognitiveLoad &&
    contract.validation.guidesAttention &&
    contract.validation.communicatesConfidence &&
    contract.validation.respectsAura
  );
}

export function validateStateTransition(transition: StateTransition): boolean {
  // CEO Test: If stared at for 30 seconds, does it feel assured or nervous?
  return (
    transition.motion.duration !== 'awareness-pulse' || // No constant pulsing
    transition.motion.properties.includes('opacity') && // Subtle communication
    !transition.motion.properties.includes('transform-y') // No unnecessary movement
  );
}

// =============================================================================
// MOTION SYSTEM INITIALIZATION
// =============================================================================

export class OrbisMotionSystem {
  private currentState: ExecutiveHomeState = 'cold-entry';
  private awarenessLine: AwarenessLineContract;

  constructor() {
    this.awarenessLine = {
      state: 'presence',
      position: 'executive-core-center',
      behavior: 'reactive-only',
      triggers: ['data-load-complete', 'decision-update', 'user-hover-decision', 'drill-down-available'],
      motion: {
        type: 'opacity-modulation',
        duration: 'awareness-pulse',
        range: { min: 0.3, max: 0.6 },
        frequency: 'once-per-event'
      }
    };
  }

  getCurrentState(): ExecutiveHomeState {
    return this.currentState;
  }

  getValidTransitions(): StateTransition[] {
    return EXECUTIVE_HOME_TRANSITIONS.filter(t => t.from === this.currentState);
  }

  getAwarenessLineState(): AwarenessLineContract {
    return this.awarenessLine;
  }

  // Motion execution would be handled by the view layer
  // This is the behavioral contract definition only
}
