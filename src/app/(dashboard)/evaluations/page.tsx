import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function statusColor(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export default async function EvaluationsPage() {
  const session = await auth();
  const evaluations = session?.user?.id
    ? await prisma.evaluation.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          url: true,
          task: true,
          provider: true,
          model: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      })
    : [];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Evaluation History</h2>
        <p className="text-muted-foreground mt-1">All your past UX evaluations</p>
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No evaluations yet.{" "}
            <Link href="/" className="underline hover:text-foreground">
              Start one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {evaluations.map((e) => (
            <Link key={e.id} href={`/evaluations/${e.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm font-medium truncate">{e.url}</CardTitle>
                    <Badge variant={statusColor(e.status)} className="shrink-0">
                      {e.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.task}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {e.provider} · {e.model} · {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
