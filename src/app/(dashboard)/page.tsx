import { EvaluationForm } from "@/components/app/EvaluationForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function statusColor(status: string) {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export default async function HomePage() {
  const session = await auth();
  const recent = session?.user?.id
    ? await prisma.evaluation.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, url: true, task: true, status: true, createdAt: true },
      })
    : [];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold">New Evaluation</h2>
        <p className="text-muted-foreground mt-1">
          Enter a URL and describe a task. The AI will attempt it and evaluate the UX.
        </p>
      </div>

      <EvaluationForm />

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Evaluations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((e) => (
              <Link
                key={e.id}
                href={`/evaluations/${e.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.url}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.task}</p>
                </div>
                <Badge variant={statusColor(e.status)} className="ml-3 shrink-0">
                  {e.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
