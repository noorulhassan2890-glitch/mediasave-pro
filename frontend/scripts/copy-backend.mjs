// Vendors the FastAPI app into the Netlify function bundle.
//
// Netlify clones only the site base directory (frontend/), so backend/app is not
// visible during a cloud build. The vendored copy at netlify/functions/_backend
// is therefore committed to git as well, and this script keeps it in sync with
// backend/app whenever it runs locally.
//
// IMPORTANT: after editing anything in backend/app run `npm run prebuild`
// (or a normal `npm run build`) and commit the refreshed _backend folder.

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'backend', 'app');
const dest = join(here, '..', 'netlify', 'functions', '_backend');

if (!existsSync(src)) {
  console.log('[copy-backend] backend/app not reachable, keeping committed _backend');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, {
  recursive: true,
  filter: (path) => !path.includes('__pycache__') && !path.endsWith('.pyc'),
});
console.log('[copy-backend] backend/app -> netlify/functions/_backend');