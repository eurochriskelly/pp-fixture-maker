import React from 'react';
import { useTournament } from '@/context/TournamentContext';
import { CompetitionBadge } from '@/components/CompetitionBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CompetitionHeaderProps {
  competitionId: string;
}

export const CompetitionHeader: React.FC<CompetitionHeaderProps> = ({ competitionId }) => {
  const { competitions, updateCompetition } = useTournament();
  const competition = competitions.find(c => c.id === competitionId);

  if (!competition) return null;

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative group rounded-full hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all">
              <CompetitionBadge
                code={competition.code || competition.name.substring(0, 2).toUpperCase()}
                color={competition.color}
                size="lg"
                className="w-12 h-12 text-lg shadow-sm"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-medium leading-none">Rename Competition</h4>
                <p className="text-sm text-muted-foreground">Update the competition name shown on this page.</p>
                <Input
                  value={competition.name}
                  onChange={(e) => updateCompetition(competition.id, { name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium leading-none">Edit Code</h4>
                <p className="text-sm text-muted-foreground">Customize the badge code (up to 3 letters).</p>
                <Input
                  value={competition.code}
                  maxLength={3}
                  onChange={(e) => updateCompetition(competition.id, { code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
