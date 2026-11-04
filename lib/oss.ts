import {
  AWESOME_REPO,
  AWESOME_SNAPSHOT,
  OSS_ORG,
  OSS_REPOS,
  OSS_SNAPSHOT_DATE,
} from "@/data/oss";

/** How often the page refetches star and fork counts from GitHub. */
export const OSS_REVALIDATE_SECONDS = 6 * 60 * 60;

export type RepoCounts = { stars: number; forks: number };

export type OssStats = {
  awesome: RepoCounts;
  /** Studio1-OSS counts, keyed by repo name. */
  repos: Record<string, RepoCounts>;
  /** True when every number came from GitHub on this render. */
  live: boolean;
  /** Day the numbers were read (YYYY-MM-DD, UTC); ends the star chart. */
  asOf: string;
};

type GitHubRepo = {
  name: string;
  stargazers_count: number;
  forks_count: number;
  private?: boolean;
};

async function github<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "studio1hq.com",
  };
  // Optional: unauthenticated calls get 60 requests an hour per IP, which
  // shared build machines can run out of. A token with no scopes is enough.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, {
    headers,
    next: { revalidate: OSS_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
  return (await response.json()) as T;
}

/** Snapshot numbers from data/oss.ts, used whenever GitHub can't be reached. */
function snapshot(): OssStats {
  return {
    awesome: {
      stars: AWESOME_SNAPSHOT.stars,
      forks: AWESOME_SNAPSHOT.forks,
    },
    repos: Object.fromEntries(
      OSS_REPOS.map((repo) => [
        repo.repo,
        { stars: repo.stars, forks: repo.forks },
      ]),
    ),
    live: false,
    asOf: OSS_SNAPSHOT_DATE,
  };
}

/**
 * Star and fork counts for the open-source page. Two GitHub calls (the
 * flagship repo and the org's repo list), cached for six hours. Each call
 * that fails keeps its snapshot numbers, so the page always renders.
 */
export async function getOssStats(): Promise<OssStats> {
  const stats = snapshot();
  const [awesome, org] = await Promise.allSettled([
    github<GitHubRepo>(`/repos/${AWESOME_REPO}`),
    github<GitHubRepo[]>(`/orgs/${OSS_ORG}/repos?type=public&per_page=100`),
  ]);

  if (awesome.status === "fulfilled") {
    stats.awesome = {
      stars: awesome.value.stargazers_count,
      forks: awesome.value.forks_count,
    };
  }
  if (org.status === "fulfilled") {
    for (const repo of org.value) {
      if (repo.private || !(repo.name in stats.repos)) continue;
      stats.repos[repo.name] = {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
      };
    }
  }
  stats.live = awesome.status === "fulfilled" && org.status === "fulfilled";
  if (awesome.status === "fulfilled") {
    stats.asOf = new Date().toISOString().slice(0, 10);
  }
  return stats;
}

/** 16710 → "16.7k", 940 → "940". Rounds down, so "16.7k+" never overstates. */
export function compactCount(value: number) {
  if (value < 1000) return String(value);
  const thousands = Math.floor(value / 100) / 10;
  return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands}k`;
}
