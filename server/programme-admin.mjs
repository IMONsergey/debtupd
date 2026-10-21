import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProgrammeServer } from './programme-service.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.PROGRAMME_DATA_DIR || join(root, '.local-programme-data');
const origin = process.env.PROGRAMME_ORIGIN || 'http://127.0.0.1:54029';
const port = Number(process.env.PORT || 32029);

const server = await createProgrammeServer({
  distDir: join(root, 'dist'),
  adminDir: join(root, 'admin/programme'),
  dataDir,
  origin,
});
server.listen(port, '127.0.0.1', () => {
  console.log('programme editor listening on 127.0.0.1:' + port);
});
