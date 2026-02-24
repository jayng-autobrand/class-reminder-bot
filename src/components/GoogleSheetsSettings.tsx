import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  saveClientCredentials,
  getClientCredentials,
  hasClientCredentials,
  hasTokens,
  clearAll,
  getOAuthUrl,
  exchangeCode,
} from "@/services/googleSheets";
import { Settings, Key, ExternalLink, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const REDIRECT_PATH = "/";

export default function GoogleSheetsSettings() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasCreds, setHasCreds] = useState(hasClientCredentials());
  const [hasToken, setHasToken] = useState(hasTokens());
  const [exchanging, setExchanging] = useState(false);
  const { toast } = useToast();

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
          // Clean URL
          window.history.replaceState({}, "", REDIRECT_PATH);
        })
        .catch((err) => {
          toast({ title: "授權失敗", description: err.message, variant: "destructive" });
        })
        .finally(() => setExchanging(false));
    }
  }, [toast]);

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
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={hasCreds ? "••••••••（已設定，輸入新值可覆蓋）" : "貼上 Client ID"}
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={hasCreds ? "••••••••（已設定，輸入新值可覆蓋）" : "貼上 Client Secret"}
            />
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
