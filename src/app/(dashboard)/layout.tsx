import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/app/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
        <div className="p-4">
          <h1 className="text-xl font-bold tracking-tight">Simulr</h1>
          <p className="text-xs text-muted-foreground mt-0.5">UX Evaluator</p>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              New Evaluation
            </Button>
          </Link>
          <Link href="/evaluations">
            <Button variant="ghost" className="w-full justify-start">
              History
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start">
              Settings
            </Button>
          </Link>
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground truncate px-2">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
