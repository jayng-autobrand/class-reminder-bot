import { useState } from "react";
import type { Course } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, MapPin, Clock, Calendar } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateFormat";
import { ExportCoursesButton, ImportCoursesButton } from "@/components/GoogleSheetsActions";

interface Props {
  courses: Course[];
  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
}

const emptyCourse = { name: "", type: "", date: "", time: "", location: "" };

export default function CourseManager({ courses, addCourse, updateCourse, deleteCourse }: Props) {
  const [form, setForm] = useState(emptyCourse);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
    setForm({ name: course.name, type: course.type, date: course.date, time: course.time, location: course.location });
    setEditingId(course.id);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setForm(emptyCourse);
      setEditingId(null);
    }
  };

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
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新增課程
              </Button>
            </DialogTrigger>
          <DialogContent>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>上課日期 *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>上課時間 *</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
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

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無課程</p>
            <p className="text-muted-foreground text-sm mt-1">點擊「新增課程」開始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="group hover:shadow-md transition-shadow">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(course)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCourse(course.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateDDMMYYYY(course.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.time}</span>
                </div>
                {course.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{course.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
