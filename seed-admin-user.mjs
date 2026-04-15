import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI is missing');
}

const email = 'admin@hunchmate.com';
const name = 'admin';
const password = process.env.ADMIN_SEED_PASSWORD;

if (!password) {
  throw new Error('ADMIN_SEED_PASSWORD is missing');
}

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });

try {
  await client.connect();
  const db = client.db('hunchmate');
  const users = db.collection('users');

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  const update = {
    $set: {
      name,
      role: 'admin',
      status: 'active',
      provider: 'local',
      authMethods: ['password'],
      password: hashedPassword,
      emailVerified: true,
      avatar: '',
      avatarBackdrop: '',
      bio: '',
      institution: '',
      organizationName: '',
      location: '',
      headline: '',
      website: '',
      skills: [],
      socials: { linkedin: '', github: '', instagram: '' },
      profile: {
        avatar: '',
        avatarBackdrop: '',
        bio: '',
        institution: '',
        organizationName: '',
        location: '',
        headline: '',
        website: '',
        skills: [],
        socials: { linkedin: '', github: '', instagram: '' },
        participant: { institution: '' },
        host: { organizationName: '', website: '', location: '' },
      },
      verified: true,
      updatedAt: now,
    },
    $setOnInsert: {
      email,
      createdAt: now,
    },
  };

  const result = await users.updateOne({ email }, update, { upsert: true });

  console.log(JSON.stringify({
    ok: true,
    email,
    name,
    role: 'admin',
    upsertedId: result.upsertedId || null,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    name: error.name,
    message: error.message,
    cause: error.cause?.message || 'none',
  }, null, 2));
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
