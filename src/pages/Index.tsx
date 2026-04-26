import { TeamQuiz } from "@/components/TeamQuiz";
import { usePageTitle } from "@/hooks/usePageTitle";

const Index = () => {
  usePageTitle();
  return <TeamQuiz />;
};

export default Index;
