import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewStartupForm } from "@/components/startup/new-startup-form";

export default function NewStartupPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New startup</h1>
        <p className="text-muted-foreground text-sm">
          Progressive disclosure — required fields first. You can iterate
          later. Have a pitch deck or memo? Upload it to auto-fill.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <NewStartupForm />
        </CardContent>
      </Card>
    </div>
  );
}
