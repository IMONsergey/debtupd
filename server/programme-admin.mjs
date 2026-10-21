import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';
import { createProgrammeServer } from './programme-service.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.PROGRAMME_DATA_DIR || join(root, '.local-programme-data');
const origin = process.env.PROGRAMME_ORIGIN || 'http://127.0.0.1:54029';
const port = Number(process.env.PORT || 32029);
const allowedOrigins = (process.env.PROGRAMME_ALLOWED_ORIGINS || origin)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// Resolve /current symlink first: Node's path.join would normalize /current/../src
// to the wrong directory before the operating system follows the symlink.
const distDir = await realpath(process.env.PROGRAMME_DIST_DIR || join(root, 'dist'));
const adminDir = process.env.PROGRAMME_ADMIN_DIR || join(distDir, '..', 'admin/programme');
const server = await createProgrammeServer({
  distDir,
  adminDir,
  dataDir,
  origin,
  allowedOrigins,
});
server.listen(port, '127.0.0.1', () => {
  console.log('programme editor listening on 127.0.0.1:' + port);
});
