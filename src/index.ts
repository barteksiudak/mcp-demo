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
  "Pobiera dane o wydaniu (pull requesty lub statusy CI/CD) z repozytorium GitHub barteksiudak/mcp-demo.",
  {
    dataType: z
      .enum(["pull_requests", "ci_checks"])
      .describe("Typ danych do pobrania: 'pull_requests' lub 'ci_checks'."),
  },
  async ({ dataType }) => {
    try {
      const data = await fetchGithubReleaseData(dataType);
      return textResult(JSON.stringify(data, null, 2));
    } catch (error) {
      if (error instanceof GithubApiError) {
        return errorResult(`Błąd GitHub API: ${error.message}`);
      }
      return errorResult(
        `Nieoczekiwany błąd podczas pobierania danych z GitHub: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "search_drive_documents",
  "Wyszukuje dokumenty w folderze Google Drive 'mcp demo' (QA, known issues, raport wdrożenia).",
  {
    query: z
      .string()
      .optional()
      .describe("Opcjonalna fraza wyszukiwania (pełnotekstowa)."),
  },
  async ({ query }) => {
    try {
      const documents = await searchDriveDocuments(query);
      if (documents.length === 0) {
        return textResult(
          "Nie znaleziono żadnych dokumentów pasujących do zapytania w folderze 'mcp demo'."
        );
      }
      return textResult(JSON.stringify(documents, null, 2));
    } catch (error) {
      if (error instanceof DriveApiError) {
        return errorResult(`Błąd Google Drive API: ${error.message}`);
      }
      return errorResult(
        `Nieoczekiwany błąd podczas wyszukiwania w Google Drive: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "read_drive_document",
  "Pobiera pełną treść wybranego dokumentu z Google Drive na podstawie jego fileId.",
  {
    fileId: z.string().describe("Identyfikator pliku Google Drive (fileId)."),
  },
  async ({ fileId }) => {
    try {
      const document = await readDriveDocument(fileId);
      return textResult(
        `# ${document.name} (${document.mimeType})\n\n${document.content}`
      );
    } catch (error) {
      if (error instanceof DriveApiError) {
        return errorResult(`Błąd Google Drive API: ${error.message}`);
      }
      return errorResult(
        `Nieoczekiwany błąd podczas odczytu dokumentu z Google Drive: ${
          (error as Error).message
        }`
      );
    }
  }
);

server.tool(
  "save_release_status",
  "Zapisuje raport statusu wydania w output/status-2.4.0.md. Wymaga jawnego potwierdzenia " +
    "(confirmed: true) od użytkownika przed zapisem na dysku (Human-in-the-Loop).",
  {
    content: z.string().describe("Treść raportu w formacie Markdown."),
    confirmed: z
      .boolean()
      .describe(
        "Flaga potwierdzenia zapisu. Jeśli false, plik NIE zostanie zapisany."
      ),
  },
  async ({ content, confirmed }) => {
    if (!confirmed) {
      return textResult(
        "⚠️ Zapis wstrzymany. Aby zapisać raport w output/status-2.4.0.md, " +
          "poproś użytkownika o potwierdzenie i wywołaj narzędzie ponownie z confirmed: true.\n\n" +
          "Podgląd raportu do zatwierdzenia:\n\n---\n" +
          content
      );
    }

    try {
      const filePath = await writeReleaseStatusReport(content);
      return textResult(`✅ Raport zapisany pomyślnie w: ${filePath}`);
    } catch (error) {
      return errorResult(
        `Błąd podczas zapisu raportu na dysk: ${(error as Error).message}`
      );
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-demo-release-status: serwer MCP nasłuchuje na stdio.");
}

main().catch((error) => {
  console.error("Krytyczny błąd podczas uruchamiania serwera MCP:", error);
  process.exit(1);
});
