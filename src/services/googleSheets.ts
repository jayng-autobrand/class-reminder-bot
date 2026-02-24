import { supabase } from "@/integrations/supabase/client";

const KEYS = {
  clientId: "gs_client_id",
  clientSecret: "gs_client_secret",
  accessToken: "gs_access_token",
  refreshToken: "gs_refresh_token",
  expiresAt: "gs_expires_at",
};

export function saveClientCredentials(clientId: string, clientSecret: string) {
  localStorage.setItem(KEYS.clientId, clientId);
  localStorage.setItem(KEYS.clientSecret, clientSecret);
}

export function getClientCredentials() {
  return {
    clientId: localStorage.getItem(KEYS.clientId) || "",
    clientSecret: localStorage.getItem(KEYS.clientSecret) || "",
  };
}

export function hasClientCredentials(): boolean {
  return !!localStorage.getItem(KEYS.clientId) && !!localStorage.getItem(KEYS.clientSecret);
}

export function saveTokens(accessToken: string, refreshToken: string | null, expiresIn: number) {
  localStorage.setItem(KEYS.accessToken, accessToken);
  if (refreshToken) localStorage.setItem(KEYS.refreshToken, refreshToken);
  localStorage.setItem(KEYS.expiresAt, String(Date.now() + expiresIn * 1000));
}

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function hasTokens(): boolean {
  return !!localStorage.getItem(KEYS.accessToken);
}

function isTokenExpired(): boolean {
  const expiresAt = Number(localStorage.getItem(KEYS.expiresAt) || 0);
  return Date.now() > expiresAt - 60000; // 1 min buffer
}

export async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem(KEYS.accessToken);
  if (!token) throw new Error("尚未授權 Google Sheets，請到「設定」頁面完成授權");

  if (!isTokenExpired()) return token;

  // Try refresh
  const refreshToken = localStorage.getItem(KEYS.refreshToken);
  const { clientId, clientSecret } = getClientCredentials();
  if (!refreshToken || !clientId || !clientSecret) {
    clearAll();
    throw new Error("Token 已過期且無法自動更新，請到「設定」頁面重新授權");
  }

  const { data, error } = await supabase.functions.invoke("google-oauth", {
    body: {
      action: "refresh",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
  });

  if (error || data?.error) {
    clearAll();
    throw new Error("Token 更新失敗，請到「設定」頁面重新授權");
  }

  saveTokens(data.access_token, null, data.expires_in);
  return data.access_token;
}

export function getOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/spreadsheets",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<void> {
  const { clientId, clientSecret } = getClientCredentials();
  if (!clientId || !clientSecret) throw new Error("請先設定 Client ID 和 Client Secret");

  const { data, error } = await supabase.functions.invoke("google-oauth", {
    body: {
      action: "exchange",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    },
  });

  if (error || data?.error) {
    throw new Error(data?.error || "授權碼交換失敗");
  }

  saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

// Google Sheets API
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export const googleSheets = {
  async createSpreadsheet(title: string): Promise<string> {
    const token = await getAccessToken();
    const res = await fetch(SHEETS_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title } }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAll();
        throw new Error("Google 授權已失效，請到「設定」頁面重新授權");
      }
      throw new Error(`建立試算表失敗: ${res.statusText}`);
    }
    return (await res.json()).spreadsheetId;
  },

  async writeSheet(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    const token = await getAccessToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAll();
        throw new Error("Google 授權已失效，請到「設定」頁面重新授權");
      }
      throw new Error(`寫入試算表失敗: ${res.statusText}`);
    }
  },

  async readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
    const token = await getAccessToken();
    const url = `${SHEETS_API}/${spreadsheetId}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAll();
        throw new Error("Google 授權已失效，請到「設定」頁面重新授權");
      }
      throw new Error(`讀取試算表失敗: ${res.statusText}`);
    }
    return (await res.json()).values || [];
  },

  async getFirstSheetName(spreadsheetId: string): Promise<string> {
    const token = await getAccessToken();
    const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAll();
        throw new Error("Google 授權已失效，請到「設定」頁面重新授權");
      }
      throw new Error(`讀取試算表失敗: ${res.statusText}`);
    }
    const data = await res.json();
    return data.sheets?.[0]?.properties?.title || "Sheet1";
  },

  async exportToNewSheet(title: string, headers: string[], rows: string[][]): Promise<string> {
    const id = await this.createSpreadsheet(title);
    await this.writeSheet(id, "Sheet1!A1", [headers, ...rows]);
    return id;
  },
};
