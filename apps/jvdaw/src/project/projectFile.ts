export const PROJECT_FILE_EXTENSION = '.jvstudio.json';

export function projectFileName(projectName: string): string {
  return `${portableProjectName(projectName)}${PROJECT_FILE_EXTENSION}`;
}

export function wavFileName(projectName: string): string {
  return `${portableProjectName(projectName)}.wav`;
}

function portableProjectName(projectName: string): string {
  return projectName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'proyecto-jv-studio';
}
