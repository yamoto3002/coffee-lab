import { NextRequest } from 'next/server';
import {
  deleteBeanFromSheet,
  deleteRoastFromSheet,
  deleteTastingFromSheet,
  readSheetsSnapshot,
  resetSheetsData,
  upsertBean,
  upsertRoast,
  upsertTasting,
  writeSheetsSnapshot,
} from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  console.error(message, error);
  return Response.json({ ok: false, error: message }, { status: 500 });
}

export async function GET() {
  try {
    const snapshot = await readSheetsSnapshot();
    return Response.json({ ok: true, ...snapshot });
  } catch (error) {
    return errorResponse(error, 'Failed to read Google Sheets.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const action = String(payload.action || '');

    if (action === 'upsertBean') {
      const bean = await upsertBean(payload.bean);
      return Response.json({ ok: true, bean });
    }

    if (action === 'deleteBean') {
      await deleteBeanFromSheet(String(payload.id || ''));
      return Response.json({ ok: true });
    }

    if (action === 'upsertRoast') {
      const roast = await upsertRoast(payload.roast, Array.isArray(payload.steps) ? payload.steps : []);
      return Response.json({ ok: true, roast });
    }

    if (action === 'deleteRoast') {
      await deleteRoastFromSheet(String(payload.id || ''));
      return Response.json({ ok: true });
    }

    if (action === 'upsertTasting') {
      const tasting = await upsertTasting(payload.tasting);
      return Response.json({ ok: true, tasting });
    }

    if (action === 'deleteTasting') {
      await deleteTastingFromSheet(String(payload.id || ''));
      return Response.json({ ok: true });
    }

    if (action === 'resetAll') {
      await resetSheetsData();
      return Response.json({ ok: true });
    }

    await writeSheetsSnapshot({
      beans: Array.isArray(payload.beans) ? payload.beans : undefined,
      roasts: Array.isArray(payload.roasts) ? payload.roasts : undefined,
      steps: Array.isArray(payload.steps) ? payload.steps : undefined,
      tastings: Array.isArray(payload.tastings) ? payload.tastings : undefined,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 'Failed to write Google Sheets.');
  }
}
