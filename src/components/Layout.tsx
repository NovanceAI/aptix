import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NavigationSidebar } from "./NavigationSidebar";
import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

function HeaderContent() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="flex items-center gap-4">
      <SidebarTrigger />
      {isCollapsed ? (
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/0d951d8d-f416-40ce-a691-a58cc1c22de3.png" 
            alt="Aptix Logo" 
            className="h-8 w-8"
          />
          <span className="text-xl font-bold text-foreground">APTIX</span>
        </div>
      ) : (
        <div className="hidden md:block">
          <h2 className="font-semibold text-foreground">
            360° Performance Review Platform
          </h2>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();

  // If not authenticated, render without sidebar
  if (!user || !profile) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <NavigationSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
            <HeaderContent />
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {profile.first_name} {profile.last_name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile.first_name} {profile.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}