"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm({ startupId }: { startupId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setStatus("Choose a file");
      return;
    }
    const body = new FormData();
    body.set("file", file);
    body.set("startupId", startupId);
    const r = await fetch("/api/uploads", { method: "POST", body });
    const j = await r.json();
    if (!r.ok) {
      setStatus(j.error ?? "Upload failed");
      return;
    }
    setStatus("Uploaded.");
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor="file">PDF, TXT, or MD</Label>
      <Input id="file" name="file" type="file" accept=".pdf,.txt,.md" />
      <Button type="submit" size="sm" variant="secondary">
        Upload
      </Button>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </form>
  );
}
