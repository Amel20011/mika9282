import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, hasPermission } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || !hasPermission(admin.role, 'audit')) {
    return NextResponse.json({ error: 'Tidak memiliki izin akses catatan audit aktivitas.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'audit'; // 'audit' or 'security'

  const db = getDb();

  if (type === 'security') {
    const securityEvents = db.prepare(`
      SELECT id, actor_type, actor_id, event_type, description, severity, ip_address, created_at
      FROM security_events
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return NextResponse.json({ securityEvents });
  }

  const auditLogs = db.prepare(`
    SELECT id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 100
  `).all();

  return NextResponse.json({ auditLogs });
}
