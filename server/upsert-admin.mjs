import 'dotenv/config.js';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const email = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');

if (!email || !password) {
  console.error('Usage: node server/upsert-admin.mjs <email> <password>');
  process.exit(1);
}

const uri = String(process.env.MONGODB_URI || '').trim();
const dbName = String(process.env.MONGODB_DB_NAME || 'hunchmate').trim() || 'hunchmate';

if (!uri) {
  console.error('MONGODB_URI is missing in environment');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');
  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  const result = await users.updateOne(
    { email },
    {
      $set: {
        email,
        role: 'admin',
        provider: 'local',
        authMethods: ['password'],
        password: hashedPassword,
        status: 'active',
        updatedAt: now,
        name: 'Admin',
      },
      $setOnInsert: {
        createdAt: now,
        verified: false,
        termsAcceptedAt: now,
        profile: {},
      },
    },
    { upsert: true }
  );

  console.log(
    'admin-upsert:ok',
    JSON.stringify({
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      email,
    })
  );
} catch (error) {
  console.error('admin-upsert:error');
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  try {
    await client.close();
  } catch {
    // no-op
  }
}
