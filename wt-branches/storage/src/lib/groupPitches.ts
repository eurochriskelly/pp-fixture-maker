import { Group } from '@/lib/types';

export const getGroupPitchIds = (group?: Group): string[] => {
  if (!group) return [];

  const configuredPitchIds = Array.isArray(group.pitchIds)
    ? group.pitchIds.filter(
        (pitchId): pitchId is string =>
          typeof pitchId === 'string' && pitchId.trim().length > 0
      )
    : [];

  const fallbackPitchIds =
    typeof group.primaryPitchId === 'string' && group.primaryPitchId.trim().length > 0
      ? [group.primaryPitchId]
      : [];

  const source = configuredPitchIds.length > 0 ? configuredPitchIds : fallbackPitchIds;
  return Array.from(new Set(source));
};
