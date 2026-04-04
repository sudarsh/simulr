import { chromium } from "playwright";
import { generateText } from "ai";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getModel } from "@/lib/ai/providers";
import { AGENT_SYSTEM_PROMPT, SCORECARD_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const MAX_STEPS = 25;
const SCREENSHOTS_DIR = path.join(process.cwd(), "public", "screenshots");

interface AgentAction {
  observation: string;
  action: string;
  target: string;
  value: string;
  reasoning: string;
  done: boolean;
}

interface ScorecardResult {
  taskCompletionScore: number;
  taskCompletionNotes: string;
  visualClarityScore: number;
  visualClarityNotes: string;
  errorHandlingScore: number;
  errorHandlingNotes: string;
  accessibilityScore: number;
  accessibilityNotes: string;
  overallScore: number;
  summary: string;
  recommendations: string[];
}

export async function runEvaluation(
  evaluationId: string,
  url: string,
  task: string,
  provider: string,
  modelId: string,
  apiKey: string,
  baseUrl?: string
) {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const model = getModel(provider, modelId, apiKey, baseUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const stepHistory: string[] = [];
  const screenshotPaths: string[] = [];

  try {
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { status: "running" },
    });

    // Step 0: navigate to the URL
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    for (let stepNum = 1; stepNum <= MAX_STEPS; stepNum++) {
      // Take screenshot
      const screenshotFile = `${evaluationId}-step-${stepNum}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFile);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      screenshotPaths.push(screenshotPath);
      const screenshotPublicPath = `/screenshots/${screenshotFile}`;

      const historyText =
        stepHistory.length > 0
          ? `\nPrevious steps:\n${stepHistory.map((s, i) => `Step ${i + 1}: ${s}`).join("\n")}`
          : "";

      const prompt = `Task to accomplish: ${task}\nCurrent URL: ${page.url()}${historyText}\n\nWhat do you observe and what is your next action?`;

      const screenshotBuffer = await fs.readFile(screenshotPath);

      const { text } = await generateText({
        model,
        system: AGENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: screenshotBuffer,
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      let agentAction: AgentAction;
      try {
        const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
        agentAction = JSON.parse(cleaned);
      } catch {
        agentAction = {
          observation: text,
          action: "done",
          target: "",
          value: "",
          reasoning: "Could not parse AI response",
          done: true,
        };
      }

      const stepSummary = `${agentAction.action} - ${agentAction.observation}`;
      stepHistory.push(stepSummary);

      await prisma.evaluationStep.create({
        data: {
          evaluationId,
          stepNumber: stepNum,
          action: agentAction.action,
          actionDetail: agentAction.target || agentAction.value || undefined,
          observation: agentAction.observation,
          screenshotPath: screenshotPublicPath,
        },
      });

      if (agentAction.done || agentAction.action === "done") break;

      // Execute the action
      try {
        switch (agentAction.action) {
          case "click":
            if (agentAction.target) {
              await page.click(agentAction.target, { timeout: 5000 }).catch(async () => {
                // Fallback: try to find by text
                const el = page.getByText(agentAction.target, { exact: false }).first();
                await el.click({ timeout: 5000 });
              });
            }
            break;
          case "type":
            if (agentAction.target) {
              await page.click(agentAction.target, { timeout: 5000 });
              await page.keyboard.type(agentAction.value ?? "");
            }
            break;
          case "scroll":
            await page.evaluate((dir) => {
              window.scrollBy(0, dir === "down" ? 400 : -400);
            }, agentAction.value);
            break;
          case "navigate":
            await page.goto(agentAction.value, { waitUntil: "domcontentloaded", timeout: 30000 });
            break;
          case "wait":
            await page.waitForTimeout(2000);
            break;
        }
        await page.waitForTimeout(1000);
      } catch {
        // Action failed — continue to next step
      }
    }

    // Generate scorecard
    const scorecard = await generateScorecard(
      model,
      task,
      stepHistory,
      screenshotPaths
    );

    await prisma.evaluationResult.create({
      data: {
        evaluationId,
        ...scorecard,
      },
    });

    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { status: "completed", completedAt: new Date() },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: { status: "failed", errorMsg: msg, completedAt: new Date() },
    });
    throw error;
  } finally {
    await browser.close();
  }
}

async function generateScorecard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  task: string,
  stepHistory: string[],
  screenshotPaths: string[]
): Promise<ScorecardResult> {
  // Use up to 5 screenshots (spread across the session)
  const selectedPaths =
    screenshotPaths.length <= 5
      ? screenshotPaths
      : [0, 1, Math.floor(screenshotPaths.length / 2), screenshotPaths.length - 2, screenshotPaths.length - 1]
          .map((i) => screenshotPaths[i]);

  const imageContents = await Promise.all(
    selectedPaths.map(async (p) => {
      const buf = await fs.readFile(p);
      return {
        type: "image" as const,
        image: buf,
      };
    })
  );

  const sessionSummary = stepHistory
    .map((s, i) => `Step ${i + 1}: ${s}`)
    .join("\n");

  const { text } = await generateText({
    model,
    system: SCORECARD_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: `Task: ${task}\n\nSession observations:\n${sessionSummary}\n\nPlease generate the UX scorecard.`,
          },
        ],
      },
    ],
  });

  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const result = JSON.parse(cleaned) as ScorecardResult;

  // Clamp scores
  const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)));
  result.taskCompletionScore = clamp(result.taskCompletionScore);
  result.visualClarityScore = clamp(result.visualClarityScore);
  result.errorHandlingScore = clamp(result.errorHandlingScore);
  result.accessibilityScore = clamp(result.accessibilityScore);
  result.overallScore = clamp(result.overallScore);

  return result;
}
