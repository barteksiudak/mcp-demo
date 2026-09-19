import "dotenv/config";

function requireEnvOr(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export const config = {
  github: {
    token: requireEnvOr("GITHUB_PERSONAL_ACCESS_TOKEN", "GITHUB_TOKEN"),
    owner: process.env.GITHUB_OWNER || "barteksiudak",
    repo: process.env.GITHUB_REPO || "mcp-demo",
  },
  drive: {
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    apiKey: process.env.GOOGLE_API_KEY,
    folderId:
      process.env.GOOGLE_DRIVE_FOLDER_ID ||
      "1UBCiPncfqYR904WbmayX1jzR3T_czoVK",
  },
  outputDir: process.env.OUTPUT_DIR || "./output",
};
