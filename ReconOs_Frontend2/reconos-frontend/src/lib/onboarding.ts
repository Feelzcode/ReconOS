export function needsOnboarding(org: { industryTemplate?: string | null } | null | undefined): boolean {
  return !org?.industryTemplate;
}

export function postAuthPath(org: { industryTemplate?: string | null } | null | undefined): string {
  return needsOnboarding(org) ? '/onboarding' : '/dashboard';
}
