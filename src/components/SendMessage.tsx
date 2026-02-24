import { useState } from "react";
import type { Course, Student, MessageTemplate } from "@/types";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  courses: Course[];
  students: Student[];
  templates: MessageTemplate[];
}

interface SendResult {
  studentName: string;
  phone: string;
  success: boolean;
  error?: string;
}

export default function SendMessage({ courses, students, templates }: Props) {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const { toast } = useToast();

  const courseStudents = selectedCourse
    ? students.filter((s) => s.courseId === selectedCourse)
    : [];

  const course = courses.find((c) => c.id === selectedCourse);
  const template = templates.find((t) => t.id === selectedTemplate);

  const resolveMessage = (student: Student) => {
    const msg = customMessage || template?.content || "";
    return msg
      .replace(/\{\{學生名\}\}/g, student.name)
      .replace(/\{\{課程名\}\}/g, course?.name || "")
      .replace(/\{\{日期\}\}/g, formatDateDDMMYYYY(course?.date || ""))
      .replace(/\{\{時間\}\}/g, course?.time || "")
      .replace(/\{\{地點\}\}/g, course?.location || "");
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) setCustomMessage(t.content);
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedStudents([]);
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === courseStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(courseStudents.map((s) => s.id));
    }
  };

  const handleSend = async () => {
    if (!customMessage || selectedStudents.length === 0) {
      toast({ title: "請填寫完整", description: "請選擇學員並填寫訊息內容", variant: "destructive" });
      return;
    }

    setSending(true);
    setResults([]);
    const newResults: SendResult[] = [];

    for (const studentId of selectedStudents) {
      const student = students.find((s) => s.id === studentId);
      if (!student) continue;

      const message = resolveMessage(student);

      try {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { phone: student.phone, message },
        });

        if (error) throw error;

        if (data?.success) {
          newResults.push({ studentName: student.name, phone: student.phone, success: true });
        } else {
          newResults.push({ studentName: student.name, phone: student.phone, success: false, error: data?.error || "Unknown error" });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "發送失敗";
        newResults.push({ studentName: student.name, phone: student.phone, success: false, error: errorMsg });
      }
    }

    setResults(newResults);
    setSending(false);

    const successCount = newResults.filter((r) => r.success).length;
    toast({
      title: "發送完成",
      description: `成功 ${successCount}/${newResults.length} 條訊息`,
      variant: successCount === newResults.length ? "default" : "destructive",
    });
  };

  const previewStudent = courseStudents[0] || { name: "陳大文", phone: "85291234567", email: "", courseId: "", id: "" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">發送訊息</h2>
        <p className="text-muted-foreground mt-1">即時發送 WhatsApp 訊息畀學員</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. 選擇課程</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCourse} onValueChange={handleSelectCourse}>
                <SelectTrigger><SelectValue placeholder="選擇課程" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {formatDateDDMMYYYY(c.date)} {c.time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. 選擇學員</CardTitle>
            </CardHeader>
            <CardContent>
              {courseStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">請先選擇課程</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      {selectedStudents.length === courseStudents.length ? "取消全選" : "全選"}
                    </Button>
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      已選 {selectedStudents.length}/{courseStudents.length}
                    </Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {courseStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedStudents.includes(s.id)}
                          onCheckedChange={() => toggleStudent(s.id)}
                        />
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{s.phone}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3. 訊息內容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">從模板載入</Label>
                  <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                    <SelectTrigger><SelectValue placeholder="選擇模板（可選）" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">訊息文字</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="你好 {{學生名}}，提醒你 {{日期}} {{時間}} 有 {{課程名}} 😊"
                  rows={4}
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {["{{學生名}}", "{{課程名}}", "{{日期}}", "{{時間}}", "{{地點}}"].map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-accent"
                      onClick={() => setCustomMessage((prev) => prev + v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & Send */}
        <div className="space-y-4">
          {customMessage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">訊息預覽</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-accent/50 text-sm whitespace-pre-wrap border border-border">
                  {resolveMessage(previewStudent as Student)}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleSend}
            disabled={sending || selectedStudents.length === 0 || !customMessage}
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />發送中...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />發送 WhatsApp 訊息 ({selectedStudents.length} 人)</>
            )}
          </Button>

          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">發送結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-accent/30">
                      {r.success ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="font-medium">{r.studentName}</span>
                      <span className="text-muted-foreground text-xs">{r.phone}</span>
                      {r.error && <span className="text-destructive text-xs ml-auto">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
