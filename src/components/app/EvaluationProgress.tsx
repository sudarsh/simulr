"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Scorecard } from "@/components/app/Scorecard";
import Image from "next/image";

interface Step {
  id: string;
  stepNumber: number;
  action: string;
  actionDetail: string | null;
  observation: string | null;
  screenshotPath: string | null;
}

interface Result {
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

export interface Evaluation {
  id: string;
  url: string;
  task: string;
  provider: string;
  model: string;
  status: string;
  errorMsg: string | null;
  createdAt: string;
  steps: Step[];
  result: Result | null;
}

function statusColor(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export function EvaluationProgress({ initialData }: { initialData: Evaluation }) {
  const [data, setData] = useState<Evaluation>(initialData);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (data.status === "queued" || data.status === "running") {
      intervalRef.current = setInterval(async () => {
        const res = await fetch(`/api/evaluations/${data.id}`);
        if (res.ok) {
          const updated = await res.json();
          setData(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            clearInterval(intervalRef.current!);
          }
        }
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data.id, data.status]);

  const isLive = data.status === "queued" || data.status === "running";
  const progress = data.status === "completed" ? 100 : Math.min((data.steps.length / 25) * 100, 90);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold truncate">{data.url}</h2>
          <p className="text-muted-foreground mt-1">{data.task}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.provider} · {data.model}
          </p>
        </div>
        <Badge variant={statusColor(data.status)} className="shrink-0 mt-1">
          {data.status}
        </Badge>
      </div>

      {/* Progress bar */}
      {isLive && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {data.steps.length} of up to 25</span>
            <span>Evaluating...</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Error */}
      {data.status === "failed" && data.errorMsg && (
        <Card>
          <CardContent className="pt-4 text-sm text-destructive">
            {data.errorMsg}
          </CardContent>
        </Card>
      )}

      {/* Scorecard */}
      {data.result && <Scorecard result={data.result} />}

      {/* Steps */}
      {data.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Browser Session Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.steps.map((step, i) => (
              <div key={step.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex gap-4">
                  {step.screenshotPath && (
                    <div className="shrink-0">
                      <Image
                        src={step.screenshotPath}
                        alt={`Step ${step.stepNumber}`}
                        width={200}
                        height={120}
                        className="rounded border object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        Step {step.stepNumber}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {step.action}
                      </Badge>
                      {step.actionDetail && (
                        <span className="text-xs text-muted-foreground truncate">
                          {step.actionDetail}
                        </span>
                      )}
                    </div>
                    {step.observation && (
                      <p className="text-sm text-muted-foreground">{step.observation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />
                Agent is working...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.status === "queued" && data.steps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground animate-pulse">
            Waiting for worker to pick up job...
          </CardContent>
        </Card>
      )}
    </div>
  );
}
