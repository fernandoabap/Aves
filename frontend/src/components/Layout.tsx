import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bird, Home, History, Image, BarChart3, Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth.context";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: History, label: "Histórico", path: "/history" },
    { icon: Image, label: "Galeria", path: "/gallery" },
    { icon: BarChart3, label: "Estatísticas", path: "/stats" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-sidebar shadow-soft">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Bird className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-sidebar-foreground">BirdWatch</h1>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-8 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">Sistema de Monitoramento de Aves</h2>
          
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Bem-vindo, <span className="font-bold text-foreground">{user?.name}</span>
            </span>
            <button className="relative rounded-lg p-2 hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent"></span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;