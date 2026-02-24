import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  saveClientCredentials,
  getClientCredentials,
  hasClientCredentials,
  hasTokens,
  clearAll,
  getOAuthUrl,
  exchangeCode,
} from "@/services/googleSheets";
import { Settings, Key, ExternalLink, CheckCircle2, XCircle, ShieldCheck, RefreshCw, Clock } from "lucide-react";

const REDIRECT_PATH = "/";

export default function GoogleSheetsSettings() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasCreds, setHasCreds] = useState(hasClientCredentials());
  const [hasToken, setHasToken] = useState(hasTokens());
  const [exchanging, setExchanging] = useState(false);

  // Sync settings
  const [sheetUrl, setSheetUrl] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [savingSync, setSavingSync] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  const { toast } = useToast();

  // Load sync settings from DB
  useEffect(() => {
    const loadSyncSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setSheetUrl(data.sheet_url || "");
        setSyncEnabled(data.sync_enabled);
        setLastSynced(data.last_synced_at);
      }
    };
    loadSyncSettings();
  }, []);

  // Check for OAuth callback code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && hasClientCredentials()) {
      setExchanging(true);
      const redirectUri = `${window.location.origin}${REDIRECT_PATH}`;
      exchangeCode(code, redirectUri)
        .then(() => {
          setHasToken(true);
          toast({ title: "授權成功", description: "Google Sheets 已連接" });
          window.history.replaceState({}, "", REDIRECT_PATH);
          // Auto-save tokens to DB
          saveTokensToDb();
        })
        .catch((err) => {
          toast({ title: "授權失敗", description: err.message, variant: "destructive" });
        })
        .finally(() => setExchanging(false));
    }
  }, [toast]);

  const saveTokensToDb = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { clientId, clientSecret } = getClientCredentials();
    const refreshToken = localStorage.getItem("gs_refresh_token") || "";
    const accessToken = localStorage.getItem("gs_access_token") || "";
    const expiresAt = Number(localStorage.getItem("gs_expires_at") || "0");

    const payload = {
      user_id: user.id,
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: expiresAt,
    };

    // Upsert
    const { data: existing } = await supabase
      .from('sync_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('sync_settings').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('sync_settings').insert(payload);
    }
  };

  const handleSaveCredentials = () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    saveClientCredentials(clientId.trim(), clientSecret.trim());
    setHasCreds(true);
    setClientId("");
    setClientSecret("");
    toast({ title: "已儲存", description: "OAuth 憑證已設定" });
  };

  const handleAuthorize = () => {
    const { clientId } = getClientCredentials();
    const redirectUri = `${window.location.origin}${REDIRECT_PATH}`;
    const url = getOAuthUrl(clientId, redirectUri);
    window.location.href = url;
  };

  const handleClear = () => {
    clearAll();
    setHasCreds(false);
    setHasToken(false);
    toast({ title: "已清除", description: "所有 Google Sheets 設定已移除" });
  };

  const handleSaveSyncSettings = async () => {
    setSavingSync(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");

      const { clientId, clientSecret } = getClientCredentials();
      const refreshToken = localStorage.getItem("gs_refresh_token") || "";
      const accessToken = localStorage.getItem("gs_access_token") || "";
      const expiresAt = Number(localStorage.getItem("gs_expires_at") || "0");

      const payload = {
        user_id: user.id,
        sheet_url: sheetUrl,
        sync_enabled: syncEnabled,
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_at: expiresAt,
      };

      const { data: existing } = await supabase
        .from('sync_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('sync_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('sync_settings').insert(payload);
      }

      toast({ title: "已儲存", description: syncEnabled ? "自動同步已啟用" : "同步設定已儲存" });
    } catch (err: any) {
      toast({ title: "儲存失敗", description: err.message, variant: "destructive" });
    } finally {
      setSavingSync(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    try {
      // Ensure settings are saved first
      await handleSaveSyncSettings();

      const { data, error } = await supabase.functions.invoke("sync-google-sheet");
      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.status === 'success') {
        toast({ title: "同步完成", description: `新增了 ${result.new_students} 位學員（Sheet 共 ${result.total_sheet_rows} 筆）` });
        setLastSynced(new Date().toISOString());
      } else if (result?.status === 'skipped') {
        toast({ title: "無資料", description: "Google Sheet 沒有有效的資料列" });
      } else if (result?.status === 'error') {
        toast({ title: "同步失敗", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "同步完成", description: "沒有需要同步的設定" });
      }
    } catch (err: any) {
      toast({ title: "同步失敗", description: err.message, variant: "destructive" });
    } finally {
      setSyncingNow(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Google Sheets 設定</h2>
        <p className="text-muted-foreground mt-1">使用你自己的 Google OAuth 憑證連接 Google Sheets</p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5" />
            連接狀態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {hasCreds ? (
              <><CheckCircle2 className="w-4 h-4 text-primary" /><span className="text-sm">OAuth 憑證已設定</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">未設定憑證</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasToken ? (
              <><CheckCircle2 className="w-4 h-4 text-primary" /><span className="text-sm">已授權（Token 可用，過期會自動更新）</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">未授權</span></>
            )}
          </div>
          {(hasCreds || hasToken) && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              <XCircle className="w-4 h-4 mr-1" />清除所有設定
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 1: Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5" />
            Step 1：輸入 OAuth 憑證
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder={hasCreds ? "••••••••（已設定，輸入新值可覆蓋）" : "貼上 Client ID"} />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={hasCreds ? "••••••••（已設定，輸入新值可覆蓋）" : "貼上 Client Secret"} />
          </div>
          <Button onClick={handleSaveCredentials} disabled={!clientId.trim() || !clientSecret.trim()}>
            {hasCreds ? "更新憑證" : "儲存憑證"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Authorize */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5" />
            Step 2：授權 Google Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            儲存憑證後，點擊下方按鈕前往 Google 授權頁面，同意後會自動返回。
          </p>
          <Button onClick={handleAuthorize} disabled={!hasCreds || exchanging}>
            {exchanging ? "授權中…" : hasToken ? "重新授權" : "前往 Google 授權"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 3: Auto Sync */}
      {hasToken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="w-5 h-5" />
              Step 3：自動同步設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              設定 Google Sheet 網址後，系統會每 15 分鐘自動從 Sheet 同步學員資料。新增的學員會自動加入，已存在的不會重複。
            </p>
            <div className="space-y-2">
              <Label>Google Sheet 網址</Label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="貼上要同步的 Google Sheet 網址"
              />
              <p className="text-xs text-muted-foreground">格式：姓名, WhatsApp, Email, 課程名稱（第一列為標題列）</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
                <Label>啟用每 15 分鐘自動同步</Label>
              </div>
            </div>
            {lastSynced && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                上次同步：{new Date(lastSynced).toLocaleString("zh-TW")}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleSaveSyncSettings} disabled={savingSync}>
                {savingSync ? "儲存中…" : "儲存同步設定"}
              </Button>
              <Button variant="outline" onClick={handleSyncNow} disabled={syncingNow || !sheetUrl}>
                <RefreshCw className={`w-4 h-4 mr-1 ${syncingNow ? "animate-spin" : ""}`} />
                {syncingNow ? "同步中…" : "立即同步"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            如何取得 OAuth 憑證？
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              前往{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                Google Cloud Console - Credentials <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>建立一個 <strong>OAuth 2.0 Client ID</strong>（應用程式類型選「Web application」）</li>
            <li>
              在「Authorized redirect URIs」加入：
              <code className="block mt-1 p-2 bg-muted rounded text-xs break-all">{window.location.origin}/</code>
            </li>
            <li>啟用 <strong>Google Sheets API</strong>（在「Library」頁面搜尋並啟用）</li>
            <li>複製 <strong>Client ID</strong> 和 <strong>Client Secret</strong> 貼到上方</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
