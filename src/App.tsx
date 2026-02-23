import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Tournaments from "./pages/Tournaments";
import Schedule from "./pages/Schedule";
import Clubs from "./pages/Clubs";
import ClubsMap from "./pages/ClubsMap";
import ByPitch from "./pages/ByPitch";
import ByTeam from "./pages/ByTeam";
import PlayTime from "./pages/PlayTime";
import ClubContributions from "./pages/ClubContributions";
import Officials from "./pages/Officials";
import NotFound from "./pages/NotFound";
import Overview from "./pages/Overview";
import { TournamentProvider } from "@/context/TournamentContext";
import SidebarLayout from "./components/SidebarLayout";
import CompetitionGroups from "./pages/competition/Groups";
import CompetitionFixtures from "./pages/competition/Fixtures";
import CompetitionSettings from "./pages/competition/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TournamentProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<SidebarLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/scheduler" element={<Navigate to="/scheduler/timeline" replace />} />
              <Route path="/scheduler/timeline" element={<Schedule />} />
              <Route path="/clubs" element={<Navigate to="/clubs/participants" replace />} />
              <Route path="/clubs/participants" element={<Clubs />} />
              <Route path="/clubs/map" element={<ClubsMap />} />
              <Route path="/officials" element={<Navigate to="/officials/organisers" replace />} />
              <Route path="/officials/organisers" element={<Officials />} />
              <Route path="/officials/referees" element={<Officials />} />
              <Route path="/officials/coordinators" element={<Officials />} />
              <Route path="/reports/by-pitch" element={<ByPitch />} />
              <Route path="/reports/by-team" element={<ByTeam />} />
              <Route path="/reports/play-time" element={<PlayTime />} />
              <Route path="/reports/club-contributions" element={<ClubContributions />} />
              <Route path="/competition/:id" element={<Navigate to="groups" replace />} />
              <Route path="/competition/:id/groups" element={<CompetitionGroups />} />
              <Route path="/competition/:id/fixtures" element={<CompetitionFixtures />} />
              <Route path="/competition/:id/fixtures/unassigned" element={<CompetitionFixtures />} />
              <Route path="/competition/:id/settings" element={<CompetitionSettings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TournamentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
