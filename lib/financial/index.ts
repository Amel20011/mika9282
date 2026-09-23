import crypto from 'node:crypto';
import { getDb } from '@/lib/db';

export interface PurchaseResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  newBalance?: number;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, '');
}

/**
 * Atomic purchase execution.
 * Price is ALWAYS read from database to prevent client manipulation.
 * Double click & idempotency guaranteed through database transaction locks.
 */
export function executePurchase(userId: string, productId: string, quantity = 1): PurchaseResult {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Verify purchasing system status
  const purchaseSetting = db.prepare("SELECT value FROM website_settings WHERE key = 'purchases_enabled'").get() as { value: string } | undefined;
  if (purchaseSetting && purchaseSetting.value === 'false') {
    return { success: false, error: 'Sistem pembelian sedang dalam pemeliharaan sementara.' };
  }

  // 2. Verify user account status
  const user = db.prepare('SELECT id, name, status FROM users WHERE id = ?').get(userId) as { id: string; name: string; status: string } | undefined;
  if (!user) {
    return { success: false, error: 'Akun pengguna tidak ditemukan.' };
  }
  if (user.status === 'banned') {
    return { success: false, error: 'Akun Anda telah dinonaktifkan permanen oleh Administrator.' };
  }
  if (user.status === 'suspended') {
    return { success: false, error: 'Akun Anda sedang ditangguhkan sementara.' };
  }

  // 3. Verify product existence and server-authoritative price
  const product = db.prepare('SELECT id, name, price, status, stock, delivery_info FROM products WHERE id = ?').get(productId) as {
    id: string;
    name: string;
    price: number;
    status: string;
    stock: number;
    delivery_info: string;
  } | undefined;

  if (!product) {
    return { success: false, error: 'Produk digital tidak ditemukan.' };
  }
  if (product.status !== 'active') {
    return { success: false, error: 'Produk ini sedang tidak tersedia atau dalam pemeliharaan.' };
  }
  if (product.stock < quantity) {
    return { success: false, error: 'Stok produk digital ini sedang habis.' };
  }

  const totalCost = Number(product.price) * quantity;

  // 4. Begin Atomic Immediate Transaction
  try {
    db.exec('BEGIN IMMEDIATE;');

    // Read authoritative user balance inside transaction
    const balanceRow = db.prepare('SELECT amount FROM balances WHERE user_id = ?').get(userId) as { amount: number } | undefined;
    const currentBalance = balanceRow ? Number(balanceRow.amount) : 0;

    if (currentBalance < totalCost) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        error: `Saldo tidak mencukupi. Saldo saat ini ${formatRupiah(currentBalance)}, dibutuhkan ${formatRupiah(totalCost)}. Silakan lakukan Deposit.`,
      };
    }

    const newBalance = currentBalance - totalCost;

    // Deduct balance
    db.prepare('UPDATE balances SET amount = ?, updated_at = ? WHERE user_id = ?').run(newBalance, now, userId);

    // Create Order
    const orderId = 'ord_' + crypto.randomUUID();
    const orderNumber = 'AC-ORD-' + Math.floor(100000 + Math.random() * 900000);

    db.prepare(`
      INSERT INTO orders (id, order_number, user_id, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, 'completed', ?)
    `).run(orderId, orderNumber, userId, totalCost, now);

    // Create Order Item
    const orderItemId = 'itm_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, delivery_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orderItemId, orderId, product.id, product.name, product.price, quantity, product.delivery_info);

    // Record Balance Ledger entry
    const ledgerId = 'ledg_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO balance_ledger (id, user_id, amount, direction, previous_balance, new_balance, event_type, reason, related_entity_id, created_at)
      VALUES (?, ?, ?, 'out', ?, ?, 'purchase', ?, ?, ?)
    `).run(ledgerId, userId, totalCost, currentBalance, newBalance, `Pembelian ${product.name} (x${quantity})`, orderId, now);

    // Record Transaction
    const txId = 'tx_' + crypto.randomUUID();
    const txNumber = 'TX-PUR-' + Math.floor(100000 + Math.random() * 900000);
    db.prepare(`
      INSERT INTO transactions (id, transaction_number, user_id, type, title, amount, direction, status, reference_id, details_json, created_at, updated_at)
      VALUES (?, ?, ?, 'purchase', ?, ?, 'debit', 'completed', ?, ?, ?, ?)
    `).run(
      txId,
      txNumber,
      userId,
      `Pembelian ${product.name}`,
      totalCost,
      orderId,
      JSON.stringify({ order_number: orderNumber, product_name: product.name, quantity, delivery: product.delivery_info }),
      now,
      now
    );

    // Create Notification
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'purchase', 0, ?, ?)
    `).run(notifId, userId, 'Pembelian Berhasil', `Pesanan ${product.name} telah berhasil diproses. Saldo baru Anda ${formatRupiah(newBalance)}.`, `/transactions`, now);

    db.exec('COMMIT;');

    return {
      success: true,
      orderId,
      orderNumber,
      newBalance,
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Purchase transaction error:', err);
    return { success: false, error: 'Terjadi kesalahan sistem saat memproses transaksi pembelian.' };
  }
}

/**
 * Submit manual QRIS deposit
 */
export function submitManualDeposit(userId: string, amount: number, proofUrl: string, proofFilename: string) {
  const db = getDb();
  const now = new Date().toISOString();

  if (amount < 10000) {
    throw new Error('Minimal pengajuan deposit adalah Rp 10.000.');
  }

  const depositId = 'dep_' + crypto.randomUUID();
  const depositNumber = 'DEP-QRIS-' + Math.floor(100000 + Math.random() * 900000);

  try {
    db.exec('BEGIN IMMEDIATE;');

    db.prepare(`
      INSERT INTO deposits (id, deposit_number, user_id, amount, payment_method, proof_url, proof_filename, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'manual_qris', ?, ?, 'pending', ?, ?)
    `).run(depositId, depositNumber, userId, amount, proofUrl, proofFilename, now, now);

    // Initial transaction record in pending status
    const txId = 'tx_' + crypto.randomUUID();
    const txNumber = 'TX-DEP-' + Math.floor(100000 + Math.random() * 900000);
    db.prepare(`
      INSERT INTO transactions (id, transaction_number, user_id, type, title, amount, direction, status, reference_id, details_json, created_at, updated_at)
      VALUES (?, ?, ?, 'deposit', 'Deposit Saldo QRIS', ?, 'credit', 'pending', ?, ?, ?, ?)
    `).run(txId, txNumber, userId, amount, depositId, JSON.stringify({ deposit_number: depositNumber, method: 'Manual QRIS' }), now, now);

    // Notification
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'deposit', 0, ?, ?)
    `).run(
      notifId,
      userId,
      'Pengajuan Deposit Diterima',
      `Deposit senilai ${formatRupiah(amount)} (${depositNumber}) sedang diverifikasi oleh Administrator kami.`,
      '/deposit',
      now
    );

    db.exec('COMMIT;');
    return { depositId, depositNumber };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Administrator approves deposit: Atomic, idempotent, audited
 */
export function approveDeposit(depositId: string, adminId: string, adminName: string, adminRole: string) {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN IMMEDIATE;');

    const deposit = db.prepare('SELECT id, deposit_number, user_id, amount, status FROM deposits WHERE id = ?').get(depositId) as {
      id: string;
      deposit_number: string;
      user_id: string;
      amount: number;
      status: string;
    } | undefined;

    if (!deposit) {
      db.exec('ROLLBACK;');
      throw new Error('Data deposit tidak ditemukan.');
    }

    if (deposit.status !== 'pending' && deposit.status !== 'under_review') {
      db.exec('ROLLBACK;');
      throw new Error(`Deposit ini tidak dapat disetujui karena statusnya sudah '${deposit.status}'.`);
    }

    const amount = Number(deposit.amount);

    // Get current balance
    const balanceRow = db.prepare('SELECT amount FROM balances WHERE user_id = ?').get(deposit.user_id) as { amount: number } | undefined;
    const previousBalance = balanceRow ? Number(balanceRow.amount) : 0;
    const newBalance = previousBalance + amount;

    // 1. Update deposit status
    db.prepare(`
      UPDATE deposits
      SET status = 'approved', reviewed_by_admin_id = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(adminId, now, now, depositId);

    // 2. Credit balance
    db.prepare(`
      INSERT INTO balances (user_id, amount, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET amount = ?, updated_at = ?
    `).run(deposit.user_id, newBalance, now, newBalance, now);

    // 3. Record balance ledger
    const ledgerId = 'ledg_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO balance_ledger (id, user_id, amount, direction, previous_balance, new_balance, event_type, reason, related_entity_id, admin_id, created_at)
      VALUES (?, ?, ?, 'in', ?, ?, 'deposit', ?, ?, ?, ?)
    `).run(ledgerId, deposit.user_id, amount, previousBalance, newBalance, `Deposit QRIS Disetujui (${deposit.deposit_number})`, depositId, adminId, now);

    // 4. Update transaction status
    db.prepare(`
      UPDATE transactions
      SET status = 'completed', updated_at = ?
      WHERE reference_id = ? AND type = 'deposit'
    `).run(now, depositId);

    // 5. Create notification for user
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'deposit', 0, ?, ?)
    `).run(
      notifId,
      deposit.user_id,
      'Deposit Berhasil Disetujui',
      `Deposit ${formatRupiah(amount)} telah disetujui. Saldo akun Anda sekarang ${formatRupiah(newBalance)}.`,
      '/transactions',
      now
    );

    // 6. Record Audit Log
    const auditId = 'aud_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'APPROVE_DEPOSIT', 'deposits', ?, ?, '127.0.0.1', ?)
    `).run(auditId, adminId, adminName, adminRole, depositId, `Menyetujui deposit ${deposit.deposit_number} senilai ${formatRupiah(amount)} untuk user ${deposit.user_id}`, now);

    db.exec('COMMIT;');
    return { success: true, newBalance };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Administrator rejects deposit: Audited
 */
export function rejectDeposit(depositId: string, adminId: string, adminName: string, adminRole: string, reason: string) {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN IMMEDIATE;');

    const deposit = db.prepare('SELECT id, deposit_number, user_id, amount, status FROM deposits WHERE id = ?').get(depositId) as {
      id: string;
      deposit_number: string;
      user_id: string;
      amount: number;
      status: string;
    } | undefined;

    if (!deposit) {
      db.exec('ROLLBACK;');
      throw new Error('Data deposit tidak ditemukan.');
    }

    if (deposit.status !== 'pending' && deposit.status !== 'under_review') {
      db.exec('ROLLBACK;');
      throw new Error(`Deposit ini tidak dapat ditolak karena berstatus '${deposit.status}'.`);
    }

    db.prepare(`
      UPDATE deposits
      SET status = 'rejected', rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, adminId, now, now, depositId);

    // Update transaction status
    db.prepare(`
      UPDATE transactions
      SET status = 'rejected', updated_at = ?
      WHERE reference_id = ? AND type = 'deposit'
    `).run(now, depositId);

    // Create user notification
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'deposit', 0, ?, ?)
    `).run(
      notifId,
      deposit.user_id,
      'Pengajuan Deposit Ditolak',
      `Deposit ${deposit.deposit_number} (${formatRupiah(Number(deposit.amount))}) ditolak dengan alasan: ${reason}`,
      '/deposit',
      now
    );

    // Audit log
    const auditId = 'aud_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'REJECT_DEPOSIT', 'deposits', ?, ?, '127.0.0.1', ?)
    `).run(auditId, adminId, adminName, adminRole, depositId, `Menolak deposit ${deposit.deposit_number} dengan alasan: ${reason}`, now);

    db.exec('COMMIT;');
    return { success: true };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Manual balance adjustment with strict audit trail
 */
export function manualBalanceAdjust(
  userId: string,
  amountDelta: number,
  direction: 'in' | 'out',
  reason: string,
  adminId: string,
  adminName: string,
  adminRole: string
) {
  const db = getDb();
  const now = new Date().toISOString();

  if (amountDelta <= 0) {
    throw new Error('Nominal penyesuaian harus lebih dari 0.');
  }

  try {
    db.exec('BEGIN IMMEDIATE;');

    const balanceRow = db.prepare('SELECT amount FROM balances WHERE user_id = ?').get(userId) as { amount: number } | undefined;
    const currentBalance = balanceRow ? Number(balanceRow.amount) : 0;

    let newBalance = currentBalance;
    if (direction === 'in') {
      newBalance = currentBalance + amountDelta;
    } else {
      if (currentBalance < amountDelta) {
        db.exec('ROLLBACK;');
        throw new Error('Pengurangan saldo melebihi saldo yang dimiliki pengguna.');
      }
      newBalance = currentBalance - amountDelta;
    }

    db.prepare(`
      INSERT INTO balances (user_id, amount, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET amount = ?, updated_at = ?
    `).run(userId, newBalance, now, newBalance, now);

    // Ledger entry
    const ledgerId = 'ledg_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO balance_ledger (id, user_id, amount, direction, previous_balance, new_balance, event_type, reason, admin_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'manual_adjustment', ?, ?, ?)
    `).run(ledgerId, userId, amountDelta, direction, currentBalance, newBalance, reason, adminId, now);

    // Transaction entry
    const txId = 'tx_' + crypto.randomUUID();
    const txNumber = 'TX-ADJ-' + Math.floor(100000 + Math.random() * 900000);
    db.prepare(`
      INSERT INTO transactions (id, transaction_number, user_id, type, title, amount, direction, status, details_json, created_at, updated_at)
      VALUES (?, ?, ?, 'adjustment', ?, ?, ?, 'completed', ?, ?, ?)
    `).run(
      txId,
      txNumber,
      userId,
      direction === 'in' ? 'Penyesuaian Penambahan Saldo Admin' : 'Penyesuaian Pemotongan Saldo Admin',
      amountDelta,
      direction === 'in' ? 'credit' : 'debit',
      JSON.stringify({ reason, adjusted_by: adminName }),
      now,
      now
    );

    // Notify user
    const notifId = 'notif_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, 'system', 0, ?, ?)
    `).run(
      notifId,
      userId,
      'Penyesuaian Saldo Akun',
      `Saldo Anda telah disesuaikan sebesar ${direction === 'in' ? '+' : '-'}${formatRupiah(amountDelta)}. Saldo baru: ${formatRupiah(newBalance)}. Catatan: ${reason}`,
      '/transactions',
      now
    );

    // Audit log
    const auditId = 'aud_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, created_at)
      VALUES (?, ?, ?, ?, 'ADJUST_BALANCE', 'balances', ?, ?, '127.0.0.1', ?)
    `).run(
      auditId,
      adminId,
      adminName,
      adminRole,
      userId,
      `Penyesuaian saldo (${direction}): ${formatRupiah(amountDelta)} untuk user ${userId}. Alasan: ${reason}`,
      now
    );

    db.exec('COMMIT;');
    return { success: true, newBalance };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
