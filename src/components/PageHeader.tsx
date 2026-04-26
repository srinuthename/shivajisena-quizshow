import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Unified header used across all protected admin pages so that the back-link,
 * title, icon, description, and right-side actions share a single styling and
 * behaviour.
 */
export const PageHeader = ({
  title,
  description,
  icon: Icon,
  backTo = "/admin",
  backLabel = "Back to Admin",
  actions,
  className,
}: PageHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3 md:items-center">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="shrink-0 -ml-2 h-9 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <Link to={backTo} aria-label={backLabel}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-bold leading-tight text-foreground md:text-2xl">
            {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" /> : null}
            <span className="truncate">{title}</span>
          </h1>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      ) : null}
    </motion.div>
  );
};

export default PageHeader;
