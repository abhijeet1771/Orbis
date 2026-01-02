/**
 * Orbis Micro-Interactions System - Phase 8.7
 *
 * Prime Law: Micro-interactions must reduce cognitive load, not add delight noise.
 *
 * 4 Interaction Types:
 * 1. Affirmation - "Yes, this is interactive"
 * 2. Guidance - "This is what happens if you click"
 * 3. Transition - "You moved deeper, not elsewhere"
 * 4. Confirmation - "The system accepted your action"
 *
 * Executive Home Specific:
 * - Release Readiness: faint boundary reveal on hover
 * - Metrics: numeric emphasis on hover, filter on click
 * - Failed Tests: row highlight, directional hint, Debugger slide
 * - Risk Areas: inline contextual explanations
 *
 * Motion Restraint: No bouncing, elastic, infinite loops, celebrations
 * Keyboard: ↑↓ navigation, Enter activation, Esc retreat
 */

// Import micro-interactions system
import './interactions.css';

// Export interaction system
export * from './interactions.js';

// Initialize Executive Home interactions
import { executiveHomeInteractions } from './interactions.js';

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      executiveHomeInteractions.initialize();
    });
  } else {
    executiveHomeInteractions.initialize();
  }
}
