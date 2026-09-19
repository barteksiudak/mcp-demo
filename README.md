# MCP Live Demo (Release 2.4.0)

Materiały do demonstracji działania protokołu **Model Context Protocol (MCP)**.

## Struktura:

- `mock-data/github/` — sztuczne dane API GitHuba (Pull Requesty, statusy testów CI/CD)
- `output/` — katalog docelowy dla wygenerowanego statusu wydania (`output/status-2.4.0.md`)

## Scenariusz demo:

Model AI pobiera dane z GitHuba oraz dokumentów (Google Drive), wykrywa niespełnione kryteria wydania (błąd testu e2e w PR #142) i prosi o akceptację zapisu raportu podsumowującego.

## Serwer MCP

Projekt zawiera serwer MCP (`src/index.ts`) komunikujący się przez `stdio`, rejestrujący 4 narzędzia:

- `get_github_release_data` — pobiera `pull_requests`/`ci_checks` z GitHub Contents API.
- `search_drive_documents` — wyszukuje dokumenty w folderze Google Drive `mcp demo`.
- `read_drive_document` — odczytuje treść wskazanego dokumentu (`fileId`).
- `save_release_status` — zapisuje raport do `output/status-2.4.0.md` (wymaga `confirmed: true`).

### Instalacja i uruchomienie

```bash
npm install
cp .env.example .env   # uzupełnij tokeny GitHub/Google Drive
npm run build
npm start
```

### Konfiguracja klienta MCP (np. Claude Desktop / Cursor)

Dodaj wpis w pliku konfiguracyjnym klienta (np. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-demo-release-status": {
      "command": "node",
      "args": ["/Users/cudny/dev/mcp/mcp-demo/dist/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx",
        "GOOGLE_SERVICE_ACCOUNT_KEY_PATH": "/Users/cudny/dev/mcp/mcp-demo/credentials/service-account.json",
        "GOOGLE_DRIVE_FOLDER_ID": "1UBCiPncfqYR904WbmayX1jzR3T_czoVK",
        "OUTPUT_DIR": "/Users/cudny/dev/mcp/mcp-demo/output"
      }
    }
  }
}
```
