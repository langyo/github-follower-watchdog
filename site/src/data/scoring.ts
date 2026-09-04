/** Follower scoring — facts in (data/accounts.json, fetched by the
 * watchdog's bounded enrichment phase), score out.
 *
 * The model is deliberately transparent: additive points for the classic
 * human signals (real contribution volume, real follower/following
 * balance, public repos, a filled-in profile, account age), then two
 * multiplicative penalties for the classic bot shapes (mass-following
 * with no audience; an account that is empty in every dimension).
 * Groups: real >= 60, uncertain >= 30, suspect below. */

export interface AccountFacts {
  checked_at?: string;
  followers?: number;
  following?: number;
  public_repos?: number;
  created_at?: string;
  contributions?: number | null;
  profile_fields?: string[];
  missing?: boolean;
}

export type ScoreClass = "real" | "uncertain" | "suspect";

export interface Scored {
  score: number;
  cls: ScoreClass;
}

const AGE_WEIGHTS: [years: number, points: number][] = [
  [2, 15],
  [1, 10],
  [1 / 12, 5],
];

export function scoreFacts(facts: AccountFacts): Scored {
  if (facts.missing) return { score: 0, cls: "suspect" };

  let score = 0;

  // Following/following balance — mass-following is the loudest bot tell.
  const following = facts.following ?? 0;
  const followers = facts.followers ?? 0;
  if (following === 0) score += 25;
  else {
    const ratio = following / Math.max(followers, 1);
    if (ratio <= 2) score += 15;
    else if (ratio <= 5) score += 10;
    else if (ratio <= 10) score += 5;
  }

  // Contributions last year (null when GraphQL was unavailable → no points).
  const contributions = facts.contributions ?? 0;
  if (contributions >= 100) score += 30;
  else if (contributions >= 10) score += 20;
  else if (contributions >= 1) score += 10;

  // Public work.
  const repos = facts.public_repos ?? 0;
  if (repos >= 5) score += 15;
  else if (repos >= 1) score += 10;

  // A visible face: name/bio/company/location/blog.
  score += Math.min((facts.profile_fields?.length ?? 0) * 2, 10);

  // Age — freshly minted accounts that follow strangers are suspect.
  if (facts.created_at) {
    const years = (Date.now() - new Date(facts.created_at).getTime()) / (365.25 * 86400_000);
    for (const [threshold, points] of AGE_WEIGHTS) {
      if (years >= threshold) {
        score += points;
        break;
      }
    }
  }

  // Bot-shaped combos multiply down.
  if (following >= 500 && followers < 50) score *= 0.5;
  if (contributions <= 0 && repos === 0) score *= 0.6;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const cls: ScoreClass = score >= 60 ? "real" : score >= 30 ? "uncertain" : "suspect";
  return { score, cls };
}

export type ScoreGroup = "all" | ScoreClass | "unassessed";

export const GROUP_ORDER: Exclude<ScoreGroup, "all">[] = [
  "real",
  "uncertain",
  "suspect",
  "unassessed",
];
