import { pingAppsScript, validateAppsScriptConfig } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const validation = validateAppsScriptConfig();
    if (!validation.ok) {
      return Response.json({ ok: false, error: validation.error }, { status: 500 });
    }
    const result = await pingAppsScript();
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ping Google Apps Script.';
    console.error(message, error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
