const GITHUB_API_BASE = "https://api.github.com";
const RELEASES_PER_PAGE = 100;
const MAX_RELEASE_PAGES = 10;
const RELEASES_REVALIDATE_SECONDS = 1800;

type GithubReleaseApiAsset = {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
};

type GithubReleaseApiItem = {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  target_commitish: string;
  author: {
    login: string;
  } | null;
  assets: GithubReleaseApiAsset[];
};

export type GithubReleaseAsset = {
  id: number;
  name: string;
  size: number;
  downloadCount: number;
  downloadUrl: string;
};

export type GithubRelease = {
  id: number;
  tagName: string;
  name: string;
  htmlUrl: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetCommitish: string;
  authorLogin: string | null;
  assets: GithubReleaseAsset[];
};

function normalizeRelease(item: GithubReleaseApiItem): GithubRelease {
  return {
    id: item.id,
    tagName: item.tag_name,
    name: item.name?.trim() || item.tag_name,
    htmlUrl: item.html_url,
    body: item.body,
    draft: item.draft,
    prerelease: item.prerelease,
    publishedAt: item.published_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    targetCommitish: item.target_commitish,
    authorLogin: item.author?.login ?? null,
    assets: item.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      size: asset.size,
      downloadCount: asset.download_count,
      downloadUrl: asset.browser_download_url,
    })),
  };
}

function getReleaseTimestamp(
  release: Pick<GithubRelease, "publishedAt" | "createdAt">,
): number {
  const source = release.publishedAt ?? release.createdAt;
  const timestamp = new Date(source).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function fetchGithubReleases(
  owner: string,
  repo: string,
): Promise<GithubRelease[]> {
  const releases: GithubRelease[] = [];

  for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${RELEASES_PER_PAGE}&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "NeutralPress-CMS",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: {
          revalidate: RELEASES_REVALIDATE_SECONDS,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub Releases API 请求失败: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("GitHub Releases API 返回格式异常");
    }

    const chunk = payload as GithubReleaseApiItem[];
    for (const item of chunk) {
      releases.push(normalizeRelease(item));
    }

    if (chunk.length < RELEASES_PER_PAGE) {
      break;
    }
  }

  releases.sort(
    (left, right) => getReleaseTimestamp(right) - getReleaseTimestamp(left),
  );

  return releases;
}
