import { ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, ArrowLeftCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SupportingTeam = 'east' | 'west' | 'north' | 'south' | null | undefined;

interface TeamSupportBadgeProps {
  team: SupportingTeam;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const teamMeta: Record<string, { icon: React.ComponentType<any>; bg: string; text: string; border: string; label: string }> = {
  east: {
    icon: ArrowRightCircle,
    bg: 'bg-direction-east-bg',
    text: 'text-direction-east',
    border: 'border-direction-east/50',
    label: 'East',
  },
  west: {
    icon: ArrowLeftCircle,
    bg: 'bg-direction-west-bg',
    text: 'text-direction-west',
    border: 'border-direction-west/50',
    label: 'West',
  },
  north: {
    icon: ArrowUpCircle,
    bg: 'bg-direction-north-bg',
    text: 'text-direction-north',
    border: 'border-direction-north/50',
    label: 'North',
  },
  south: {
    icon: ArrowDownCircle,
    bg: 'bg-direction-south-bg',
    text: 'text-direction-south',
    border: 'border-direction-south/50',
    label: 'South',
  },
};

const sizeStyles = {
  sm: { icon: 'w-3 h-3', container: 'px-1 py-0.5 gap-0.5', text: 'text-[9px]' },
  md: { icon: 'w-4 h-4', container: 'px-1.5 py-0.5 gap-1', text: 'text-xs' },
  lg: { icon: 'w-5 h-5', container: 'px-2 py-1 gap-1.5', text: 'text-sm' },
};

export const TeamSupportBadge = ({ team, size = 'sm', showLabel = false }: TeamSupportBadgeProps) => {
  if (!team) return null;

  const meta = teamMeta[team];
  if (!meta) return null;

  const Icon = meta.icon;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        styles.container,
        meta.bg,
        meta.border
      )}
      title={`Supporting ${meta.label}`}
    >
      <Icon className={cn(styles.icon, meta.text)} />
      {showLabel && (
        <span className={cn(styles.text, meta.text, 'font-medium')}>
          {meta.label}
        </span>
      )}
    </div>
  );
};

// Team supporter count tracker
export interface TeamSupporterCounts {
  east: number;
  west: number;
  north: number;
  south: number;
}

export const createEmptyTeamCounts = (): TeamSupporterCounts => ({
  east: 0,
  west: 0,
  north: 0,
  south: 0,
});

// Calculate team counts from a user-to-team map
export const calculateTeamCounts = (userTeamMap: Map<string, SupportingTeam>): TeamSupporterCounts => {
  const counts = createEmptyTeamCounts();
  userTeamMap.forEach((team) => {
    if (team && team in counts) {
      counts[team]++;
    }
  });
  return counts;
};
