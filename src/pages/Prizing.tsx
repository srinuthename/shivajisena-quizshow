import { Gift } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import PrizeAssignmentsPage from "@/pages/PrizeAssignments";

const Prizing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Prize Assignments"
          icon={Gift}
          description="Assign winners after the run. Prize policy now lives in the Admin dashboard."
        />
        <PrizeAssignmentsPage embedded />
      </div>
    </div>
  );
};

export default Prizing;
