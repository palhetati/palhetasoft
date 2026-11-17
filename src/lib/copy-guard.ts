const FORBIDDEN_DASH_REGEX = /[\u2014\u2013]/;

export function validateUserFacingCopy(text: string): { valid: boolean; reason?: string } {
  if (FORBIDDEN_DASH_REGEX.test(text)) {
    return {
      valid: false,
      reason: 'O texto contém travessões proibidos. Utilize apenas vírgulas, dois-pontos ou pontos finais.',
    };
  }
  return { valid: true };
}

export function sanitizeNoDashes(text: string): string {
  return text.replace(/\s*[\u2014\u2013]\s*/g, ', ');
}
