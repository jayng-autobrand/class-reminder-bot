import { useState } from "react";
import type { Course, Student } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, Phone, Mail } from "lucide-react";
import { ExportStudentsButton, ImportStudentsButton } from "@/components/GoogleSheetsActions";

interface Props {
  students: Student[];
  courses: Course[];
  addStudent: (s: Omit<Student, "id">) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  onRefresh?: () => void;
}

const emptyStudent = { name: "", phone: "", email: "", courseId: "" };

export default function StudentManager({ students, courses, addStudent, updateStudent, deleteStudent, onRefresh }: Props) {
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filterCourse, setFilterCourse] = useState<string>("all");

  const filtered = filterCourse === "all" ? students : students.filter((s) => s.courseId === filterCourse);
  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

  const handleSave = () => {
    if (!form.name || !form.phone || !form.courseId) return;
    if (editingId) {
      updateStudent(editingId, form);
    } else {
      addStudent(form);
    }
    setForm(emptyStudent);
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (student: Student) => {
    setForm({ name: student.name, phone: student.phone, email: student.email, courseId: student.courseId });
    setEditingId(student.id);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setForm(emptyStudent); setEditingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">學員名單</h2>
          <p className="text-muted-foreground mt-1">管理各課程的學員資料</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="篩選課程" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部課程</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ImportStudentsButton onImport={async (items) => { for (const s of items) await addStudent(s); }} courses={courses} onCoursesCreated={onRefresh} />
          <ExportStudentsButton students={students} courses={courses} />
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />新增學員</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "編輯學員" : "新增學員"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>姓名 *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="學員姓名" />
                </div>
                <div>
                  <Label>WhatsApp 電話 *</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="例如：85291234567" />
                </div>
                <div>
                  <Label>Email（可選）</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>所屬課程 *</Label>
                  <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                    <SelectTrigger><SelectValue placeholder="選擇課程" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">{editingId ? "儲存修改" : "新增學員"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">暫無學員</p>
            <p className="text-muted-foreground text-sm mt-1">點擊「新增學員」開始</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>課程</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {student.phone}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {student.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {student.email}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                      {getCourseName(student.courseId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(student)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStudent(student.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
