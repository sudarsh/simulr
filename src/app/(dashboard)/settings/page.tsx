import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiKeySettings } from "@/components/app/ApiKeySettings";

export default async function SettingsPage() {
  const session = await auth();
  const configuredKeys = session?.user?.id
    ? await prisma.userApiKey.findMany({
        where: { userId: session.user.id },
        select: { provider: true, baseUrl: true, updatedAt: true },
      })
    : [];

  const configuredMap = Object.fromEntries(
    configuredKeys.map((k) => [k.provider, { baseUrl: k.baseUrl, updatedAt: k.updatedAt }])
  );

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure your AI provider API keys. Keys are encrypted and stored securely.
        </p>
      </div>
      <ApiKeySettings configured={configuredMap} />
    </div>
  );
}
