# MCP Live Demo (Release 2.4.0)

Materiały do demonstracji działania protokołu **Model Context Protocol (MCP)**.

## Struktura:

- `mock-data/github/` — sztuczne dane API GitHuba (Pull Requesty, statusy testów CI/CD)
- `output/` — katalog docelowy dla wygenerowanego statusu wydania (`output/status-2.4.0.md`)

## Scenariusz demo:

Model AI pobiera dane z GitHuba oraz dokumentów (Google Drive), wykrywa niespełnione kryteria wydania (błąd testu e2e w PR #142) i prosi o akceptację zapisu raportu podsumowującego.
