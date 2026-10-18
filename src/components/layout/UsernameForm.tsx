import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/store/settings";

export function UsernameForm({
  submitLabel = "Continue",
  onDone,
}: {
  submitLabel?: string;
  onDone?: () => void;
}) {
  const current = useSettings((s) => s.username);
  const setUsername = useSettings((s) => s.setUsername);
  const [value, setValue] = useState(current);
  const trimmed = value.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 20;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setUsername(trimmed);
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Label htmlFor="username">Your name</Label>
      <div className="flex gap-2">
        <Input
          id="username"
          autoFocus
          maxLength={20}
          placeholder="e.g. Asha"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 bg-card"
        />
        <Button type="submit" size="lg" disabled={!valid} className="h-11">
          {submitLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">2–20 characters. Saved on this device only.</p>
    </form>
  );
}
