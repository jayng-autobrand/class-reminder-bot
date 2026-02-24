import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, CheckCircle2, XCircle, Clock, History } from "lucide-react";

interface SentMessage {
  id: string;
  student_name: string;
  student_phone: string;
  course_name: string;
  message_content: string;
  status: string;
  queue_id: string | null;
  error_message: string | null;
  sent_at: string;
}

export default function MessageHistory() {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sent_messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(200);

    if (!error && data) setMessages(data as SentMessage[]);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const filtered = statusFilter === "all" ? messages : messages.filter(m => m.status === statusFilter);

  const statusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />已排隊</Badge>;
      case "sent":
        return <Badge className="gap-1 bg-primary/90"><CheckCircle2 className="w-3 h-3" />已發送</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const successCount = messages.filter(m => m.status === "queued" || m.status === "sent").length;
  const failedCount = messages.filter(m => m.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">發送記錄</h2>
          <p className="text-muted-foreground mt-1">查看所有 WhatsApp 訊息發送歷史</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />重新整理
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{messages.length}</p>
            <p className="text-xs text-muted-foreground">總訊息數</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{successCount}</p>
            <p className="text-xs text-muted-foreground">成功</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-destructive">{failedCount}</p>
            <p className="text-xs text-muted-foreground">失敗</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="篩選狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="queued">已排隊</SelectItem>
            <SelectItem value="sent">已發送</SelectItem>
            <SelectItem value="failed">失敗</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} 條記錄</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無發送記錄</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>時間</TableHead>
                <TableHead>學員</TableHead>
                <TableHead className="hidden md:table-cell">課程</TableHead>
                <TableHead className="hidden lg:table-cell">訊息內容</TableHead>
                <TableHead>狀態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(msg.sent_at).toLocaleString("zh-HK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{msg.student_name}</p>
                      <p className="text-xs text-muted-foreground">{msg.student_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{msg.course_name}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{msg.message_content}</p>
                  </TableCell>
                  <TableCell>
                    {statusBadge(msg.status)}
                    {msg.error_message && (
                      <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={msg.error_message}>{msg.error_message}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
