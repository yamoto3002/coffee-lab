import { NextRequest } from 'next/server';
import { readSheetsSnapshot, writeSheetsSnapshot } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await readSheetsSnapshot();
    return Response.json(snapshot);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to read Google Sheets.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await writeSheetsSnapshot({
      beans: Array.isArray(payload.beans) ? payload.beans : undefined,
      roasts: Array.isArray(payload.roasts) ? payload.roasts : undefined,
      steps: Array.isArray(payload.steps) ? payload.steps : undefined,
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to write Google Sheets.' },
      { status: 500 }
    );
  }
}
