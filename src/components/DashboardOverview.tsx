import type { Course, Student, MessageTemplate, ReminderSetting } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, MessageSquare, Bell, Send } from "lucide-react";

interface Props {
  courses: Course[];
  students: Student[];
  templates: MessageTemplate[];
  reminders: ReminderSetting[];
}

export default function DashboardOverview({ courses, students, templates, reminders }: Props) {
  const activeReminders = reminders.filter((r) => r.enabled).length;

  const stats = [
    { label: "課程數量", value: courses.length, icon: BookOpen, color: "text-primary" },
    { label: "學員人數", value: students.length, icon: Users, color: "text-info" },
    { label: "訊息模板", value: templates.length, icon: MessageSquare, color: "text-warning" },
    { label: "啟用提醒", value: activeReminders, icon: Bell, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">總覽</h2>
        <p className="text-muted-foreground mt-1">系統狀態一覽</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">即將上課</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses.slice(0, 5).map((course) => {
                const studentCount = students.filter((s) => s.courseId === course.id).length;
                return (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{course.name}</p>
                      <p className="text-sm text-muted-foreground">{course.date} · {course.time}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {studentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        待發送
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
