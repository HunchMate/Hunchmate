import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const secret = process.env.JWT_SECRET;

if (!uri) {
  throw new Error('MONGODB_URI is missing');
}

if (!secret) {
  throw new Error('JWT_SECRET is missing');
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db('hunchmate');

const admin = await db.collection('users').findOne({ role: 'admin' });
const user = await db.collection('users').findOne({ role: { $ne: 'admin' } });

console.log('admin', String(admin?._id), 'user', String(user?._id));

const token = jwt.sign(
  { userId: String(admin._id), type: 'access', iat: Math.floor(Date.now() / 1000) },
  secret,
  { expiresIn: '15m' }
);

const response = await fetch(`http://127.0.0.1:5001/admin/users/${String(user._id)}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ status: 'suspended', reason: 'probe' }),
});

const text = await response.text();
console.log('status', response.status);
console.log('body', text);

await client.close();
