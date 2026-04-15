import 'dotenv/config.js';
import { MongoClient } from 'mongodb';
import { createLocalDatabase } from './local-db.js';

let cachedClient = null;
let cachedDb = null;

function isLocalDatabaseMode() {
  const mode = String(process.env.LOCAL_DB_MODE || '').trim().toLowerCase();
  const mongoUri = String(process.env.MONGODB_URI || '').trim().toLowerCase();

  return [
    'local',
    'file',
    'json',
    'memory',
    'true',
    '1',
  ].includes(mode) || mongoUri.startsWith('local://') || mongoUri.startsWith('file://');
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (isLocalDatabaseMode()) {
    const dbName = String(process.env.MONGODB_DB_NAME || 'hunchmate').trim() || 'hunchmate';
    const db = await createLocalDatabase({ dbName });

    cachedClient = null;
    cachedDb = db;
    console.log(`✓ Local JSON database ready: ${dbName}`);

    return { client: cachedClient, db: cachedDb };
  }

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Set it in your environment before starting the backend.');
  }

  const dbName = String(process.env.MONGODB_DB_NAME || 'hunchmate').trim() || 'hunchmate';

  const client = new MongoClient(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  try {
    await client.connect();
    console.log('✓ MongoDB connected');
    
    const db = client.db(dbName);
    console.log(`✓ Using MongoDB database: ${dbName}`);
    
    // Create indexes for collections
    const usersCollection = db.collection('users');
    const eventsCollection = db.collection('events');
    const invitationsCollection = db.collection('invitations');
    const registrationsCollection = db.collection('registrations');
    const authSessionsCollection = db.collection('auth_sessions');
    const adminAuditLogsCollection = db.collection('admin_audit_logs');
    const complaintsCollection = db.collection('complaints');
    
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ 'google.sub': 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ provider: 1 });
    await usersCollection.createIndex({ createdAt: 1 });

    await authSessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
    await authSessionsCollection.createIndex({ userId: 1 });
    await authSessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await eventsCollection.createIndex({ id: 1 }, { unique: true });
    await eventsCollection.createIndex({ 'organiser.id': 1 });
    await eventsCollection.createIndex({ 'organizer.id': 1 });
    await eventsCollection.createIndex({ createdBy: 1 });
    await eventsCollection.createIndex({ status: 1 });
    await eventsCollection.createIndex({ createdAt: 1 });
    
    await invitationsCollection.createIndex({ invitationId: 1 }, { unique: true });
    await invitationsCollection.createIndex({ inviterEmail: 1 });
    await invitationsCollection.createIndex({ inviteeEmail: 1 });
    await invitationsCollection.createIndex({ createdAt: 1 });
    
    await registrationsCollection.createIndex({ eventId: 1, userId: 1 }, { unique: true });
    await registrationsCollection.createIndex({ eventId: 1 });

    await adminAuditLogsCollection.createIndex({ actorId: 1, createdAt: -1 });
    await adminAuditLogsCollection.createIndex({ targetType: 1, targetId: 1, createdAt: -1 });
    await adminAuditLogsCollection.createIndex({ action: 1, createdAt: -1 });

    await complaintsCollection.createIndex({ complaintId: 1 }, { unique: true });
    await complaintsCollection.createIndex({ userId: 1, createdAt: -1 });
    await complaintsCollection.createIndex({ status: 1, createdAt: -1 });
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
}

export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    return;
  }

  if (cachedDb && typeof cachedDb.close === 'function') {
    await cachedDb.close();
    cachedDb = null;
  }
}

export function getCachedDb() {
  return cachedDb;
}

export function getCachedClient() {
  return cachedClient;
}
