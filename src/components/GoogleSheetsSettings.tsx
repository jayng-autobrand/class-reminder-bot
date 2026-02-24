import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveGoogleToken, hasGoogleToken, clearGoogleToken } from "@/services/googleSheets";
import { Settings, Key, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

export default function GoogleSheetsSettings() {
  const [token, setToken] = useState("");
  const [hasToken, setHasToken] = useState(hasGoogleToken());
  const { toast } = useToast();

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    saveGoogleToken(trimmed);
    setHasToken(true);
    setToken("");
    toast({ title: "已儲存", description: "Google Sheets Token 已設定完成" });
  };

  const handleClear = () => {
    clearGoogleToken();
    setHasToken(false);
    toast({ title: "已清除", description: "Google Sheets Token 已移除" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Google Sheets 設定</h2>
        <p className="text-muted-foreground mt-1">設定 Google Sheets API 的存取權杖</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5" />
            Access Token 狀態
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {hasToken ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">已設定 Token</span>
                <Button variant="outline" size="sm" onClick={handleClear} className="ml-auto">
                  <XCircle className="w-4 h-4 mr-1" />
                  清除
                </Button>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">尚未設定</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>{hasToken ? "更新 Token" : "輸入 Access Token"}</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="貼上你的 Google OAuth Access Token"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={!token.trim()}>
                儲存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            如何取得 Token？
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>你可以透過以下方式取得 Google Sheets 的 Access Token：</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              前往{" "}
              <a
                href="https://developers.google.com/oauthplayground/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Google OAuth 2.0 Playground
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>在左邊「Step 1」找到 <strong>Google Sheets API v4</strong>，勾選 <code>https://www.googleapis.com/auth/spreadsheets</code></li>
            <li>點擊「Authorize APIs」並同意授權</li>
            <li>在「Step 2」點擊「Exchange authorization code for tokens」</li>
            <li>複製 <strong>Access Token</strong> 貼到上方欄位</li>
          </ol>
          <p className="text-xs text-muted-foreground/70 mt-2">
            ⚠️ Access Token 通常 1 小時後過期，過期後需重新取得。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
