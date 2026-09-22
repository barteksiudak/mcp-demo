#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { fetchGithubReleaseData, GithubApiError } from "./github.js";
import { searchDriveDocuments, readDriveDocument, DriveApiError } from "./drive.js";
import { writeReleaseStatusReport } from "./output.js";

const server = new McpServer({
  name: "mcp-demo-release-status",
  version: "1.0.0",
});

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

server.tool(
  "get_github_release_data",
  "Fetches release data (pull requests or CI/CD checks) from the barteksiudak/mcp-demo GitHub repository.",
  {
    dataType: z
      .enum(["pull_requests", "ci_checks"])
      .describe("Data type to fetch: 'pull_requests' or 'ci_checks'."),
  },
  async ({ dataType }) => {
    try {
      const data = await fetchGithubReleaseData(dataType);
      return textResult(JSON.stringify(data, null, 2));
    } catch (error) {
      if (error instanceof GithubApiError) {
        return errorResult(`GitHub API error: ${error.message}`);
      }
      return errorResult(
        `Unexpected error while fetching data from GitHub: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "search_drive_documents",
  "Searches documents in the 'mcp demo' Google Drive folder (QA, known issues, deployment report).",
  {
    query: z
      .string()
      .optional()
      .describe("Optional full-text search query."),
  },
  async ({ query }) => {
    try {
      const documents = await searchDriveDocuments(query);
      if (documents.length === 0) {
        return textResult(
          "No documents matching the query were found in the 'mcp demo' folder."
        );
      }
      return textResult(JSON.stringify(documents, null, 2));
    } catch (error) {
      if (error instanceof DriveApiError) {
        return errorResult(`Google Drive API error: ${error.message}`);
      }
      return errorResult(
        `Unexpected error while searching Google Drive: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "read_drive_document",
  "Fetches the full content of a selected Google Drive document by fileId.",
  {
    fileId: z.string().describe("Google Drive file identifier (fileId)."),
  },
  async ({ fileId }) => {
    try {
      const document = await readDriveDocument(fileId);
      return textResult(
        `# ${document.name} (${document.mimeType})\n\n${document.content}`
      );
    } catch (error) {
      if (error instanceof DriveApiError) {
        return errorResult(`Google Drive API error: ${error.message}`);
      }
      return errorResult(
        `Unexpected error while reading the Google Drive document: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "save_release_status",
  "Saves the release status report to output/status-2.4.0.md. Requires explicit user confirmation " +
    "(confirmed: true) before writing to disk (Human-in-the-Loop).",
  {
    content: z.string().describe("Report content in Markdown format."),
    confirmed: z
      .boolean()
      .describe(
        "Write confirmation flag. If false, the file will NOT be saved."
      ),
  },
  async ({ content, confirmed }) => {
    if (!confirmed) {
      return textResult(
        "⚠️ Write operation paused. To save the report to output/status-2.4.0.md, " +
          "ask the user for confirmation and call the tool again with confirmed: true.\n\n" +
          "Report preview for approval:\n\n---\n" +
          content
      );
    }

    try {
      const filePath = await writeReleaseStatusReport(content);
      return textResult(`✅ Report saved successfully to: ${filePath}`);
    } catch (error) {
      return errorResult(
        `Error while saving the report to disk: ${(error as Error).message}`
      );
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-demo-release-status: MCP server is listening on stdio.");
}

main().catch((error) => {
  console.error("Critical error while starting the MCP server:", error);
  process.exit(1);
});
