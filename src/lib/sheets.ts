const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const GID_RE = /[#?&]gid=([0-9]+)/;

export type SheetRef = { sheetId: string; gid: string };

export function parseSheetUrl(url: string): SheetRef | null {
  const idMatch = url.match(SHEET_ID_RE);
  if (!idMatch) return null;
  const gidMatch = url.match(GID_RE);
  return { sheetId: idMatch[1], gid: gidMatch?.[1] ?? "0" };
}

export function buildCsvExportUrl({ sheetId, gid }: SheetRef): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchSheetCsv(url: string): Promise<string> {
  const ref = parseSheetUrl(url);
  if (!ref) {
    throw new Error(
      "not a google sheets url. expected https://docs.google.com/spreadsheets/d/...",
    );
  }
  const res = await fetch(buildCsvExportUrl(ref), {
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      throw new Error(
        "couldn't fetch the sheet. make sure it's shared as \"anyone with the link can view.\"",
      );
    }
    throw new Error(`sheet fetch failed with status ${res.status}`);
  }
  return res.text();
}
