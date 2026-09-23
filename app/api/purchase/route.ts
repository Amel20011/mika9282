import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { executePurchase } from '@/lib/financial';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk ke akun Anda terlebih dahulu untuk membeli produk.' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json({ error: 'ID Produk wajib disertakan.' }, { status: 400 });
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > 50) {
      return NextResponse.json({ error: 'Jumlah pembelian tidak valid.' }, { status: 400 });
    }

    // Execute atomic purchase
    const result = executePurchase(user.userId, productId, parsedQty);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      newBalance: result.newBalance,
      message: 'Transaksi pembelian berhasil diproses!',
    });
  } catch (error) {
    console.error('Purchase API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat memproses transaksi pembelian.' }, { status: 500 });
  }
}
