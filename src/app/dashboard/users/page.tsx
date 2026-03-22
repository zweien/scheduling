import { requireAuth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { DutyUserManagement } from '@/components/DutyUserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderManagement } from '@/components/LeaderManagement';

export default async function UsersPage() {
  const account = await requireAuth();
  const canManage = account.role === 'admin';

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="值班人员" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <Tabs defaultValue="duty" className="space-y-4">
            <TabsList>
              <TabsTrigger value="duty">值班人员</TabsTrigger>
              <TabsTrigger value="leader">值班领导</TabsTrigger>
            </TabsList>
            <TabsContent value="duty">
              <DutyUserManagement canManage={canManage} />
            </TabsContent>
            <TabsContent value="leader">
              <LeaderManagement canManage={canManage} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
