/**
 * Micro-Interactions System - Phase 8.7
 *
 * 4 Interaction Types:
 * 1. Affirmation - "Yes, this is interactive"
 * 2. Guidance - "This is what happens if you click"
 * 3. Transition - "You moved deeper, not elsewhere"
 * 4. Confirmation - "The system accepted your action"
 */

export type InteractionType = 'affirmation' | 'guidance' | 'transition' | 'confirmation';

export interface InteractionConfig {
  type: InteractionType;
  element: HTMLElement;
  options?: InteractionOptions;
}

export interface InteractionOptions {
  duration?: number;
  easing?: 'ease-out' | 'linear';
  delay?: number;
  restrained?: boolean;
}

export class MicroInteractions {
  private static instance: MicroInteractions;
  private activeInteractions = new Map<string, InteractionConfig>();

  static getInstance(): MicroInteractions {
    if (!MicroInteractions.instance) {
      MicroInteractions.instance = new MicroInteractions();
    }
    return MicroInteractions.instance;
  }

  applyInteraction(config: InteractionConfig): void {
    const { type, element, options = {} } = config;
    const elementId = this.getElementId(element);

    // Remove existing interaction classes
    this.clearInteraction(element);

    // Apply new interaction class
    element.classList.add(`interaction-${type}`);

    // Apply options
    if (options.restrained) {
      element.classList.add('interaction-restrained');
    }

    if (options.duration) {
      element.style.transitionDuration = `${options.duration}ms`;
    }

    if (options.delay) {
      element.style.transitionDelay = `${options.delay}ms`;
    }

    // Store active interaction
    this.activeInteractions.set(elementId, config);

    // Set up event listeners for special cases
    this.setupEventListeners(config);
  }

  clearInteraction(element: HTMLElement): void {
    const elementId = this.getElementId(element);

    // Remove all interaction classes
    element.classList.remove(
      'interaction-affirmation',
      'interaction-guidance',
      'interaction-transition',
      'interaction-confirmation',
      'interaction-restrained',
      'interaction-no-elastic',
      'interaction-no-loop',
      'interaction-no-celebration',
      'interaction-no-color-cycle'
    );

    // Reset custom styles
    element.style.transitionDuration = '';
    element.style.transitionDelay = '';

    // Remove from active interactions
    this.activeInteractions.delete(elementId);
  }

  triggerConfirmation(element: HTMLElement): void {
    element.classList.add('confirmed');
    setTimeout(() => {
      element.classList.remove('confirmed');
    }, 300); // Single pulse duration
  }

  private setupEventListeners(config: InteractionConfig): void {
    const { type, element } = config;

    if (type === 'guidance') {
      // Guidance interactions need click tracking
      const handleClick = () => {
        // Could trigger analytics or special feedback here
        console.log('Guidance interaction triggered:', element);
      };

      element.addEventListener('click', handleClick, { once: true });
    }
  }

  private getElementId(element: HTMLElement): string {
    return element.id || `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// EXECUTIVE HOME SPECIFIC INTERACTIONS
// =============================================================================

export class ExecutiveHomeInteractions {
  private microInteractions = MicroInteractions.getInstance();

  initialize(): void {
    this.setupVerdictInteractions();
    this.setupMetricsInteractions();
    this.setupFailureInteractions();
    this.setupIntelligenceInteractions();
    this.setupNavigationInteractions();
  }

  private setupVerdictInteractions(): void {
    const verdictBlock = document.querySelector('.executive-home__verdict-primary');
    if (verdictBlock) {
      this.microInteractions.applyInteraction({
        type: 'affirmation',
        element: verdictBlock as HTMLElement
      });

      // Add click handler for drill-down
      verdictBlock.addEventListener('click', () => {
        // Trigger transition to "Why this decision" section
        this.triggerDecisionDrilldown();
      });
    }
  }

  private setupMetricsInteractions(): void {
    const metricItems = document.querySelectorAll('.executive-home__snapshot-item');
    metricItems.forEach(item => {
      this.microInteractions.applyInteraction({
        type: 'guidance',
        element: item as HTMLElement
      });

      item.addEventListener('click', () => {
        // Filter Execution Index based on metric type
        const metricType = item.getAttribute('data-metric');
        this.triggerMetricFilter(metricType);
      });
    });
  }

  private setupFailureInteractions(): void {
    const failureItems = document.querySelectorAll('.executive-home__failure-item');
    failureItems.forEach(item => {
      this.microInteractions.applyInteraction({
        type: 'guidance',
        element: item as HTMLElement
      });

      item.addEventListener('click', () => {
        // Slide Debugger from right
        const testId = item.getAttribute('data-test-id');
        this.triggerDebuggerTransition(testId);
      });
    });
  }

  private setupIntelligenceInteractions(): void {
    const intelligenceBlocks = document.querySelectorAll('.executive-home__intelligence-block');
    intelligenceBlocks.forEach(block => {
      this.microInteractions.applyInteraction({
        type: 'affirmation',
        element: block as HTMLElement
      });
    });
  }

  private setupNavigationInteractions(): void {
    const navItems = document.querySelectorAll('.executive-home__nav-item');
    navItems.forEach(item => {
      this.microInteractions.applyInteraction({
        type: 'guidance',
        element: item as HTMLElement
      });
    });
  }

  private triggerDecisionDrilldown(): void {
    // Smooth scroll to decision trace section
    const decisionSection = document.querySelector('.executive-home__decision-trace');
    if (decisionSection) {
      decisionSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  private triggerMetricFilter(metricType: string | null): void {
    if (!metricType) return;

    // Construct URL with filter parameters
    const baseUrl = '/runs/current/index';
    const filterParams = this.getMetricFilterParams(metricType);
    const url = `${baseUrl}?${filterParams}`;

    // Navigate with transition
    window.location.href = url;
  }

  private triggerDebuggerTransition(testId: string | null): void {
    if (!testId) return;

    // Apply transition class to body or container
    document.body.classList.add('interaction-transition--enter');

    // Navigate after brief delay
    setTimeout(() => {
      window.location.href = `/runs/current/tests/${testId}/debugger`;
    }, 150);
  }

  private getMetricFilterParams(metricType: string): string {
    const filterMap: Record<string, string> = {
      'pass-rate': 'status=passed',
      'failures': 'status=failed',
      'flaky': 'status=flaky',
      'regressions': 'regressions=true'
    };
    return filterMap[metricType] || '';
  }
}

// =============================================================================
// INTERACTION VALIDATION
// =============================================================================

export function validateMicroInteraction(
  element: HTMLElement,
  context: 'reduce-cognitive-load' | 'confirm-intent' | 'prevent-confusion'
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for motion restraint violations
  if (element.style.animationName && element.style.animationIterationCount === 'infinite') {
    issues.push('Infinite animations violate motion restraint rules');
  }

  if (element.style.transitionTimingFunction?.includes('elastic') ||
      element.style.transitionTimingFunction?.includes('bounce')) {
    issues.push('Elastic/bounce easing violates motion restraint rules');
  }

  // Check context appropriateness
  if (context === 'reduce-cognitive-load') {
    // Should have clear, immediate feedback
    const hasTransition = element.style.transition !== '';
    if (!hasTransition) {
      issues.push('Missing transition for cognitive load reduction');
    }
  }

  if (context === 'confirm-intent') {
    // Should provide clear next-step indication
    const hasGuidance = element.classList.contains('interaction-guidance');
    if (!hasGuidance && element.tagName === 'A') {
      issues.push('Links should have guidance interactions');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// =============================================================================
// KEYBOARD INTERACTIONS
// =============================================================================

export class KeyboardInteractions {
  private focusableElements: NodeListOf<HTMLElement>;
  private currentFocusIndex = -1;

  constructor(container: HTMLElement = document.body) {
    this.focusableElements = container.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          this.navigate(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.navigate(1);
          break;
        case 'Enter':
          this.activateCurrent();
          break;
        case 'Escape':
          this.retreat();
          break;
      }
    });
  }

  private navigate(direction: number): void {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex += direction;

    if (this.currentFocusIndex < 0) {
      this.currentFocusIndex = this.focusableElements.length - 1;
    } else if (this.currentFocusIndex >= this.focusableElements.length) {
      this.currentFocusIndex = 0;
    }

    this.focusableElements[this.currentFocusIndex].focus();
  }

  private activateCurrent(): void {
    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.length) {
      const element = this.focusableElements[this.currentFocusIndex];
      if (element.tagName === 'A' || element.tagName === 'BUTTON') {
        (element as HTMLAnchorElement | HTMLButtonElement).click();
      }
    }
  }

  private retreat(): void {
    // Navigate back in history or close modal
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Find and close any open modals or return to previous state
      const openModal = document.querySelector('[role="dialog"]');
      if (openModal) {
        (openModal as HTMLElement).style.display = 'none';
      }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const executiveHomeInteractions = new ExecutiveHomeInteractions();
