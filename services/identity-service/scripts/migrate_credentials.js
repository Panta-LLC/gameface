#!/usr/bin/env node
/**
 * Migration script for credentials stored under `user:*` keys in Redis.
 *
 * Usage:
 *   node scripts/migrate_credentials.js        # dry-run, prints what would be changed
 *   node scripts/migrate_credentials.js --apply  # actually writes hashed passwords
 */

const { createClient } = require('redis');
const bcrypt = require('bcryptjs');

async function main() {
  const apply = process.argv.includes('--apply');
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', (e) => console.error('redis error', e));

  await client.connect();

  console.log(`Migration started (apply=${apply})`);

  let cursor = '0';
  let total = 0;
  let candidates = 0;
  let migrated = 0;

  do {
    const res = await client.scan(cursor, { MATCH: 'user:*', COUNT: 200 });
    cursor = res.cursor;
    const keys = res.keys || [];
    for (const k of keys) {
      total++;
      try {
        const v = await client.get(k);
        if (!v) continue;
        let user;
        try {
          user = JSON.parse(v);
        } catch (e) {
          // not JSON, skip
          continue;
        }

        // If it already has a passwordHash, skip
        if (user.passwordHash) continue;

        // If it has a plaintext `password` field, migrate it
        if (user.password) {
          candidates++;
          const hash = await bcrypt.hash(user.password, 10);
          user.passwordHash = hash;
          delete user.password;
          if (apply) {
            await client.set(k, JSON.stringify(user));
            migrated++;
            console.log(`Migrated: ${k}`);
          } else {
            console.log(`Would migrate: ${k}`);
          }
        }
      } catch (e) {
        console.error('Error processing key', k, e);
      }
    }
  } while (cursor !== '0');

  console.log(`Scanned ${total} keys; candidates=${candidates}; migrated=${migrated}`);
  await client.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
