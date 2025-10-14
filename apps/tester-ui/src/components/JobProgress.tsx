import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { JobStatus } from "@/lib/api/schemas";
import { formatProgress } from "@/utils/format";
import { getStageLabel, isTerminalState } from "@/utils/stage-labels";

const PERCENT = 100;

type JobProgressProps = {
  status: JobStatus;
  progress: number;
  message?: string;
};

export function JobProgress({ status, progress, message }: JobProgressProps) {
  const isComplete = isTerminalState(status);
  const isFailed = status === "failed";

  const getBadgeVariant = () => {
    if (isFailed) {
      return "destructive";
    }
    if (isComplete) {
      return "default";
    }
    return "secondary";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant()}>{getStageLabel(status)}</Badge>
          <span className="text-muted-foreground text-sm">
            {formatProgress(progress)}
          </span>
        </div>
      </div>

      <Progress value={progress * PERCENT} />

      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
