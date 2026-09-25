/*
 * Google Picker в браузере: авторизация (Google Identity Services), выбор
 * файлов из Диска и скачивание их байтов. Скрипты Google грузим лениво —
 * только когда пользователь жмёт «С Google Диска».
 *
 * Только клиент. Client ID и API-ключ — публичные (см. google-actions).
 */

export type PickedFile = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
};
export type PickerResult = { token: string; files: PickedFile[] };

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void;
}
interface OAuth2 {
  initTokenClient: (c: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
  }) => TokenClient;
}
interface PickerDoc {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
}
interface PickerData {
  action: string;
  docs?: PickerDoc[];
}
interface View {
  setIncludeFolders?: (b: boolean) => View;
  setSelectFolderEnabled?: (b: boolean) => View;
  setOwnedByMe?: (b: boolean) => View;
}
interface BuiltPicker {
  setVisible: (v: boolean) => void;
}
interface PickerBuilder {
  setOAuthToken: (t: string) => PickerBuilder;
  setDeveloperKey: (k: string) => PickerBuilder;
  addView: (v: unknown) => PickerBuilder;
  setCallback: (cb: (d: PickerData) => void) => PickerBuilder;
  enableFeature: (f: unknown) => PickerBuilder;
  setTitle: (t: string) => PickerBuilder;
  build: () => BuiltPicker;
}
interface PickerNS {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new (viewId?: unknown) => View;
  ViewId: { DOCS: unknown };
  Action: { PICKED: string; CANCEL: string };
  Feature: { MULTISELECT_ENABLED: unknown };
}
interface GoogleNS {
  picker?: PickerNS;
  accounts?: { oauth2: OAuth2 };
}
interface Gapi {
  load: (name: string, cb: () => void) => void;
}

function win() {
  return window as unknown as { google?: GoogleNS; gapi?: Gapi };
}

const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      loaded.add(src);
      resolve();
    };
    s.onerror = () => reject(new Error(`Не загрузился ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGis(): Promise<void> {
  if (!win().google?.accounts) await loadScript(GIS_SRC);
}
async function ensurePicker(): Promise<void> {
  if (!win().gapi) await loadScript(GAPI_SRC);
  if (!win().google?.picker) {
    await new Promise<void>((resolve) => win().gapi!.load("picker", () => resolve()));
  }
}

function getToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = win().google?.accounts?.oauth2;
    if (!oauth2) return reject(new Error("Google Identity не загрузился"));
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (r) =>
        r.access_token ? resolve(r.access_token) : reject(new Error(r.error || "нет токена")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

function showPicker(token: string, apiKey: string): Promise<PickedFile[]> {
  return new Promise((resolve, reject) => {
    const g = win().google;
    if (!g?.picker) return reject(new Error("Google Picker не загрузился"));
    const p = g.picker;
    const view = new p.DocsView(p.ViewId.DOCS);
    view.setIncludeFolders?.(true);
    view.setSelectFolderEnabled?.(false);
    const picker = new p.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .addView(view)
      .enableFeature(p.Feature.MULTISELECT_ENABLED)
      .setTitle("Выбери файлы из Google Диска")
      .setCallback((data) => {
        if (data.action === p.Action.PICKED) {
          resolve(
            (data.docs ?? []).map((d) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
              url: d.url,
              sizeBytes: d.sizeBytes,
            })),
          );
        } else if (data.action === p.Action.CANCEL) {
          resolve([]);
        }
      })
      .build();
    picker.setVisible(true);
  });
}

/** Полный сценарий: авторизация → показать Picker → выбранные файлы + токен. */
export async function pickFromGoogleDrive(cfg: {
  clientId: string;
  apiKey: string;
}): Promise<PickerResult | null> {
  await Promise.all([ensureGis(), ensurePicker()]);
  const token = await getToken(cfg.clientId);
  const files = await showPicker(token, cfg.apiKey);
  if (files.length === 0) return null;
  return { token, files };
}

/** Скачать байты обычного (не Google-нативного) файла Диска как File. */
export async function downloadDriveFile(
  file: PickedFile,
  token: string,
): Promise<File | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const blob = await res.blob();
  return new File([blob], file.name || "файл", {
    type: file.mimeType || blob.type || "application/octet-stream",
  });
}

/** Google Документы/Таблицы/Презентации — байтами не качаются, только превью. */
export function isGoogleNativeDoc(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps");
}
