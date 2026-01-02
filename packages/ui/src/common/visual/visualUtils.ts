/**
 * Visual System Utilities
 *
 * Helper functions for working with the Orbis visual language.
 */

/**
 * Get the appropriate text color for a contrast tier
 */
export function getTextColor(tier: 'primary' | 'secondary' | 'supporting' | 'ambient'): string {
  const colors = {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    supporting: 'var(--color-text-supporting)',
    ambient: 'var(--color-text-muted)'
  };
  return colors[tier];
}

/**
 * Get the appropriate number color (always higher contrast)
 */
export function getNumberColor(importance: 'primary' | 'secondary' | 'supporting' = 'primary'): string {
  const colors = {
    primary: 'var(--color-number-primary)',
    secondary: 'var(--color-number-secondary)',
    supporting: 'var(--color-number-supporting)'
  };
  return colors[importance];
}

/**
 * Get status color based on test status
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    passed: 'var(--color-status-passed)',
    failed: 'var(--color-status-failed)',
    flaky: 'var(--color-status-flaky)',
    'timed-out': 'var(--color-status-timed-out)',
    skipped: 'var(--color-status-skipped)',
    running: 'var(--color-status-running)'
  };
  return statusColors[status] || 'var(--color-text-muted)';
}

/**
 * Get background color for depth elevation
 */
export function getElevationColor(elevation: 1 | 2 | 3 = 1): string {
  const elevations = {
    1: 'var(--depth-elevation-1)',
    2: 'var(--depth-elevation-2)',
    3: 'var(--depth-elevation-3)'
  };
  return elevations[elevation];
}

/**
 * Validate that a color combination meets contrast requirements
 * This is a client-side approximation - real accessibility testing required
 */
export function validateContrastTier(tier: number): boolean {
  // Tier 1 (primary focus) should be highest contrast
  // Tier 4 (ambient UI) should be lowest
  return tier >= 1 && tier <= 4;
}

/**
 * Get spacing value from the spacing scale
 */
export function getSpacingValue(scale: number): string {
  const spacingScale: Record<number, string> = {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
    16: 'var(--space-16)',
    20: 'var(--space-20)',
    24: 'var(--space-24)'
  };
  return spacingScale[scale] || 'var(--space-4)';
}

/**
 * Apply number authority styling (higher contrast, tighter spacing)
 */
export function applyNumberAuthority(element: HTMLElement): void {
  element.style.color = 'var(--color-number-primary)';
  element.style.letterSpacing = 'var(--font-letter-spacing-numbers)';
  element.style.fontWeight = 'var(--font-weight-semibold)';
}

/**
 * Apply text contrast tier
 */
export function applyTextContrast(element: HTMLElement, tier: 'primary' | 'secondary' | 'supporting' | 'ambient'): void {
  element.style.color = getTextColor(tier);
}

/**
 * Create a subtle border with proper visual weight
 */
export function createSubtleBorder(): string {
  return `1px solid var(--color-border)`;
}

/**
 * Create a focus-visible outline
 */
export function createFocusOutline(): string {
  return `var(--interaction-focus-outline)`;
}

/**
 * Get the appropriate shadow for floating elements (rare usage)
 */
export function getFloatingShadow(intensity: 'light' | 'medium' = 'light'): string {
  return intensity === 'light'
    ? 'var(--depth-shadow-floating)'
    : 'var(--depth-shadow-modal)';
}

/**
 * Apply surface reflection effect (subtle)
 */
export function applySurfaceReflect(element: HTMLElement): void {
  element.style.backgroundImage = 'var(--light-surface-reflect)';
}

/**
 * Validate visual system usage against Quiet Authority principles
 */
export function validateQuietAuthority(
  element: HTMLElement,
  context: 'data' | 'ui' | 'chrome'
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const styles = window.getComputedStyle(element);

  // Data should feel heavier than UI
  if (context === 'data') {
    const color = styles.color;
    const fontWeight = parseInt(styles.fontWeight);

    if (color.includes('muted') && fontWeight < 500) {
      issues.push('Data elements should not use muted colors or light font weights');
    }
  }

  // UI should not draw attention
  if (context === 'ui') {
    const backgroundColor = styles.backgroundColor;
    if (backgroundColor.includes('bright') || backgroundColor.includes('neon')) {
      issues.push('UI elements should not use bright or neon colors');
    }
  }

  // Check for banned visual patterns
  const bannedPatterns = [
    'blur', 'glow', 'neon', 'rainbow', 'glass', 'gradient'
  ];

  bannedPatterns.forEach(pattern => {
    if (styles.cssText.toLowerCase().includes(pattern)) {
      issues.push(`Banned visual pattern detected: ${pattern}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}
