import { config } from 'dotenv';
import { resolve } from 'path';
import { randomBytes } from 'node:crypto';

config({ path: resolve(__dirname, '../.env') });

// Solo fixtures del runner Jest: no son defaults de la aplicación ni claves de despliegue.
process.env.HUMWORLD_API_KEY_READ ??= randomBytes(32).toString('hex');
process.env.HUMWORLD_API_KEY_WRITE ??= randomBytes(32).toString('hex');
