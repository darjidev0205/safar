import { NextResponse } from 'next/server';
import { checkMongoConnection } from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await checkMongoConnection();

  if (!result.connected) {
    return NextResponse.json(
      {
        status: 'error',
        provider: 'MongoDB Atlas',
        message: 'Could not connect to MongoDB database',
        error: result.error,
        dbName: result.dbName,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    provider: 'MongoDB Atlas',
    message: 'Successfully connected to MongoDB Atlas cluster',
    dbName: result.dbName,
    latencyMs: result.ping,
    collections: result.collections,
    timestamp: new Date().toISOString(),
  });
}
