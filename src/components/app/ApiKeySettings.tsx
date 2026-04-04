"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PROVIDER_MODELS } from "@/lib/ai/providers";

interface ConfiguredKey {
  baseUrl: string | null;
  updatedAt: Date;
}

interface Props {
  configured: Record<string, ConfiguredKey>;
}

function ProviderCard({
  providerKey,
  label,
  initialConfigured,
  isOllama,
}: {
  providerKey: string;
  label: string;
  initialConfigured: ConfiguredKey | undefined;
  isOllama: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initialConfigured?.baseUrl ?? "http://localhost:11434");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(!!initialConfigured);

  async function handleSave() {
    setError("");
    setSuccess(false);
    setSaving(true);

    const res = await fetch("/api/user/api-keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerKey,
        apiKey: isOllama ? "ollama-no-key" : apiKey,
        baseUrl: isOllama ? baseUrl : undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }

    setConfigured(true);
    setSuccess(true);
    setApiKey("");
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleRemove() {
    setRemoving(true);
    await fetch(`/api/user/api-keys?provider=${providerKey}`, { method: "DELETE" });
    setRemoving(false);
    setConfigured(false);
    setApiKey("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          <Badge variant={configured ? "default" : "outline"}>
            {configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
        {isOllama && (
          <CardDescription>
            No API key required. Make sure Ollama is running locally.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>API key saved successfully.</AlertDescription>
          </Alert>
        )}
        {!isOllama && (
          <div className="space-y-1.5">
            <Label htmlFor={`key-${providerKey}`}>API Key</Label>
            <Input
              id={`key-${providerKey}`}
              type="password"
              placeholder={configured ? "••••••••••••••••" : "Enter your API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}
        {isOllama && (
          <div className="space-y-1.5">
            <Label htmlFor="ollama-url">Base URL</Label>
            <Input
              id="ollama-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || (!isOllama && !apiKey)}
            size="sm"
          >
            {saving ? "Saving..." : configured ? "Update" : "Save"}
          </Button>
          {configured && (
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing}>
              {removing ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiKeySettings({ configured }: Props) {
  return (
    <div className="space-y-4">
      {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
        <ProviderCard
          key={key}
          providerKey={key}
          label={val.label}
          initialConfigured={configured[key]}
          isOllama={key === "ollama"}
        />
      ))}
    </div>
  );
}
