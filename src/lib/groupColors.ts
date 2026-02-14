import { Group } from '@/lib/types';

export const groupColorPalette = [
  '#050816',
  '#121b36',
  '#1b2a45',
  '#0f2a2b',
  '#15192f',
  '#1b0f25',
  '#102f41',
  '#1f2933',
  '#181028',
];

export const createGroupColorMap = (groups: Group[] = []) => {
  const map = new Map<string, string>();
  groups.forEach((group, index) => {
    const color = groupColorPalette[index % groupColorPalette.length];
    map.set(group.id, color);
  });
  return map;
};

export const getGroupColorFromMap = (map: Map<string, string> | undefined, groupId?: string) => {
  if (!groupId) return groupColorPalette[0];
  return map?.get(groupId) ?? groupColorPalette[0];
};
