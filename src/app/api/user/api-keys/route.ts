import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

const upsertSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "ollama"]),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { provider: true, baseUrl: true, updatedAt: true },
  });

  // Return masked keys (just presence + metadata)
  return NextResponse.json(
    keys.map((k) => ({ provider: k.provider, baseUrl: k.baseUrl, updatedAt: k.updatedAt, configured: true }))
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { provider, apiKey, baseUrl } = parsed.data;
  const encryptedKey = encrypt(apiKey);

  await prisma.userApiKey.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey,
      baseUrl: baseUrl || null,
    },
    update: {
      encryptedKey,
      baseUrl: baseUrl || null,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  await prisma.userApiKey.deleteMany({
    where: { userId: session.user.id, provider },
  });

  return NextResponse.json({ success: true });
}

// Internal utility for the worker (not an HTTP route)
export async function getDecryptedKey(userId: string, provider: string) {
  const record = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record) return null;
  return { apiKey: decrypt(record.encryptedKey), baseUrl: record.baseUrl };
}
