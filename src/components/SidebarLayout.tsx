import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTournament } from "@/context/TournamentContext";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronRight, Plus, Settings, Trophy, Calendar, Home, LayoutList, Shield, Grid3x3 } from "lucide-react";
import { CompetitionBadge } from "@/components/CompetitionBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SidebarLayout() {
  const { competitions, addCompetition } = useTournament();
  const navigate = useNavigate();
  const location = useLocation();
  const [newCompName, setNewCompName] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCreate = () => {
    if (newCompName.trim()) {
      addCompetition(newCompName);
      setNewCompName("");
      setIsDialogOpen(false);
    }
  };

  const isSchedulePage = location.pathname === "/schedule";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Trophy className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Tournament Maker</span>
                    <span className="truncate text-xs"></span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/schedule"}>
                  <Link to="/schedule">
                    <Calendar />
                    <span>Scheduler</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/clubs"}>
                  <Link to="/clubs">
                    <Shield />
                    <span>Clubs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                  <Link to="/">
                    <LayoutList />
                    <span>Competitions ({competitions.length})</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible asChild className="group/collapsible" defaultOpen={location.pathname === "/by-pitch" || location.pathname.startsWith("/reports/")}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/by-pitch"}>
                    <Link to="/by-pitch">
                      <Grid3x3 />
                      <span>Reports</span>
                    </Link>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-8 p-0 justify-center flex-shrink-0">
                      <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      <span className="sr-only">Toggle Reports menu</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <li className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Analysis
                      </li>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/reports/play-time"}>
                          <Link to="/reports/play-time">
                            <span>Play time</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/reports/club-contributions"}>
                          <Link to="/reports/club-contributions">
                            <span>Club Contributions</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <li className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
                        Information
                      </li>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/by-pitch"}>
                          <Link to="/by-pitch">
                            <span>By Pitch</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>

          {/* Portal Target for Schedule Page Tools */}
          <div id="sidebar-schedule-portal" className="contents" />

          {/* Standard Competition List - Hidden on Schedule Page */}
          {!isSchedulePage && (
            <SidebarGroup>
              <SidebarGroupLabel>Competitions</SidebarGroupLabel>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <SidebarGroupAction title="Add Competition">
                    <Plus /> <span className="sr-only">Add Competition</span>
                  </SidebarGroupAction>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Competition</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input
                      placeholder="Competition Name"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <SidebarMenu>
                {competitions.map((comp) => (
                  <Collapsible
                    key={comp.id}
                    asChild
                    defaultOpen={location.pathname.includes(comp.id)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={comp.name}>
                          <CompetitionBadge
                            code={comp.code}
                            color={comp.color}
                            size="sm"
                            className="h-5 w-5 text-[9px]"
                          />
                          <span>{comp.name}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === `/competition/${comp.id}/groups`}
                            >
                              <Link to={`/competition/${comp.id}/groups`}>
                                <span>Teams</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === `/competition/${comp.id}/fixtures`}
                            >
                              <Link to={`/competition/${comp.id}/fixtures`}>
                                <span>Fixtures</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === `/competition/${comp.id}/settings`}
                            >
                              <Link to={`/competition/${comp.id}/settings`}>
                                <span>Settings</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2 text-xs text-center text-muted-foreground">
            Pitch Perfect
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumbs can go here */}
        </header>
        <div className="flex-1 overflow-auto p-4 h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}