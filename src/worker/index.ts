import "dotenv/config";
import { PgBoss } from "pg-boss";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../lib/crypto";
import { runEvaluation } from "../lib/playwright/agent";

const prisma = new PrismaClient();

interface EvaluationJob {
  evaluationId: string;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  console.log("[worker] Starting pg-boss worker...");

  const boss = new PgBoss(databaseUrl);

  boss.on("error", (err: unknown) => console.error("[worker] pg-boss error:", err));

  await boss.start();
  console.log("[worker] pg-boss started");

  await boss.createQueue("evaluation");

  await boss.work<EvaluationJob>(
    "evaluation",
    { batchSize: 1 },
    async (jobs: { data: EvaluationJob }[]) => {
      for (const job of jobs) {
        const { evaluationId } = job.data;
        console.log(`[worker] Processing evaluation ${evaluationId}`);

        const evaluation = await prisma.evaluation.findUnique({
          where: { id: evaluationId },
        });

        if (!evaluation) {
          console.error(`[worker] Evaluation ${evaluationId} not found`);
          continue;
        }

        const userKey = await prisma.userApiKey.findUnique({
          where: {
            userId_provider: {
              userId: evaluation.userId,
              provider: evaluation.provider,
            },
          },
        });

        const apiKey = userKey ? decrypt(userKey.encryptedKey) : "";
        const baseUrl = userKey?.baseUrl ?? undefined;

        await runEvaluation(
          evaluationId,
          evaluation.url,
          evaluation.task,
          evaluation.provider,
          evaluation.model,
          apiKey,
          baseUrl
        );

        console.log(`[worker] Evaluation ${evaluationId} completed`);
      }
    }
  );

  console.log("[worker] Listening for jobs...");

  process.on("SIGTERM", async () => {
    console.log("[worker] Shutting down...");
    await boss.stop();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
