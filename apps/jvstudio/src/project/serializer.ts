import { PROJECT_VERSION, type Project } from './types';
import { ProjectValidationError, validateProject } from './validation';

export const MAX_PROJECT_FILE_BYTES = 5 * 1024 * 1024;

export function serializeProject(project: Project): string {
  validateProject(project);
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(serialized: string): Project {
  if (new TextEncoder().encode(serialized).byteLength > MAX_PROJECT_FILE_BYTES) {
    throw new ProjectValidationError('exceeds the 5 MB import limit', 'project');
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized);
  } catch {
    throw new ProjectValidationError('contains invalid JSON', 'project');
  }

  const project = migrateProject(candidate);
  validateProject(project);
  return project;
}

function migrateProject(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return structuredClone(candidate);
  const project = structuredClone(candidate) as Record<string, unknown>;
  if (project.version === 1) {
    project.version = PROJECT_VERSION;
    project.master = { volume: 0.9 };
  }
  return project;
}
