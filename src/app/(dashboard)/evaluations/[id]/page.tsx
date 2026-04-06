import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { EvaluationProgress, type Evaluation } from "@/components/app/EvaluationProgress";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      result: true,
    },
  });

  if (!evaluation) notFound();
  if (evaluation.userId !== session.user.id) notFound();

  const data: Evaluation = {
    id: evaluation.id,
    url: evaluation.url,
    task: evaluation.task,
    provider: evaluation.provider,
    model: evaluation.model,
    status: evaluation.status,
    errorMsg: evaluation.errorMsg ?? null,
    createdAt: evaluation.createdAt.toISOString(),
    steps: evaluation.steps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      action: s.action,
      actionDetail: s.actionDetail ?? null,
      observation: s.observation ?? null,
      screenshotPath: s.screenshotPath ?? null,
    })),
    result: evaluation.result ?? null,
  };

  return <EvaluationProgress initialData={data} />;
}
