import { useSearchParams } from "react-router-dom";
import { BarChart3, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import AdvancedHistory from "@/pages/AdvancedHistory";
import AdvancedAnalytics from "@/pages/AdvancedAnalytics";

const Advanced = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "analytics" ? "analytics" : "history";

  const onTabChange = (nextTab: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "history") {
      next.delete("tab");
    } else {
      next.set("tab", nextTab);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Advanced"
          icon={BarChart3}
          description="Backend-backed history and analytics workspace"
        />

        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Advanced History</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /> Advanced Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-0">
            <AdvancedHistory embedded />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AdvancedAnalytics embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Advanced;
