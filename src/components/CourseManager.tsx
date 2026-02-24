import { useState } from "react";
import type { Course } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, BookOpen, MapPin, Clock, Calendar, Hash, Archive, ChevronDown, ChevronUp, Repeat } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";
import { formatRecurringDays, getNextSessionDate, WEEKDAY_LABELS } from "@/lib/courseSchedule";
import { ExportCoursesButton, ImportCoursesButton } from "@/components/GoogleSheetsActions";

interface Props {
  courses: Course[];
  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
}

const emptyCourse = { name: "", type: "", date: "", time: "", timeEnd: "", location: "", totalSessions: 1, completedSessions: 0, recurringDays: "" };

function isCourseExpired(course: Course): boolean {
  if (course.totalSessions > 1 && course.recurringDays) {
    // For recurring: expired when all sessions done
    return course.completedSessions >= course.totalSessions;
  }
  const endTime = course.timeEnd || course.time || "00:00:00";
  const courseDateTime = new Date(`${course.date}T${endTime}`);
  return !Number.isNaN(courseDateTime.getTime()) && courseDateTime < new Date();
}

function CourseCard({ course, onEdit, onDelete, onUpdateSessions }: { course: Course; onEdit: () => void; onDelete: () => void; onUpdateSessions: (completed: number) => void }) {
  const progress = course.totalSessions > 0 ? Math.round((course.completedSessions / course.totalSessions) * 100) : 0;
  const nextDate = course.recurringDays ? getNextSessionDate(course) : null;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.name}</CardTitle>
            {course.type && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">
                {course.type}
              </span>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {course.recurringDays ? (
          <>
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              <span>{formatRecurringDays(course.recurringDays)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>開始：{formatDateDDMMYYYY(course.date)}</span>
            </div>
            {nextDate && (
              <div className="flex items-center gap-2 text-primary font-medium">
                <Calendar className="w-4 h-4" />
                <span>下堂：{formatDateDDMMYYYY(nextDate)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDateDDMMYYYY(course.date)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{course.time}{course.timeEnd ? ` – ${course.timeEnd}` : ""}</span>
        </div>
        {course.totalSessions > 1 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                已上 {course.completedSessions}/{course.totalSessions} 堂
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={course.completedSessions <= 0}
                  onClick={(e) => { e.stopPropagation(); onUpdateSessions(course.completedSessions - 1); }}>
                  <span className="text-xs font-bold">−</span>
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={course.completedSessions >= course.totalSessions}
                  onClick={(e) => { e.stopPropagation(); onUpdateSessions(course.completedSessions + 1); }}>
                  <span className="text-xs font-bold">+</span>
                </Button>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {course.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{course.location}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CourseManager({ courses, addCourse, updateCourse, deleteCourse }: Props) {
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeCourses = courses.filter((c) => !isCourseExpired(c));
  const archivedCourses = courses.filter((c) => isCourseExpired(c));

  const handleSave = () => {
    if (!form.name || !form.date || !form.time) return;
    if (editingId) {
      updateCourse(editingId, form);
    } else {
      addCourse(form);
    }
    setForm(emptyCourse);
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (course: Course) => {
    setForm({
      name: course.name, type: course.type, date: course.date, time: course.time, timeEnd: course.timeEnd,
      location: course.location, totalSessions: course.totalSessions, completedSessions: course.completedSessions,
      recurringDays: course.recurringDays,
    });
    setEditingId(course.id);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setForm(emptyCourse); setEditingId(null); }
  };

  const toggleDay = (day: number) => {
    const current = form.recurringDays ? form.recurringDays.split(",").map(Number).filter((n) => !isNaN(n)) : [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    setForm({ ...form, recurringDays: updated.join(",") });
  };

  const selectedDays = form.recurringDays ? form.recurringDays.split(",").map(Number).filter((n) => !isNaN(n)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">課程管理</h2>
          <p className="text-muted-foreground mt-1">新增、編輯或刪除你的課程</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportCoursesButton onImport={async (items) => { for (const c of items) await addCourse(c); }} />
          <ExportCoursesButton courses={courses} />
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />新增課程</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "編輯課程" : "新增課程"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>課程名稱 *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：基礎班 A" />
                </div>
                <div>
                  <Label>課程類型</Label>
                  <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="例如：基礎、進階" />
                </div>
                <div>
                  <Label>開始日期 *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>開始時間 *</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div>
                    <Label>結束時間</Label>
                    <Input type="time" value={form.timeEnd} onChange={(e) => setForm({ ...form, timeEnd: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>總堂數</Label>
                  <Input type="number" min={1} value={form.totalSessions}
                    onChange={(e) => setForm({ ...form, totalSessions: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
                {form.totalSessions > 1 && (
                  <div>
                    <Label>每週上堂日</Label>
                    <p className="text-xs text-muted-foreground mb-2">揀選每星期邊日上堂，系統會自動計算所有堂嘅日期</p>
                    <div className="flex gap-2 flex-wrap">
                      {WEEKDAY_LABELS.map((label, i) => (
                        <label key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${selectedDays.includes(i) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"}`}>
                          <Checkbox checked={selectedDays.includes(i)} onCheckedChange={() => toggleDay(i)} className="hidden" />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label>地點 / Zoom Link</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="例如：Room 101 或 Zoom link" />
                </div>
                <Button onClick={handleSave} className="w-full">{editingId ? "儲存修改" : "新增課程"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {activeCourses.length === 0 && archivedCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無課程</p>
            <p className="text-muted-foreground text-sm mt-1">點擊「新增課程」開始</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeCourses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCourses.map((course) => (
                <CourseCard key={course.id} course={course} onEdit={() => handleEdit(course)} onDelete={() => deleteCourse(course.id)}
                  onUpdateSessions={(n) => updateCourse(course.id, { completedSessions: n })} />
              ))}
            </div>
          )}
          {activeCourses.length === 0 && archivedCourses.length > 0 && (
            <p className="text-muted-foreground">目前冇進行中嘅課程</p>
          )}
        </>
      )}

      {archivedCourses.length > 0 && (
        <div className="space-y-4">
          <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowArchived(!showArchived)}>
            <Archive className="w-4 h-4" />已完成課程 ({archivedCourses.length})
            {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          {showArchived && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
              {archivedCourses.map((course) => (
                <CourseCard key={course.id} course={course} onEdit={() => handleEdit(course)} onDelete={() => deleteCourse(course.id)}
                  onUpdateSessions={(n) => updateCourse(course.id, { completedSessions: n })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
