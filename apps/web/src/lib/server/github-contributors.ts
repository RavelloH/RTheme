const GITHUB_API_BASE = "https://api.github.com";
const CONTRIBUTORS_PER_PAGE = 100;
const MAX_CONTRIBUTOR_PAGES = 5;
const CONTRIBUTORS_REVALIDATE_SECONDS = 120;

type GithubContributorApiItem = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
};

export type GithubContributor = {
  id: number;
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
  type: string;
};

function normalizeContributor(
  item: GithubContributorApiItem,
): GithubContributor {
  return {
    id: item.id,
    login: item.login,
    avatarUrl: item.avatar_url,
    profileUrl: item.html_url,
    contributions: item.contributions,
    type: item.type,
  };
}

export async function fetchGithubContributors(
  owner: string,
  repo: string,
  options?: {
    limit?: number;
  },
): Promise<GithubContributor[]> {
  const limit = options?.limit && options.limit > 0 ? options.limit : 100;
  const contributors: GithubContributor[] = [];

  for (let page = 1; page <= MAX_CONTRIBUTOR_PAGES; page += 1) {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=${CONTRIBUTORS_PER_PAGE}&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "NeutralPress-CMS",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: {
          revalidate: CONTRIBUTORS_REVALIDATE_SECONDS,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `GitHub Contributors API 请求失败: HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("GitHub Contributors API 返回格式异常");
    }

    const chunk = payload as GithubContributorApiItem[];
    for (const item of chunk) {
      contributors.push(normalizeContributor(item));
      if (contributors.length >= limit) {
        return contributors;
      }
    }

    if (chunk.length < CONTRIBUTORS_PER_PAGE) {
      break;
    }
  }

  return contributors;
}
