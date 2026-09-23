import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { submitManualDeposit } from '@/lib/financial';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const db = getDb();
    const deposits = db.prepare(`
      SELECT id, deposit_number, amount, payment_method, proof_url, proof_filename,
             status, rejection_reason, created_at, updated_at
      FROM deposits
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(user.userId);

    return NextResponse.json({ deposits });
  } catch (error) {
    console.error('User deposits fetch error:', error);
    return NextResponse.json({ error: 'Gagal mengambil riwayat deposit' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu untuk mengajukan deposit.' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, proofUrl, proofFilename } = body;

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 10000) {
      return NextResponse.json({ error: 'Nominal deposit minimal adalah Rp 10.000.' }, { status: 400 });
    }

    if (!proofUrl) {
      return NextResponse.json({ error: 'Bukti transfer wajib diunggah.' }, { status: 400 });
    }

    const result = submitManualDeposit(user.userId, parsedAmount, proofUrl, proofFilename || 'bukti_transfer.png');

    return NextResponse.json({
      success: true,
      depositId: result.depositId,
      depositNumber: result.depositNumber,
      message: 'Bukti transfer berhasil dikirim. Deposit Anda berstatus Menunggu Verifikasi Admin.',
    });
  } catch (error: unknown) {
    console.error('Submit deposit error:', error);
    const message = error instanceof Error ? error.message : 'Gagal mengajukan permohonan deposit.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
