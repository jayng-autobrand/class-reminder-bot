const GOOGLE_TOKEN_KEY = "google_sheets_token";

export function saveGoogleToken(token: string) {
  localStorage.setItem(GOOGLE_TOKEN_KEY, token);
}

export function getGoogleToken(): string {
  const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
  if (!token) throw new Error("尚未設定 Google Sheets Token，請到「設定」頁面輸入");
  return token;
}

export function clearGoogleToken() {
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
}

export function hasGoogleToken(): boolean {
  return !!localStorage.getItem(GOOGLE_TOKEN_KEY);
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetData {
  values: string[][];
}

export const googleSheets = {
  async createSpreadsheet(title: string): Promise<string> {
    const token = getGoogleToken();
    const res = await fetch(SHEETS_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title } }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearGoogleToken();
        throw new Error("Google Token 已失效或無權限，請到「設定」頁面重新輸入");
      }
      throw new Error(`建立試算表失敗: ${res.statusText}`);
    }
    return (await res.json()).spreadsheetId;
  },

  async writeSheet(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    const token = getGoogleToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearGoogleToken();
        throw new Error("Google Token 已失效或無權限，請到「設定」頁面重新輸入");
      }
      throw new Error(`寫入試算表失敗: ${res.statusText}`);
    }
  },

  async readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
    const token = getGoogleToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearGoogleToken();
        throw new Error("Google Token 已失效或無權限，請到「設定」頁面重新輸入");
      }
      throw new Error(`讀取試算表失敗: ${res.statusText}`);
    }
    const data: SheetData = await res.json();
    return data.values || [];
  },

  async exportToNewSheet(title: string, headers: string[], rows: string[][]): Promise<string> {
    const id = await this.createSpreadsheet(title);
    await this.writeSheet(id, "Sheet1!A1", [headers, ...rows]);
    return id;
  },
};
