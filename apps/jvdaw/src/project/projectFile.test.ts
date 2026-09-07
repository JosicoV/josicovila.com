import { describe, expect, it } from 'vitest';

import { projectFileName } from './projectFile';

describe('project file name', () => {
  it('creates a portable, recognizable download name', () => {
    expect(projectFileName('Mi Canción Nº 1')).toBe('mi-cancion-n-1.jvstudio.json');
    expect(projectFileName('   ')).toBe('proyecto-jv-studio.jvstudio.json');
  });
});
