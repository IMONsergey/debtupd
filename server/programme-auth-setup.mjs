
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { hashPassword } from './programme-service.mjs';

const [authPath, passwordPath] = process.argv.slice(2);
if (!authPath || !passwordPath) {
  console.error('Usage: node programme-auth-setup.mjs AUTH_PATH INITIAL_PASSWORD_PATH');
  process.exit(2);
}

const initialPassword = randomBytes(26).toString('base64url');
writeFileSync(passwordPath, initialPassword + '\n', { flag: 'wx', mode: 0o600 });
try {
  writeFileSync(authPath, JSON.stringify(hashPassword(initialPassword), null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
} catch (error) {
  console.error('Authentication initialization failed:', error.code || error.name);
  process.exitCode = 1;
}
