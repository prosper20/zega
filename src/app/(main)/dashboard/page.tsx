import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {APP_CONFIG.name}</CardTitle>
          <CardDescription>{APP_CONFIG.tagline}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
