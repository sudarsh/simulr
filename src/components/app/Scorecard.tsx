"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  return "text-red-600";
}

function ScoreDimension({
  label,
  score,
  notes,
}: {
  label: string;
  score: number;
  notes: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>
          {score}
          <span className="text-sm font-normal text-muted-foreground">/10</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{notes}</p>
    </div>
  );
}

export function Scorecard({ result }: { result: ScorecardResult }) {
  return (
    <div className="space-y-4">
      {/* Overall score */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>UX Scorecard</CardTitle>
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-lg font-normal text-muted-foreground">/10</span>
              </div>
              <Badge
                variant={result.overallScore >= 7 ? "default" : "destructive"}
                className="mt-1"
              >
                Overall
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Dimension scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ScoreDimension
            label="Task Completion & Flow"
            score={result.taskCompletionScore}
            notes={result.taskCompletionNotes}
          />
          <Separator />
          <ScoreDimension
            label="Visual Clarity"
            score={result.visualClarityScore}
            notes={result.visualClarityNotes}
          />
          <Separator />
          <ScoreDimension
            label="Error Handling"
            score={result.errorHandlingScore}
            notes={result.errorHandlingNotes}
          />
          <Separator />
          <ScoreDimension
            label="Accessibility"
            score={result.accessibilityScore}
            notes={result.accessibilityNotes}
          />
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
