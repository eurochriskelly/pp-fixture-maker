import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
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
              <Route path="/schedule" element={<Schedule />} />
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
