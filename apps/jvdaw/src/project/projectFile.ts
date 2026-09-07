export const PROJECT_FILE_EXTENSION = '.jvstudio.json';

export function projectFileName(projectName: string): string {
  const base = projectName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'proyecto-jv-studio'}${PROJECT_FILE_EXTENSION}`;
}
