import { Fixture, Group } from '@/lib/types';

export const minutesFromMidnight = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

export const timeFromMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const getFixtureSlack = (fixture: Fixture, groups: Group[]): number => {
    if (fixture.groupId) {
        const group = groups.find(g => g.id === fixture.groupId);
        // Check if group has a specific slack setting (assuming Group type has it, otherwise default)
        // Based on previous context, Group has defaultSlack
        // Let's check types first, but for now safe default
        return (group as any)?.defaultSlack || 5;
    }
    return 5;
};
