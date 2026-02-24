import React from 'react';
import { Fixture, Competition, Team } from '@/lib/types';
import { TeamEditDialog } from '@/components/TeamEditDialog';
import { CrestImage } from '@/components/CrestImage';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGroupColorFromMap, createGroupColorMap } from '@/lib/groupColors';

// Helper functions
export const formatKnockoutCode = (fixture: Fixture) => {
  const { matchId = '', description = '', stage } = fixture;
  const upperMatch = matchId.toUpperCase();
  const stageLower = stage.toLowerCase();

  const digitsFrom = (value: string) => {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  };

  if (upperMatch.startsWith('QF')) {
    const num = digitsFrom(upperMatch);
    if (num && num >= 10) return `Q${num}`;
    return `QF${num || ''}`.slice(0, 3);
  }
  if (upperMatch.startsWith('SF')) return upperMatch.slice(0, 3);
  if (/^R16/.test(upperMatch)) {
    const num = digitsFrom(upperMatch) || 1;
    return `E${String(num).padStart(2, '0')}`; // E01 ... E16
  }
  if (/^E\d{1,2}/.test(upperMatch)) {
    const num = digitsFrom(upperMatch) || 1;
    return `E${String(num).padStart(2, '0')}`;
  }
  if (upperMatch === 'FINAL') return 'FIN';

  if (stageLower.includes('final')) return 'FIN';
  if (stageLower.includes('semi')) {
    const num = digitsFrom(upperMatch) || digitsFrom(description) || 1;
    return `SF${num}`;
  }
  if (stageLower.includes('quarter')) {
    const num = digitsFrom(upperMatch) || digitsFrom(description) || 1;
    return `QF${num}`;
  }
  if (stageLower.includes('round of 16') || stageLower.includes('round of sixteen')) {
    const num = digitsFrom(upperMatch) || digitsFrom(description) || 1;
    return `E${String(num).padStart(2, '0')}`;
  }
  if (stageLower.includes('3rd')) return '3/4';
  if (stageLower.includes('4th')) return '4/5';
  if (stageLower.includes('5th')) return '5/6';

  return (matchId || stage).substring(0, 3).toUpperCase();
};

export const toThreeChars = (code: string) => {
  const compact = code.replace(/\s+/g, '');
  if (compact.length >= 3) return compact.slice(0, 3).toUpperCase();
  if (compact.length === 2) return `${compact}0`.toUpperCase();
  if (compact.length === 1) return `${compact}00`.toUpperCase();
  return '---';
};

// Components
export const TeamBadge: React.FC<{ team?: Team }> = ({ team }) => {
  const isUnknown = !team;
  const initials = team
    ? (team.initials || team.name.substring(0, 2).toUpperCase())
    : '?';
  const bg = isUnknown ? '#ffffff' : team!.primaryColor || '#0f172a';
  const fg = isUnknown ? '#dc2626' : team!.secondaryColor || '#ffffff';

  return (
    <div className="rounded-md bg-gradient-to-br from-gray-100 to-gray-300 p-[3px] flex items-center justify-center shadow-sm shrink-0">
      <div className="rounded-[4px] flex items-center justify-center overflow-hidden">
        <div
          className="w-[44px] h-[44px] rounded-[3px] flex items-center justify-center text-[12px] font-black uppercase leading-none overflow-hidden relative"
          style={{ backgroundColor: bg, color: fg }}
        >
          {team?.crest ? (
             <CrestImage 
               src={team.crest} 
               alt={team.name} 
               className="w-full h-full object-contain p-0.5"
               fallback={initials}
             />
          ) : (
             initials
          )}
        </div>
      </div>
    </div>
  );
};

export const TeamDisplay: React.FC<{ teamId: string; side: 'home' | 'away'; competition: Competition; allowEdit?: boolean }> = ({ teamId, side, competition, allowEdit }) => {
  const team = competition.teams.find(t => t.id === teamId);
  const name = (team?.name || teamId).toUpperCase();

  const content = (
    <div className={cn(
      'flex items-center gap-2 text-sm font-semibold uppercase',
      side === 'home' ? 'justify-end text-right' : 'justify-start text-left'
    )}>
      {side === 'away' && <TeamBadge team={team} />}
      <span className="truncate max-w-[160px]">{name}</span>
      {side === 'home' && <TeamBadge team={team} />}
    </div>
  );

  if (allowEdit && team) {
    const paddingClass = side === 'home' ? 'pr-6' : 'pl-6';
    const iconPosition = side === 'home' ? 'right-0' : 'left-0';

    return (
      <TeamEditDialog competitionId={competition.id} team={team}>
        <div className={cn('relative group cursor-pointer hover:bg-muted/50 rounded px-1', paddingClass)}>
          {content}
          <Pencil
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100',
              iconPosition
            )}
          />
        </div>
      </TeamEditDialog>
    );
  }

  return content;
};

export const StagePill: React.FC<{ fixture: Fixture; competition: Competition }> = ({ fixture, competition }) => {
  const groupIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    (competition.groups || []).forEach((group, index) => {
      map.set(group.id, index + 1);
    });
    return map;
  }, [competition.groups]);

  const groupColorMap = React.useMemo(
    () => createGroupColorMap(competition.groups || []),
    [competition.groups]
  );

  const getGroupColor = (groupId?: string) => getGroupColorFromMap(groupColorMap, groupId);

  const formatStageCode = (fixture: Fixture) => {
    if (fixture.stage === 'Group') {
      const index = fixture.groupId ? groupIndexMap.get(fixture.groupId) : undefined;
      if (index) {
        return index >= 10 ? `G${index}` : `GP${index}`;
      }
      return 'GP1';
    }
    return formatKnockoutCode(fixture);
  };

  const code = toThreeChars(formatStageCode(fixture));
  const isGroup = fixture.stage === 'Group';
  const backgroundColor = isGroup ? getGroupColor(fixture.groupId) : '#0f172a';

  return (
    <div className="flex flex-col items-center gap-1">
      {fixture.matchId && (
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
          {fixture.matchId}
        </div>
      )}
      <div
        className="border border-white/10 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wide min-w-[56px] text-center font-mono text-white"
        style={{ backgroundColor }}
      >
        {code}
      </div>
    </div>
  );
};

export const FixtureItem: React.FC<{ fixture: Fixture; competition: Competition; onDelete: (id: string) => void; includePitch?: boolean; allowTeamEdit?: boolean }> = ({ fixture, competition, onDelete, includePitch = true, allowTeamEdit = false }) => {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-sm"
    >
      <div className="flex-1 grid grid-cols-[minmax(0,1fr)_minmax(96px,auto)_minmax(0,1fr)] items-center gap-3 justify-items-center w-full">
        <div className="flex justify-end w-full justify-self-end">
          <TeamDisplay teamId={fixture.homeTeamId} side="home" competition={competition} allowEdit={allowTeamEdit} />
        </div>
        <div className="flex justify-center w-full justify-self-center">
          <StagePill fixture={fixture} competition={competition} />
        </div>
        <div className="flex justify-start w-full justify-self-start">
          <TeamDisplay teamId={fixture.awayTeamId} side="away" competition={competition} allowEdit={allowTeamEdit} />
        </div>
      </div>

      {includePitch && (
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground min-w-[82px] text-center">
          {fixture.pitchId ? (
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-1 font-semibold">
              Assigned
            </span>
          ) : (
            <span className="italic text-xs">Unassigned</span>
          )}
        </div>
      )}

      <Button variant="ghost" size="icon" onClick={() => onDelete(fixture.id)}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};
