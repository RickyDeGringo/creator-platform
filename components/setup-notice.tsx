import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupNotice({ detail }: { detail?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Supabase</CardTitle>
        <CardDescription>
          The app is ready. Point it at your project before signup, follows, or access codes will work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
        <p>1. Open the Supabase SQL editor and run supabase/schema.sql.</p>
        <p>2. Copy .env.example to .env.local and add the project URL and anon key.</p>
        <p>3. Restart the dev server.</p>
        {detail ? <p className="text-destructive">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
