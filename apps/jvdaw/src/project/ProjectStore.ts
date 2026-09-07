import { createClip, createNote, createProject, createTrack, defaultIdFactory, type IdFactory } from './factories';
import { autoGrowProjectLength } from './duration';
import { deserializeProject, serializeProject } from './serializer';
import type { InstrumentTrack, MidiClip, MidiNote, Project } from './types';
import { validateProject } from './validation';

export type ProjectChangeType =
  | 'project:create'
  | 'project:load'
  | 'project:update'
  | 'track:add'
  | 'track:remove'
  | 'track:update'
  | 'clip:add'
  | 'clip:move'
  | 'clip:duplicate'
  | 'clip:remove'
  | 'note:add'
  | 'note:update'
  | 'note:remove';

export interface ProjectChange {
  type: ProjectChangeType;
  project: Project;
}

type Listener = (change: ProjectChange) => void;
type TrackPatch = Partial<Omit<InstrumentTrack, 'id' | 'type' | 'clips'>>;
type NotePatch = Partial<Omit<MidiNote, 'id'>>;

export class ProjectStore {
  private project: Project;
  private readonly listeners = new Set<Listener>();

  constructor(
    initialProject: Project = createProject(),
    private readonly createId: IdFactory = defaultIdFactory,
  ) {
    validateProject(initialProject);
    this.project = structuredClone(initialProject);
  }

  getSnapshot(): Project {
    return structuredClone(this.project);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createProject(values: Partial<Omit<Project, 'version' | 'tracks'>> = {}): Project {
    const project = createProject(values, this.createId);
    this.replace(project, 'project:create');
    return this.getSnapshot();
  }

  loadProject(serialized: string): Project {
    const project = deserializeProject(serialized);
    this.replace(project, 'project:load');
    return this.getSnapshot();
  }

  saveProject(): string {
    return serializeProject(this.project);
  }

  updateProject(patch: Partial<Pick<Project, 'name' | 'bpm' | 'timeSignature' | 'lengthBars'>>): void {
    this.mutate('project:update', (project) => Object.assign(project, patch));
  }

  addTrack(values: Partial<Omit<InstrumentTrack, 'id' | 'type' | 'clips'>> = {}): InstrumentTrack {
    const track = createTrack(values, this.createId);
    this.mutate('track:add', (project) => project.tracks.push(track));
    return structuredClone(track);
  }

  removeTrack(trackId: string): void {
    this.mutate('track:remove', (project) => {
      const index = findIndex(project.tracks, trackId, 'Track');
      project.tracks.splice(index, 1);
    });
  }

  updateTrack(trackId: string, patch: TrackPatch): void {
    this.mutate('track:update', (project) => Object.assign(findTrack(project, trackId), patch));
  }

  addClip(trackId: string, values: Partial<Omit<MidiClip, 'id' | 'notes'>> = {}): MidiClip {
    const clip = createClip(values, this.createId);
    this.mutate('clip:add', (project) => {
      findTrack(project, trackId).clips.push(clip);
      project.lengthBars = autoGrowProjectLength(project, clip.startBeat + clip.lengthBeats);
    });
    return structuredClone(clip);
  }

  moveClip(trackId: string, clipId: string, startBeat: number): void {
    this.mutate('clip:move', (project) => {
      const clip = findClip(findTrack(project, trackId), clipId);
      clip.startBeat = startBeat;
      project.lengthBars = autoGrowProjectLength(project, clip.startBeat + clip.lengthBeats);
    });
  }

  duplicateClip(trackId: string, clipId: string, startBeat?: number): MidiClip {
    const source = findClip(findTrack(this.project, trackId), clipId);
    const duplicate = createClip(
      {
        ...structuredClone(source),
        id: this.createId('clip'),
        name: `${source.name.slice(0, 115)} Copy`,
        startBeat: startBeat ?? source.startBeat + source.lengthBeats,
        notes: source.notes.map((note) => createNote({ ...structuredClone(note), id: this.createId('note') }, this.createId)),
      },
      this.createId,
    );
    this.mutate('clip:duplicate', (project) => {
      findTrack(project, trackId).clips.push(duplicate);
      project.lengthBars = autoGrowProjectLength(project, duplicate.startBeat + duplicate.lengthBeats);
    });
    return structuredClone(duplicate);
  }

  removeClip(trackId: string, clipId: string): void {
    this.mutate('clip:remove', (project) => {
      const clips = findTrack(project, trackId).clips;
      clips.splice(findIndex(clips, clipId, 'Clip'), 1);
    });
  }

  addNote(trackId: string, clipId: string, values: Partial<Omit<MidiNote, 'id'>> = {}): MidiNote {
    const note = createNote(values, this.createId);
    this.mutate('note:add', (project) => findClip(findTrack(project, trackId), clipId).notes.push(note));
    return structuredClone(note);
  }

  updateNote(trackId: string, clipId: string, noteId: string, patch: NotePatch): void {
    this.mutate('note:update', (project) => {
      Object.assign(findNote(findClip(findTrack(project, trackId), clipId), noteId), patch);
    });
  }

  removeNote(trackId: string, clipId: string, noteId: string): void {
    this.mutate('note:remove', (project) => {
      const notes = findClip(findTrack(project, trackId), clipId).notes;
      notes.splice(findIndex(notes, noteId, 'Note'), 1);
    });
  }

  private mutate(type: ProjectChangeType, recipe: (draft: Project) => void): void {
    const draft = structuredClone(this.project);
    recipe(draft);
    validateProject(draft);
    this.replace(draft, type);
  }

  private replace(project: Project, type: ProjectChangeType): void {
    validateProject(project);
    this.project = structuredClone(project);
    const change = { type, project: this.getSnapshot() };
    this.listeners.forEach((listener) => listener(change));
  }
}

function findTrack(project: Project, id: string): InstrumentTrack {
  return project.tracks[findIndex(project.tracks, id, 'Track')];
}

function findClip(track: InstrumentTrack, id: string): MidiClip {
  return track.clips[findIndex(track.clips, id, 'Clip')];
}

function findNote(clip: MidiClip, id: string): MidiNote {
  return clip.notes[findIndex(clip.notes, id, 'Note')];
}

function findIndex(items: Array<{ id: string }>, id: string, label: string): number {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new RangeError(`${label} "${id}" was not found.`);
  return index;
}
