// Mac side: node pocket/seal.mjs OUT.json < plaintext.json   (passphrase on the first line of fd 3 or TTY prompt).
// The passphrase is read from the file named by POCKET_PASSPHRASE_FILE (fd/pipe), never from argv or the environment.
import { readFileSync, writeFileSync } from 'node:fs';
import { seal } from './crypto.mjs';

const out = process.argv[2];
const passFile = process.env.POCKET_PASSPHRASE_FILE;
if (!out || !passFile) { console.error('usage: POCKET_PASSPHRASE_FILE=<pipe> node seal.mjs OUT.json < plain.json'); process.exit(2); }
const passphrase = readFileSync(passFile, 'utf8').replace(/\r?\n$/, '');
if (passphrase.length < 12) { console.error('passphrase must be at least 12 characters'); process.exit(2); }
const plain = readFileSync(0, 'utf8');
JSON.parse(plain);
writeFileSync(out, JSON.stringify(await seal(plain, passphrase)));
