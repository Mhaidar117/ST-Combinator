"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ComparePicker(props: {
  startupId: string;
  analyses: { id: string; label: string }[];
  leftId?: string;
  rightId?: string;
}) {
  const router = useRouter();

  function go(left: string, right: string) {
    const sp = new URLSearchParams();
    sp.set("left", left);
    sp.set("right", right);
    router.push(`/compare/${props.startupId}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 max-w-md">
      <div className="space-y-1">
        <Label>Analysis A</Label>
        <select
          id="left"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={props.leftId ?? ""}
        >
          <option value="">Select…</option>
          {props.analyses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Analysis B</Label>
        <select
          id="right"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={props.rightId ?? ""}
        >
          <option value="">Select…</option>
          {props.analyses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        onClick={() => {
          const left = (document.getElementById("left") as HTMLSelectElement)
            .value;
          const right = (document.getElementById("right") as HTMLSelectElement)
            .value;
          if (!left || !right || left === right) return;
          go(left, right);
        }}
      >
        Compare
      </Button>
    </div>
  );
}
