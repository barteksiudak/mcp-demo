import axios, { AxiosError } from "axios";
import { config } from "./config.js";

export type GithubDataType = "pull_requests" | "ci_checks";

const FILE_MAP: Record<GithubDataType, string> = {
  pull_requests: "pull-requests.json",
  ci_checks: "ci-checks.json",
};

interface GithubContentsResponse {
  content: string;
  encoding: string;
  path: string;
  sha: string;
}

export class GithubApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GithubApiError";
  }
}

/**
 * Fetches a mock data file from GitHub's Contents API and decodes it from Base64.
 */
export async function fetchGithubReleaseData(
  dataType: GithubDataType
): Promise<unknown> {
  const fileName = FILE_MAP[dataType];
  const { owner, repo, token } = config.github;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/mock-data/github/${fileName}`;

  try {
    const response = await axios.get<GithubContentsResponse>(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const { content, encoding } = response.data;
    if (encoding !== "base64") {
      throw new GithubApiError(
        `Unexpected encoding "${encoding}" returned by GitHub API`
      );
    }

    const decoded = Buffer.from(content, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    if (error instanceof GithubApiError) throw error;

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 401 || status === 403) {
      throw new GithubApiError(
        "Brak autoryzacji do GitHub API. Sprawdź, czy GITHUB_PERSONAL_ACCESS_TOKEN " +
          "jest ustawiony i posiada uprawnienia do odczytu repozytorium.",
        status
      );
    }
    if (status === 404) {
      throw new GithubApiError(
        `Nie znaleziono pliku "mock-data/github/${fileName}" w repozytorium ${owner}/${repo}.`,
        status
      );
    }

    throw new GithubApiError(
      `Błąd podczas komunikacji z GitHub API: ${
        axiosError.message || "nieznany błąd"
      }`,
      status
    );
  }
}
