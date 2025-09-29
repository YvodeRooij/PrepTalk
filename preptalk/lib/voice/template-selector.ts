// Template Selector - Determines which prompt template to use based on round type
// Part of the tiered prompt system for voice interviews with intelligent fallbacks

export enum RoundTemplate {
  HEAVY = 'heavy',    // Early rounds: Full CV + coaching context + deep behavioral
  MEDIUM = 'medium',  // Mid rounds: Strategic focus + basic CV context
  LIGHT = 'light'     // Late rounds: Minimal context, cultural/executive focus
}

/**
 * Selects the appropriate prompt template with intelligent fallbacks
 * Handles known types, position-based logic, content inference, and duplicates
 *
 * @param roundType - The type of interview round
 * @param roundNumber - The round position (1-based index)
 * @returns The template type to use for prompt generation
 */
export function selectTemplateByRoundType(roundType: string, roundNumber?: number): RoundTemplate {
  // Direct mapping for known round types
  const templateMap: Record<string, RoundTemplate> = {
    'recruiter_screen': RoundTemplate.HEAVY,
    'behavioral_deep_dive': RoundTemplate.HEAVY,
    'strategic_role_discussion': RoundTemplate.MEDIUM,
    'culture_values_alignment': RoundTemplate.LIGHT,
    'executive_final': RoundTemplate.LIGHT,
    'technical_assessment': RoundTemplate.MEDIUM,
    'case_study': RoundTemplate.MEDIUM,
    'panel_interview': RoundTemplate.LIGHT,
    'final_interview': RoundTemplate.LIGHT
  };

  // Return direct match if available
  if (templateMap[roundType]) {
    return templateMap[roundType];
  }

  // Fallback strategy 1: Content-based inference
  const contentFallback = inferTemplateFromContent(roundType);
  if (contentFallback) {
    return contentFallback;
  }

  // Fallback strategy 2: Position-based logic
  if (roundNumber !== undefined) {
    return inferTemplateFromPosition(roundNumber);
  }

  // Final fallback: Conservative approach with full context
  return RoundTemplate.HEAVY;
}

/**
 * Infers template based on keywords in the round type name
 */
function inferTemplateFromContent(roundType: string): RoundTemplate | null {
  const type = roundType.toLowerCase();

  // Heavy template indicators (need full context)
  if (type.includes('recruiter') || type.includes('screening') ||
      type.includes('behavioral') || type.includes('experience') ||
      type.includes('background') || type.includes('technical_deep')) {
    return RoundTemplate.HEAVY;
  }

  // Light template indicators (cultural/executive focus)
  if (type.includes('culture') || type.includes('values') ||
      type.includes('executive') || type.includes('final') ||
      type.includes('leadership') || type.includes('panel')) {
    return RoundTemplate.LIGHT;
  }

  // Medium template indicators (strategic/role-specific)
  if (type.includes('strategic') || type.includes('role') ||
      type.includes('technical') || type.includes('case') ||
      type.includes('presentation')) {
    return RoundTemplate.MEDIUM;
  }

  return null;
}

/**
 * Infers template based on round position in interview sequence
 */
function inferTemplateFromPosition(roundNumber: number): RoundTemplate {
  if (roundNumber <= 2) {
    return RoundTemplate.HEAVY;  // Early rounds need full context
  } else if (roundNumber <= 3) {
    return RoundTemplate.MEDIUM; // Mid rounds focus on specific areas
  } else {
    return RoundTemplate.LIGHT;  // Later rounds are typically cultural/executive
  }
}