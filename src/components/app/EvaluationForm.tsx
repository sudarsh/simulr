"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { PROVIDER_MODELS } from "@/lib/ai/providers";

export function EvaluationForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [task, setTask] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDER_MODELS["anthropic"].models[0].id);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleProviderChange(val: string | null) {
    if (!val) return;
    setProvider(val);
    setModel(PROVIDER_MODELS[val].models[0].id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, task, provider, model }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to start evaluation");
      return;
    }

    const evaluation = await res.json();
    router.push(`/evaluations/${evaluation.id}`);
  }

  const models = PROVIDER_MODELS[provider]?.models ?? [];

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task">Task to attempt</Label>
            <Textarea
              id="task"
              placeholder="e.g. Find and purchase a blue t-shirt in size medium"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select value={provider} onValueChange={(v) => handleProviderChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => { if (v) setModel(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Starting evaluation..." : "Start Evaluation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
