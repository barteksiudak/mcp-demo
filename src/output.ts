import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export const RELEASE_STATUS_FILENAME = "status-2.4.0.md";

/**
 * Persists the release status report to disk under OUTPUT_DIR, creating the
 * directory if necessary.
 */
export async function writeReleaseStatusReport(content: string): Promise<string> {
  const outputDir = path.resolve(config.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, RELEASE_STATUS_FILENAME);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}
