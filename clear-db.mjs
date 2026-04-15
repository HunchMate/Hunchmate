import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI missing');
}

const client = new MongoClient(uri);
await client.connect();

const db = client.db('hunchmate');
const core = ['users', 'events', 'invitations', 'registrations', 'auth_sessions', 'admin_audit_logs'];
const existing = await db.listCollections({}, { nameOnly: true }).toArray();
const dynamic = existing.map((c) => c.name).filter((n) => n.startsWith('event_'));
const targets = [...core, ...dynamic];

const remaining = {};
for (const name of targets) {
  await db.collection(name).deleteMany({});
  remaining[name] = await db.collection(name).countDocuments({});
}

console.log(JSON.stringify({ targetsCount: targets.length, remaining }, null, 2));
await client.close();
