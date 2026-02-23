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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTournament } from "@/context/TournamentContext";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronRight, Plus, Settings, Trophy, Calendar, Home, LayoutList, Shield, Grid3x3, Users, Info, Globe } from "lucide-react";
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
import { PublishDialog } from "@/components/PublishDialog";

export default function SidebarLayout() {
  const { competitions, addCompetition, currentTournament, updateTournament } = useTournament();
  const navigate = useNavigate();
  const location = useLocation();
  const [newCompName, setNewCompName] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = React.useState(false);

  const handleCreate = () => {
    if (newCompName.trim()) {
      addCompetition(newCompName);
      setNewCompName("");
      setIsDialogOpen(false);
    }
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    // Home/Dashboard - now shows Competitions for current tournament
    if (parts.length === 0) {
      const tournamentName = currentTournament?.name || 'Tournament';
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tournaments">Tournaments</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tournamentName} Competitions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // Tournaments page
    if (parts[0] === 'tournaments' && parts.length === 1) {
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Tournaments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    const items = [];
    
    // Always start with Home link if not on home
    // Actually, based on sidebar, "Competitions" seems to be the main view.
    // Let's iterate through parts to build crumbs
    
    let currentPath = '';
    
    // Handle competition routes specially to inject competition name
    if (parts[0] === 'competition' && parts[1]) {
      const compId = parts[1];
      const comp = competitions.find(c => c.id === compId);
      const tournamentName = currentTournament?.name || 'Tournament';
      
      items.push({
        label: 'Tournaments',
        path: '/tournaments'
      });
      
      items.push({
        label: tournamentName,
        path: '/'
      });

      if (comp) {
        items.push({
          label: comp.name,
          path: `/competition/${compId}/groups` // Default to groups/teams view
        });
      } else {
        items.push({
          label: 'Unknown Competition',
          path: '#'
        });
      }

      // Add remaining parts (after competition/:id)
      if (parts.length > 2) {
        const subSection = parts[2];
        // Capitalize first letter
        const label = subSection.charAt(0).toUpperCase() + subSection.slice(1);
        items.push({
          label: label,
          path: path,
          isPage: true
        });
      } else {
        // If just /competition/:id, mark the last one as page
        items[items.length - 1].isPage = true;
      }

    } else {
      // Standard routes
      parts.forEach((part, index) => {
        currentPath += `/${part}`;
        const isLast = index === parts.length - 1;
        
        // Format label: remove hyphens, capitalize
        const label = part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        items.push({
          label,
          path: currentPath,
          isPage: isLast
        });
      });
    }

    return (
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={item.path + index}>
            <BreadcrumbItem>
              {item.isPage ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    );
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/tournaments">
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
          
          {/* Publish Button - Always visible above menu items */}
          {currentTournament && (
            <div className="mt-4 px-2">
              <Button
                className="w-full"
                size="sm"
                onClick={() => setIsPublishDialogOpen(true)}
              >
                <Globe className="w-4 h-4 mr-2" />
                {currentTournament.published
                  ? `Publish v${currentTournament.published.version + 1}`
                  : "Publish"}
              </Button>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/overview"}>
                  <Link to="/overview">
                    <Info />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Officials */}
              <Collapsible asChild className="group/collapsible" defaultOpen={location.pathname.startsWith("/officials")}>
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith("/officials")} className="flex-1">
                      <Link to="/officials">
                        <Users />
                        <span>Officials</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-8 p-0 justify-center flex-shrink-0">
                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        <span className="sr-only">Toggle Officials menu</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/officials/organisers"}>
                          <Link to="/officials/organisers">
                            <span>Organisers</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/officials/referees"}>
                          <Link to="/officials/referees">
                            <span>Referees</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/officials/coordinators"}>
                          <Link to="/officials/coordinators">
                            <span>Coordinators</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Clubs */}
              <Collapsible asChild className="group/collapsible" defaultOpen={location.pathname === "/clubs/participants" || location.pathname === "/clubs/map"}>
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith("/clubs")} className="flex-1">
                      <Link to="/clubs/participants">
                        <Shield />
                        <span>Clubs</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-8 p-0 justify-center flex-shrink-0">
                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        <span className="sr-only">Toggle Clubs menu</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/clubs/participants"}>
                          <Link to="/clubs/participants">
                            <span>Participants</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/clubs/map"}>
                          <Link to="/clubs/map">
                            <span>Map</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Competitions */}
              <Collapsible 
                asChild 
                className="group/collapsible" 
                defaultOpen={location.pathname === "/" || location.pathname.startsWith("/competition/")}
              >
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild isActive={location.pathname === "/"} className="flex-1">
                      <Link to="/">
                        <LayoutList />
                        <span>Competitions ({competitions.length})</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-8 p-0 justify-center flex-shrink-0">
                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        <span className="sr-only">Toggle Competitions menu</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Competition List */}
                      <li className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Competitions
                      </li>
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton onClick={() => setIsDialogOpen(true)}>
                              <Plus className="size-4" />
                              <span>Add Competition</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
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
                      {competitions.map((comp) => (
                        <Collapsible
                          key={comp.id}
                          asChild
                          defaultOpen={location.pathname.includes(comp.id)}
                          className="group/comp-collapsible"
                        >
                          <SidebarMenuItem className="mt-1">
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubButton>
                                <CompetitionBadge
                                  code={comp.code}
                                  color={comp.color}
                                  size="sm"
                                  className="h-5 w-5 text-[9px]"
                                />
                                <span>{comp.name}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/comp-collapsible:rotate-90" />
                              </SidebarMenuSubButton>
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
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Scheduler */}
              <Collapsible asChild className="group/collapsible" defaultOpen={location.pathname.startsWith("/scheduler")}>
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith("/scheduler")} className="flex-1">
                      <Link to="/scheduler/timeline">
                        <Calendar />
                        <span>Scheduler</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-8 p-0 justify-center flex-shrink-0">
                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        <span className="sr-only">Toggle Scheduler menu</span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/scheduler/timeline"}>
                          <Link to="/scheduler/timeline">
                            <span>Timeline</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {/* Portal Target for Schedule Tools - inside Scheduler */}
                      <div id="sidebar-schedule-portal" />
                      {/* Portal Target for Schedule Competition Details - inside Scheduler */}
                      <div id="sidebar-competitions-portal" />
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Reports */}
              <Collapsible asChild className="group/collapsible" defaultOpen={location.pathname.startsWith("/reports")}>
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith("/reports")} className="flex-1">
                      <Link to="/reports/by-pitch">
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
                  </div>
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
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/reports/by-pitch"}>
                          <Link to="/reports/by-pitch">
                            <span>By Pitch</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/reports/by-team"}>
                          <Link to="/reports/by-team">
                            <span>By Team</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2 text-xs text-center text-muted-foreground">
            Pitch Perfect
          </div>
        </SidebarFooter>

        {/* Publish Dialog */}
        {currentTournament && (
          <PublishDialog
            open={isPublishDialogOpen}
            onOpenChange={setIsPublishDialogOpen}
            tournament={currentTournament}
            onPublish={(updates) => updateTournament(currentTournament.id, updates)}
          />
        )}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {getBreadcrumbs()}
        </header>
        <div className="flex-1 overflow-auto p-4 h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
