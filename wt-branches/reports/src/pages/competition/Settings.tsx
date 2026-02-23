import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '@/context/TournamentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CompetitionHeader } from './CompetitionHeader';
import { Trash2 } from 'lucide-react';

const CompetitionSettings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    competitions,
    deleteCompetition,
  } = useTournament();

  const competition = competitions.find(c => c.id === id);

  if (!competition) {
    return <div>Competition not found</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <CompetitionHeader competitionId={competition.id} />
      
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for this competition.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => {
            if (confirm('Delete this competition?')) {
              deleteCompetition(competition.id);
              navigate('/');
            }
          }}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Competition
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitionSettings;
