import { barsToBeats, beatsPerBar } from './timing';
import type { Project } from './types';

export const PROJECT_GROWTH_BARS = 4;
export const MAX_PROJECT_BARS = 1_024;

export function projectContentEndBeat(project: Project): number {
  return project.tracks.reduce(
    (projectEnd, track) => track.clips.reduce(
      (trackEnd, clip) => Math.max(trackEnd, clip.startBeat + clip.lengthBeats),
      projectEnd,
    ),
    0,
  );
}

export function minimumProjectLengthBars(project: Project): number {
  return Math.max(1, Math.ceil(projectContentEndBeat(project) / beatsPerBar(project.timeSignature)));
}

export function autoGrowProjectLength(project: Project, requiredEndBeat = projectContentEndBeat(project)): number {
  const currentEndBeat = barsToBeats(project.lengthBars, project.timeSignature);
  if (requiredEndBeat < currentEndBeat || project.lengthBars >= MAX_PROJECT_BARS) return project.lengthBars;

  let nextLength = project.lengthBars;
  while (nextLength < MAX_PROJECT_BARS && requiredEndBeat >= barsToBeats(nextLength, project.timeSignature)) {
    nextLength = Math.min(MAX_PROJECT_BARS, nextLength + PROJECT_GROWTH_BARS);
  }
  return nextLength;
}
