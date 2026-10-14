import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Hostinger peut placer le fichier .env à la racine du projet, dans le dossier
 * de sortie (dist) ou dans le dossier de travail. On cherche à tous ces endroits.
 */
function candidates(): string[] {
  const dirs = new Set<string>();
  let d = __dirname;
  for (let i = 0; i < 5; i++) {
    dirs.add(d);
    d = dirname(d);
  }
  dirs.add(process.cwd());
  dirs.add(resolve(process.cwd(), '..'));
  const files: string[] = [];
  for (const dir of dirs) {
    files.push(join(dir, '.env'), join(dir, '.env.production'), join(dir, '.env.local'));
  }
  return [...new Set(files)];
}

export const ENV_FILES_FOUND: string[] = candidates().filter((f) => existsSync(f));
