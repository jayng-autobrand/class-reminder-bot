import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearGoogleToken } from "@/services/googleSheets";
import { useAppState } from "@/hooks/useAppState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardOverview from "@/components/DashboardOverview";
import CourseManager from "@/components/CourseManager";
import StudentManager from "@/components/StudentManager";
import MessageTemplateEditor from "@/components/MessageTemplateEditor";
import ReminderSettings from "@/components/ReminderSettings";
import SendMessage from "@/components/SendMessage";
import MessageHistory from "@/components/MessageHistory";
import GoogleSheetsSettings from "@/components/GoogleSheetsSettings";
import { LayoutDashboard, BookOpen, Users, MessageSquare, Bell, Send, History, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const state = useAppState();
  const [tab, setTab] = useState("overview");
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearGoogleToken();
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">WhatsApp 上堂提示</h1>
                <p className="text-xs text-muted-foreground">自動提醒學員上課</p>
              </div>
            </div>
          </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
              <LogOut className="w-4 h-4" />
              登出
            </Button>
          </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">總覽</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">課程</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">學員</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">訊息模板</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">提醒設定</span>
            </TabsTrigger>
            <TabsTrigger value="send" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">發送訊息</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">發送記錄</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">設定</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview courses={state.courses} students={state.students} templates={state.templates} reminders={state.reminders} />
          </TabsContent>
          <TabsContent value="courses">
            <CourseManager courses={state.courses} addCourse={state.addCourse} updateCourse={state.updateCourse} deleteCourse={state.deleteCourse} />
          </TabsContent>
          <TabsContent value="students">
            <StudentManager students={state.students} courses={state.courses} addStudent={state.addStudent} updateStudent={state.updateStudent} deleteStudent={state.deleteStudent} />
          </TabsContent>
          <TabsContent value="templates">
            <MessageTemplateEditor templates={state.templates} courses={state.courses} addTemplate={state.addTemplate} updateTemplate={state.updateTemplate} deleteTemplate={state.deleteTemplate} />
          </TabsContent>
          <TabsContent value="reminders">
            <ReminderSettings reminders={state.reminders} courses={state.courses} templates={state.templates} students={state.students} addReminder={state.addReminder} updateReminder={state.updateReminder} deleteReminder={state.deleteReminder} />
          </TabsContent>
          <TabsContent value="send">
            <SendMessage courses={state.courses} students={state.students} templates={state.templates} />
          </TabsContent>
          <TabsContent value="history">
            <MessageHistory />
          </TabsContent>
          <TabsContent value="settings">
            <GoogleSheetsSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
