/**
 * Orbis Motion System - Phase 8.3
 *
 * Behavioral contracts for state-driven motion.
 * No visuals. No CSS. Pure philosophy + state management.
 */

// Core system definitions
export * from './motionSystem.js';

// State machine implementation
export * from './stateMachine.js';

// Awareness line (reframed "blue ray")
export * from './awarenessLine.js';

// React hooks for motion integration
export * from './useMotionSystem.js';

// =============================================================================
// MOTION SYSTEM PHILOSOPHY SUMMARY
// =============================================================================

/**
 * Prime Directive: Motion must communicate state, not decorate UI.
 *
 * Orbis Aura: Quiet Authority
 * - Assured, not urgent
 * - Observant, not excited
 * - Grounded, not reactive
 * - Analytical, not flashy
 *
 * States, not screens:
 * - Cold Entry (FTX) → Awareness
 * - Awareness → Decision Stable
 * - Decision Stable → Attention Shift
 * - Any → Drill-down Exit
 *
 * Motion contracts are validated against:
 * - Reduces cognitive load?
 * - Guides attention?
 * - Communicates confidence?
 * - Respects aura?
 *
 * Banned: Infinite animations, decorative motion, constant traversal.
 */
