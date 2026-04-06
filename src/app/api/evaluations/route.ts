import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PgBoss } from "pg-boss";

const createSchema = z.object({
  url: z.string().url(),
  task: z.string().min(5).max(1000),
  provider: z.enum(["anthropic", "openai", "google", "ollama"]),
  model: z.string().min(1),
});

async function getBoss() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();
  return boss;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { url, task, provider, model } = parsed.data;

  // Verify user has an API key for this provider (or it's Ollama which may not need one)
  if (provider !== "ollama") {
    const key = await prisma.userApiKey.findUnique({
      where: { userId_provider: { userId: session.user.id, provider } },
    });
    if (!key) {
      return NextResponse.json(
        { error: `No API key configured for ${provider}. Please add one in Settings.` },
        { status: 400 }
      );
    }
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      userId: session.user.id,
      url,
      task,
      provider,
      model,
      status: "queued",
    },
  });

  // Enqueue the job
  const boss = await getBoss();
  await boss.createQueue("evaluation");
  await boss.send("evaluation", { evaluationId: evaluation.id });
  await boss.stop();

  return NextResponse.json(evaluation, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const evaluations = await prisma.evaluation.findMany({
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
  });

  return NextResponse.json(evaluations);
}
