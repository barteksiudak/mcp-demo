import fs from "node:fs";
import { google, drive_v3 } from "googleapis";
import { config } from "./config.js";

const GOOGLE_DOC_EXPORT_MIME = "text/plain";
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

export class DriveApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "DriveApiError";
  }
}

let cachedDriveClient: drive_v3.Drive | null = null;

/**
 * Builds an authenticated Drive client from a service account key file,
 * or falls back to an unauthenticated client using a plain API key.
 */
async function getDriveClient(): Promise<drive_v3.Drive> {
  if (cachedDriveClient) return cachedDriveClient;

  const { serviceAccountKeyPath, apiKey } = config.drive;

  if (serviceAccountKeyPath) {
    if (!fs.existsSync(serviceAccountKeyPath)) {
      throw new DriveApiError(
        `Nie znaleziono pliku klucza service account pod ścieżką: ${serviceAccountKeyPath}. ` +
          "Sprawdź zmienną GOOGLE_SERVICE_ACCOUNT_KEY_PATH w pliku .env."
      );
    }
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyPath,
      scopes: SCOPES,
    });
    cachedDriveClient = google.drive({ version: "v3", auth });
    return cachedDriveClient;
  }

  if (apiKey) {
    cachedDriveClient = google.drive({ version: "v3", auth: apiKey });
    return cachedDriveClient;
  }

  throw new DriveApiError(
    "Brak konfiguracji dostępu do Google Drive API. Ustaw GOOGLE_SERVICE_ACCOUNT_KEY_PATH " +
      "(zalecane) lub GOOGLE_API_KEY w pliku .env."
  );
}

function toDriveApiError(error: unknown, context: string): DriveApiError {
  const err = error as { code?: number; message?: string };
  const status = err.code;

  if (status === 401 || status === 403) {
    return new DriveApiError(
      `Brak autoryzacji do Google Drive API (${context}). Sprawdź uprawnienia service accounta ` +
        "lub upewnij się, że folder został z nim udostępniony.",
      status
    );
  }
  if (status === 404) {
    return new DriveApiError(
      `Nie znaleziono zasobu w Google Drive (${context}).`,
      status
    );
  }
  return new DriveApiError(
    `Błąd Google Drive API (${context}): ${err.message || "nieznany błąd"}`,
    status
  );
}

export interface DriveDocumentSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string | null;
}

/**
 * Lists documents inside the configured "mcp demo" Drive folder, optionally
 * filtered by a full-text search query.
 */
export async function searchDriveDocuments(
  query?: string
): Promise<DriveDocumentSummary[]> {
  const drive = await getDriveClient();
  const { folderId } = config.drive;

  const conditions = [`'${folderId}' in parents`, "trashed = false"];
  if (query && query.trim().length > 0) {
    const escaped = query.replace(/'/g, "\\'");
    conditions.push(`fullText contains '${escaped}'`);
  }

  try {
    const response = await drive.files.list({
      q: conditions.join(" and "),
      fields: "files(id, name, mimeType, modifiedTime)",
      pageSize: 50,
    });

    return (response.data.files || []).map((file) => ({
      id: file.id || "",
      name: file.name || "(bez nazwy)",
      mimeType: file.mimeType || "unknown",
      modifiedTime: file.modifiedTime,
    }));
  } catch (error) {
    throw toDriveApiError(error, `wyszukiwanie w folderze ${folderId}`);
  }
}

/**
 * Reads the full textual content of a Drive file. Native Google Docs are
 * exported to plain text; other files are downloaded and decoded as UTF-8.
 */
export async function readDriveDocument(fileId: string): Promise<{
  name: string;
  mimeType: string;
  content: string;
}> {
  const drive = await getDriveClient();

  let meta: drive_v3.Schema$File;
  try {
    const metaResponse = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
    });
    meta = metaResponse.data;
  } catch (error) {
    throw toDriveApiError(error, `pobieranie metadanych pliku ${fileId}`);
  }

  const isGoogleNative = meta.mimeType?.startsWith(
    "application/vnd.google-apps"
  );

  try {
    if (isGoogleNative) {
      const exportResponse = await drive.files.export(
        { fileId, mimeType: GOOGLE_DOC_EXPORT_MIME },
        { responseType: "text" }
      );
      return {
        name: meta.name || fileId,
        mimeType: meta.mimeType || "unknown",
        content: exportResponse.data as unknown as string,
      };
    }

    const downloadResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(downloadResponse.data as unknown as ArrayBuffer);
    return {
      name: meta.name || fileId,
      mimeType: meta.mimeType || "unknown",
      content: buffer.toString("utf-8"),
    };
  } catch (error) {
    throw toDriveApiError(error, `pobieranie treści pliku ${fileId}`);
  }
}
