import 'dotenv/config.js';
import { connectToDatabase, closeDatabase } from './db.js';

async function bootstrap() {
  try {
    await connectToDatabase();
    console.log('✓ Database bootstrap complete (collections/indexes ensured).');
    process.exitCode = 0;
  } catch (error) {
    console.error('✗ Database bootstrap failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

bootstrap();
