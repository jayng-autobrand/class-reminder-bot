import { useState, useRef } from "react";
import type { Course, Student } from "@/types";
import { googleSheets } from "@/services/googleSheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download } from "lucide-react";

interface ExportCoursesProps {
  courses: Course[];
}

interface ExportStudentsProps {
  students: Student[];
  courses: Course[];
}

interface ImportCoursesProps {
  onImport: (courses: Omit<Course, "id">[]) => void;
}

interface ImportStudentsProps {
  onImport: (students: Omit<Student, "id">[]) => void;
  courses: Course[];
}

export function ExportCoursesButton({ courses }: ExportCoursesProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const headers = ["名稱", "類型", "日期", "時間", "地點"];
      const rows = courses.map((c) => [c.name, c.type, c.date, c.time, c.location]);
      const id = await googleSheets.exportToNewSheet(`課程匯出 ${new Date().toLocaleDateString("zh-TW")}`, headers, rows);
      toast({ title: "匯出成功", description: `已建立 Google Sheet，共 ${courses.length} 筆` });
      window.open(`https://docs.google.com/spreadsheets/d/${id}`, "_blank");
    } catch (err: any) {
      toast({ title: "匯出失敗", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || courses.length === 0}>
      <Download className="w-4 h-4 mr-1" />
      {loading ? "匯出中…" : "匯出至 Google Sheets"}
    </Button>
  );
}

export function ExportStudentsButton({ students, courses }: ExportStudentsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const getCourseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "";

  const handleExport = async () => {
    setLoading(true);
    try {
      const headers = ["姓名", "WhatsApp", "Email", "課程"];
      const rows = students.map((s) => [s.name, s.phone, s.email, getCourseName(s.courseId)]);
      const id = await googleSheets.exportToNewSheet(`學員匯出 ${new Date().toLocaleDateString("zh-TW")}`, headers, rows);
      toast({ title: "匯出成功", description: `已建立 Google Sheet，共 ${students.length} 筆` });
      window.open(`https://docs.google.com/spreadsheets/d/${id}`, "_blank");
    } catch (err: any) {
      toast({ title: "匯出失敗", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || students.length === 0}>
      <Download className="w-4 h-4 mr-1" />
      {loading ? "匯出中…" : "匯出至 Google Sheets"}
    </Button>
  );
}

export function ImportCoursesButton({ onImport }: ImportCoursesProps) {
  const [open, setOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const extractId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || url.trim();
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const id = extractId(sheetUrl);
      const rows = await googleSheets.readSheet(id, "Sheet1");
      if (rows.length < 2) { toast({ title: "無資料", description: "試算表無有效資料列", variant: "destructive" }); return; }
      const courses: Omit<Course, "id">[] = rows.slice(1).map((r) => ({
        name: r[0] || "", type: r[1] || "", date: r[2] || "", time: r[3] || "", location: r[4] || "",
      })).filter((c) => c.name && c.date && c.time);
      onImport(courses);
      toast({ title: "匯入成功", description: `匯入 ${courses.length} 筆課程` });
      setOpen(false);
      setSheetUrl("");
    } catch (err: any) {
      toast({ title: "匯入失敗", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" />從 Google Sheets 匯入</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>匯入課程</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">格式：名稱, 類型, 日期, 時間, 地點（第一列為標題列）</p>
          <div>
            <Label>Google Sheet 網址或 ID</Label>
            <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="貼上 Google Sheet 的網址" />
          </div>
          <Button onClick={handleImport} disabled={loading || !sheetUrl} className="w-full">
            {loading ? "匯入中…" : "開始匯入"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImportStudentsButton({ onImport, courses }: ImportStudentsProps) {
  const [open, setOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const extractId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || url.trim();
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const id = extractId(sheetUrl);
      const rows = await googleSheets.readSheet(id, "Sheet1");
      if (rows.length < 2) { toast({ title: "無資料", description: "試算表無有效資料列", variant: "destructive" }); return; }
      const students: Omit<Student, "id">[] = rows.slice(1).map((r) => {
        const courseName = r[3] || "";
        const course = courses.find((c) => c.name === courseName);
        return { name: r[0] || "", phone: r[1] || "", email: r[2] || "", courseId: course?.id || "" };
      }).filter((s) => s.name && s.phone && s.courseId);
      onImport(students);
      toast({ title: "匯入成功", description: `匯入 ${students.length} 筆學員` });
      setOpen(false);
      setSheetUrl("");
    } catch (err: any) {
      toast({ title: "匯入失敗", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" />從 Google Sheets 匯入</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>匯入學員</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">格式：姓名, WhatsApp, Email, 課程名稱（第一列為標題列）</p>
          <div>
            <Label>Google Sheet 網址或 ID</Label>
            <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="貼上 Google Sheet 的網址" />
          </div>
          <Button onClick={handleImport} disabled={loading || !sheetUrl} className="w-full">
            {loading ? "匯入中…" : "開始匯入"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
