import { useState } from "react";
import type { MessageTemplate, Course } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageSquare, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  templates: MessageTemplate[];
  courses: Course[];
  addTemplate: (t: Omit<MessageTemplate, "id">) => void;
  updateTemplate: (id: string, data: Partial<MessageTemplate>) => void;
  deleteTemplate: (id: string) => void;
}

const VARIABLES = [
  { label: "學生名", value: "{{學生名}}" },
  { label: "課程名", value: "{{課程名}}" },
  { label: "日期", value: "{{日期}}" },
  { label: "時間", value: "{{時間}}" },
  { label: "地點", value: "{{地點}}" },
];

const emptyTemplate = { name: "", content: "", courseId: "" };

export default function MessageTemplateEditor({ templates, courses, addTemplate, updateTemplate, deleteTemplate }: Props) {
  const [form, setForm] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (!form.name || !form.content) return;
    if (editingId) {
      updateTemplate(editingId, form);
    } else {
      addTemplate(form);
    }
    setForm(emptyTemplate);
    setEditingId(null);
    setOpen(false);
    toast({ title: "已儲存", description: "訊息模板已成功儲存" });
  };

  const handleEdit = (t: MessageTemplate) => {
    setForm({ name: t.name, content: t.content, courseId: t.courseId });
    setEditingId(t.id);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setForm(emptyTemplate); setEditingId(null); }
  };

  const insertVariable = (variable: string) => {
    setForm({ ...form, content: form.content + variable });
  };

  const previewMessage = (content: string) => {
    return content
      .replace("{{學生名}}", "陳大文")
      .replace("{{課程名}}", "基礎班 A")
      .replace("{{日期}}", "2026-03-01")
      .replace("{{時間}}", "10:00")
      .replace("{{地點}}", "Room 101");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">訊息模板</h2>
          <p className="text-muted-foreground mt-1">自訂 WhatsApp 提示訊息內容</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新增模板</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "編輯模板" : "新增模板"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>模板名稱 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：標準上堂提示" />
              </div>
              <div>
                <Label>訊息內容 *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {VARIABLES.map((v) => (
                    <Badge
                      key={v.value}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => insertVariable(v.value)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      {v.label}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="你好 {{學生名}}，提醒你 {{日期}} {{時間}} 有 {{課程名}} 😊"
                  rows={5}
                />
              </div>
              {form.content && (
                <div>
                  <Label className="text-muted-foreground">預覽效果</Label>
                  <div className="mt-1 p-4 rounded-xl bg-accent/50 text-sm whitespace-pre-wrap border border-border">
                    {previewMessage(form.content)}
                  </div>
                </div>
              )}
              <Button onClick={handleSave} className="w-full">{editingId ? "儲存修改" : "新增模板"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無訊息模板</p>
            <p className="text-muted-foreground text-sm mt-1">點擊「新增模板」開始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg bg-accent/30 text-sm whitespace-pre-wrap text-muted-foreground">
                  {t.content}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
