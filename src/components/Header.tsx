import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold">Evolução</span>
        </Link>
        {user && (
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-foreground" }}
            >
              Painel
            </Link>
            <Link
              to="/pacientes"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-foreground" }}
            >
              Pacientes
            </Link>
            <Link
              to="/configuracoes"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-foreground" }}
            >
              Configurações
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await signOut();
                nav({ to: "/login" });
              }}
              className="ml-2 gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
