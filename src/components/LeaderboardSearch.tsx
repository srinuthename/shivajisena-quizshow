import { memo, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LeaderboardSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalEntries: number;
}

export const LeaderboardSearch = memo(({
  searchQuery,
  onSearchChange,
  totalEntries,
}: LeaderboardSearchProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Search Input */}
      <div className={cn(
        "relative flex-1 transition-all",
        isFocused && "ring-2 ring-primary/50 rounded-md"
      )}>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search users..."
          className="pl-8 pr-8 h-8 text-sm bg-card/50"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Total Count */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {totalEntries} viewers
      </span>
    </div>
  );
});

LeaderboardSearch.displayName = "LeaderboardSearch";
