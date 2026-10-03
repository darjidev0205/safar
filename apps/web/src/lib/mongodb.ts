import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const defaultDbName = process.env.MONGODB_DB || 'safar_db';

if (!uri) {
  console.warn(
    '[MongoDB] Warning: MONGODB_URI environment variable is not defined. MongoDB client will fail if invoked.'
  );
}

const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // Fallback rejected promise if env variable is missing
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set in environment variables.'));
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Returns the connected MongoClient instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Returns the MongoDB Db instance (defaults to safar_db or env MONGODB_DB)
 */
export async function getMongoDb(dbName?: string): Promise<Db> {
  const mongoClient = await clientPromise;
  return mongoClient.db(dbName || defaultDbName);
}

/**
 * Connectivity health check helper
 */
export async function checkMongoConnection(): Promise<{
  connected: boolean;
  dbName: string;
  ping?: number;
  collections?: string[];
  error?: string;
}> {
  try {
    const startTime = Date.now();
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    const ping = Date.now() - startTime;
    const collections = (await db.listCollections().toArray()).map((c) => c.name);

    return {
      connected: true,
      dbName: db.databaseName,
      ping,
      collections,
    };
  } catch (err: any) {
    return {
      connected: false,
      dbName: defaultDbName,
      error: err?.message || 'Failed to connect to MongoDB',
    };
  }
}

export default clientPromise;
