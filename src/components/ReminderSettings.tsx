import { useState } from "react";
import type { ReminderSetting, Course, MessageTemplate, Student } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Bell, BellOff, Clock } from "lucide-react";

interface Props {
  reminders: ReminderSetting[];
  courses: Course[];
  templates: MessageTemplate[];
  students: Student[];
  addReminder: (r: Omit<ReminderSetting, "id">) => void;
  updateReminder: (id: string, data: Partial<ReminderSetting>) => void;
  deleteReminder: (id: string) => void;
}

const emptyReminder = { courseId: "", daysBefore: 1, hoursBefore: 0, templateId: "", enabled: true };

export default function ReminderSettings({ reminders, courses, templates, students, addReminder, updateReminder, deleteReminder }: Props) {
  const [form, setForm] = useState(emptyReminder);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (!form.courseId || !form.templateId) return;
    addReminder(form);
    setForm(emptyReminder);
    setOpen(false);
  };

  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";
  const getTemplateName = (id: string) => templates.find((t) => t.id === id)?.name ?? "—";
  const getStudentCount = (courseId: string) => students.filter((s) => s.courseId === courseId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">提醒設定</h2>
          <p className="text-muted-foreground mt-1">設定每個課程的提醒時間和模板</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />新增提醒</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增提醒規則</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>課程 *</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇課程" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>提前幾日</Label>
                  <Input type="number" min={0} value={form.daysBefore} onChange={(e) => setForm({ ...form, daysBefore: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>提前幾小時</Label>
                  <Input type="number" min={0} value={form.hoursBefore} onChange={(e) => setForm({ ...form, hoursBefore: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>訊息模板 *</Label>
                <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                  <SelectTrigger><SelectValue placeholder="選擇模板" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">新增提醒</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reminders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無提醒規則</p>
            <p className="text-muted-foreground text-sm mt-1">點擊「新增提醒」開始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reminders.map((r) => (
            <Card key={r.id} className={`transition-all ${r.enabled ? "" : "opacity-60"}`}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {r.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{getCourseName(r.courseId)}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        提前 {r.daysBefore > 0 ? `${r.daysBefore} 日` : ""}{r.hoursBefore > 0 ? ` ${r.hoursBefore} 小時` : ""}
                      </span>
                      <span>·</span>
                      <span>模板：{getTemplateName(r.templateId)}</span>
                      <span>·</span>
                      <span>{getStudentCount(r.courseId)} 位學員</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(checked) => updateReminder(r.id, { enabled: checked })}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteReminder(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
