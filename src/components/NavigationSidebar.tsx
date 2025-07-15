import { 
  BarChart3, 
  Users, 
  Settings, 
  FileText, 
  Award,
  Target,
  Shield,
  UserCog,
  Building,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "My Reviews", url: "/reviews", icon: FileText },
  { title: "Team Reviews", url: "/team", icon: Users },
  { title: "Categories", url: "/categories", icon: Target },
  { title: "Results", url: "/results", icon: Award },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavigationSidebar() {
  const { state } = useSidebar();
  const { profile } = useAuth();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className={cn(
        "border-r border-border bg-card",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/0d951d8d-f416-40ce-a691-a58cc1c22de3.png" 
              alt="Aptix Logo" 
              className="h-8 w-8"
            />
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-foreground">APTIX</h1>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Client Admin Section */}
              {profile?.role === 'client_admin' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/areas"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          )
                        }
                      >
                        <Building className="h-4 w-4" />
                        {!isCollapsed && <span>Areas</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/periods"
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          )
                        }
                      >
                        <Clock className="h-4 w-4" />
                        {!isCollapsed && <span>Periods</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              
              {/* User Management for Client and Area Admins */}
              {(profile?.role === 'client_admin' || profile?.role === 'area_admin') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/user-management"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )
                      }
                    >
                      <UserCog className="h-4 w-4" />
                      {!isCollapsed && <span>Users</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Roles Management for Client and Area Admins */}
              {(profile?.role === 'client_admin' || profile?.role === 'area_admin') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/roles"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )
                      }
                    >
                      <UserCog className="h-4 w-4" />
                      {!isCollapsed && <span>Roles</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Super Admin Section */}
              {profile?.role === 'super_admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/super-admin"
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )
                      }
                    >
                      <Shield className="h-4 w-4" />
                      {!isCollapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}