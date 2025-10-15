import { Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/store/settings";
import { validateBackendUrl, validatePollInterval } from "@/utils/validation";

export function SettingsPanel() {
  const { backendUrl, pollInterval, setBackendUrl, setPollInterval, reset } =
    useSettings();
  const [open, setOpen] = useState(false);
  const [localUrl, setLocalUrl] = useState(backendUrl);
  const [localInterval, setLocalInterval] = useState(pollInterval.toString());

  const handleSave = () => {
    // Validate backend URL
    const urlError = validateBackendUrl(localUrl);
    if (urlError) {
      toast.error(urlError);
      return;
    }

    // Validate poll interval
    const intervalMs = Number.parseInt(localInterval, 10);
    if (Number.isNaN(intervalMs)) {
      toast.error("Poll interval must be a number");
      return;
    }

    const intervalError = validatePollInterval(intervalMs);
    if (intervalError) {
      toast.error(intervalError);
      return;
    }

    // Save settings
    setBackendUrl(localUrl);
    setPollInterval(intervalMs);
    setOpen(false);
    toast.success("Settings saved");
  };

  const handleReset = () => {
    reset();
    setLocalUrl(DEFAULT_SETTINGS.backendUrl);
    setLocalInterval(DEFAULT_SETTINGS.pollInterval.toString());
    toast.success("Settings reset to defaults");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset local state when opening
      setLocalUrl(backendUrl);
      setLocalInterval(pollInterval.toString());
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure backend URL and polling behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="backend-url">Backend URL</Label>
            <Input
              id="backend-url"
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="http://localhost:8000"
              type="url"
              value={localUrl}
            />
            <p className="text-muted-foreground text-xs">
              The URL of the inference API backend
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-interval">Poll Interval (ms)</Label>
            <Input
              id="poll-interval"
              onChange={(e) => setLocalInterval(e.target.value)}
              placeholder="2000"
              type="number"
              value={localInterval}
            />
            <p className="text-muted-foreground text-xs">
              How often to check job status (500-30000ms)
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={handleSave}>
              Save Changes
            </Button>
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
