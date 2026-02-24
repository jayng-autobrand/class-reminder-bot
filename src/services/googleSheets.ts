import { supabase } from "@/integrations/supabase/client";

const PROVIDER_TOKEN_KEY = "google_provider_token";

export function saveProviderToken(token: string) {
  localStorage.setItem(PROVIDER_TOKEN_KEY, token);
}

export function clearProviderToken() {
  localStorage.removeItem(PROVIDER_TOKEN_KEY);
}

async function getProviderToken(): Promise<string> {
  const cached = localStorage.getItem(PROVIDER_TOKEN_KEY);
  if (cached) return cached;

  const { data: { session } } = await supabase.auth.getSession();
  const sessionToken = session?.provider_token;
  if (sessionToken) {
    saveProviderToken(sessionToken);
    return sessionToken;
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const hashToken = new URLSearchParams(hash).get("provider_token");
  if (hashToken) {
    saveProviderToken(hashToken);
    return hashToken;
  }

  throw new Error("未取得 Google 授權 Token，請重新登入並允許 Google Sheets 權限");
}

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetData {
  values: string[][];
}

export const googleSheets = {
  async createSpreadsheet(title: string): Promise<string> {
    const token = await getProviderToken();
    const res = await fetch(SHEETS_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title } }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearProviderToken();
        throw new Error("Google 授權已過期，請重新登入再試");
      }
      throw new Error(`建立試算表失敗: ${res.statusText}`);
    }
    const data = await res.json();
    return data.spreadsheetId;
  },

  async writeSheet(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    const token = await getProviderToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearProviderToken();
        throw new Error("Google 授權已過期，請重新登入再試");
      }
      throw new Error(`寫入試算表失敗: ${res.statusText}`);
    }
  },

  async readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
    const token = await getProviderToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearProviderToken();
        throw new Error("Google 授權已過期，請重新登入再試");
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
