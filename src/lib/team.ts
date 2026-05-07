/**
 * Team configuration — reads from TEAM_MEMBERS env variable
 */

export interface TeamMemberConfig {
  name: string;
  cf: string;      // Codeforces handle
  cses: string;    // CSES username
  csesPass: string; // CSES password (each member needs their own — CSES only shows YOUR submissions)
  csesId: string;  // CSES user ID (from https://cses.fi/user/XXXXX)
}

export function getTeamMembers(): TeamMemberConfig[] {
  const raw = process.env.TEAM_MEMBERS;
  if (!raw) {
    console.warn("TEAM_MEMBERS env variable is not set");
    return [];
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error("Failed to parse TEAM_MEMBERS env variable");
    return [];
  }
}

export function getTeamName(): string {
  return "Cooperativa los Trapitos";
}
