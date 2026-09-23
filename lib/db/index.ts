import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

function getDatabaseFilePath(): string {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'aurelia_catherine.db');
  } catch {
    // Read-only filesystem fallback (e.g. Vercel / serverless environment)
    const tmpDir = path.join('/tmp', 'data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return path.join(tmpDir, 'aurelia_catherine.db');
    } catch {
      return path.join('/tmp', 'aurelia_catherine.db');
    }
  }
}

try {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Ignored in read-only / serverless environment
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = getDatabaseFilePath();
    dbInstance = new DatabaseSync(dbPath);
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // WAL not supported in all storage environments
    }
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initializeDatabase(dbInstance);
  }
  return dbInstance;
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS balances (
      user_id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS balance_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
      previous_balance INTEGER NOT NULL,
      new_balance INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('deposit', 'purchase', 'refund', 'manual_adjustment', 'reversal')),
      reason TEXT NOT NULL,
      related_entity_id TEXT,
      admin_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'out_of_stock', 'archived')),
      stock INTEGER DEFAULT 999,
      delivery_info TEXT,
      features_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'processing', 'failed', 'refunded', 'cancelled')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      delivery_payload TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      deposit_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'manual_qris',
      proof_url TEXT,
      proof_filename TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
      rejection_reason TEXT,
      reviewed_by_admin_id TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      transaction_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'purchase', 'refund', 'adjustment')),
      title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('credit', 'debit')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'rejected', 'cancelled', 'refunded')),
      reference_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      link_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'waiting_admin', 'waiting_user', 'in_progress', 'resolved', 'closed')),
      priority TEXT DEFAULT 'normal',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin')),
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT,
      is_internal_note INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'finance_admin', 'product_admin', 'customer_service')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      admin_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_name TEXT,
      admin_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      description TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      actor_type TEXT NOT NULL CHECK(actor_type IN ('user', 'admin', 'system')),
      actor_id TEXT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'critical')),
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  seedInitialData(db);
}

function seedInitialData(db: DatabaseSync) {
  const now = new Date().toISOString();
  const defaultHash = '$2b$10$33BhGxe5xUw6m1m6QfUOquZy1uf/q5LGV4AUABtEyOPKrK6Q/.ove'; // Password123!

  // Check if super admin exists
  const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('superadmin');
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO admins (id, name, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('adm_super_01', 'Aurelia Cathērine Super Admin', 'superadmin', 'admin@aurelia-catherine.com', defaultHash, 'super_admin', 'active', now, now);

    db.prepare(`
      INSERT INTO admins (id, name, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('adm_fin_01', 'Cathērine Finance Officer', 'financeadmin', 'finance@aurelia-catherine.com', defaultHash, 'finance_admin', 'active', now, now);

    db.prepare(`
      INSERT INTO admins (id, name, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('adm_cs_01', 'Cathērine Support Desk', 'supportagent', 'support@aurelia-catherine.com', defaultHash, 'customer_service', 'active', now, now);

    // Initial audit log
    db.prepare(`
      INSERT INTO audit_logs (id, admin_id, admin_name, admin_role, action, resource_type, resource_id, description, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('aud_seed_01', 'adm_super_01', 'Aurelia Cathērine Super Admin', 'super_admin', 'SYSTEM_INITIALIZE', 'system', 'system_core', 'Initialized Aurelia Cathērine system security and accounts.', '127.0.0.1', 'System Seeder', now);
  }

  // Check demo user
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('client');
  if (!existingUser) {
    const userId = 'usr_client_01';
    db.prepare(`
      INSERT INTO users (id, name, username, email, password_hash, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'Cathērine Client', 'client', 'client@example.com', defaultHash, '+6281234567890', 'active', now, now);

    // Initial balance Rp 50.000
    db.prepare(`
      INSERT INTO balances (user_id, amount, updated_at)
      VALUES (?, ?, ?)
    `).run(userId, 50000, now);

    // Balance ledger
    db.prepare(`
      INSERT INTO balance_ledger (id, user_id, amount, direction, previous_balance, new_balance, event_type, reason, related_entity_id, admin_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ledg_welcome_01', userId, 50000, 'in', 0, 50000, 'deposit', 'Initial Verified Deposit', 'dep_init_01', 'adm_fin_01', now);

    // Transaction record
    db.prepare(`
      INSERT INTO transactions (id, transaction_number, user_id, type, title, amount, direction, status, reference_id, details_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tx_init_01', 'TX-DEP-10001', userId, 'deposit', 'Manual QRIS Deposit Verified', 50000, 'credit', 'completed', 'dep_init_01', JSON.stringify({ method: 'QRIS', verified_by: 'Finance Admin' }), now, now);

    // Welcome notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('notif_welcome_01', userId, 'Selamat Datang di Aurelia Cathērine', 'Akun Anda telah aktif dengan saldo terverifikasi Rp 50.000. Nikmati layanan produk digital kami.', 'system', 0, '/transactions', now);
  }

  // Seed Categories
  const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (!existingCategories || Number(existingCategories.count) === 0) {
    const categoriesData = [
      { id: 'cat_wa', name: 'WhatsApp Panels', slug: 'whatsapp-panels', order: 1, desc: 'High performance WhatsApp bot servers with NVMe storage & dedicated resources' },
      { id: 'cat_prem', name: 'Premium Applications', slug: 'premium-applications', order: 2, desc: 'Official private & family streaming and productivity subscriptions' },
      { id: 'cat_vps', name: 'VPS Applications', slug: 'vps-applications', order: 3, desc: 'Enterprise cloud virtual private servers with 1 Gbps uplink' },
      { id: 'cat_ai', name: 'AI Applications', slug: 'ai-applications', order: 4, desc: 'Commercial AI credits, direct accounts & developer API bundles' },
      { id: 'cat_edit', name: 'Editing Services', slug: 'editing-services', order: 5, desc: 'Creative suite licenses and professional digital editing tools' },
      { id: 'cat_other', name: 'Other Digital Products', slug: 'other-digital-products', order: 6, desc: 'Specialized digital licenses, hosting tools, and scripts' },
    ];

    for (const cat of categoriesData) {
      db.prepare(`
        INSERT INTO categories (id, name, slug, description, display_order, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(cat.id, cat.name, cat.slug, cat.desc, cat.order, 1, now);
    }

    // Seed WhatsApp Panel Products: 1GB to 10GB + Unlimited
    const waPanels = [
      { id: 'prod_wa_1gb', name: 'WhatsApp Panel 1 GB', slug: 'whatsapp-panel-1-gb', price: 10000, features: ['RAM 1 GB Dedicated', 'CPU 100% Core', 'Disk 5 GB NVMe', 'Auto Uptime 24/7', 'Node.js & Python Support'] },
      { id: 'prod_wa_2gb', name: 'WhatsApp Panel 2 GB', slug: 'whatsapp-panel-2-gb', price: 18000, features: ['RAM 2 GB Dedicated', 'CPU 150% Core', 'Disk 10 GB NVMe', 'Anti Delay System', 'Multi Device Ready'] },
      { id: 'prod_wa_3gb', name: 'WhatsApp Panel 3 GB', slug: 'whatsapp-panel-3-gb', price: 25000, features: ['RAM 3 GB Dedicated', 'CPU 200% Core', 'Disk 15 GB NVMe', 'Low Ping Latency', 'Fast Restart'] },
      { id: 'prod_wa_4gb', name: 'WhatsApp Panel 4 GB', slug: 'whatsapp-panel-4-gb', price: 32000, features: ['RAM 4 GB Dedicated', 'CPU 250% Core', 'Disk 20 GB NVMe', 'DDoS Protection', 'Auto Backup'] },
      { id: 'prod_wa_5gb', name: 'WhatsApp Panel 5 GB', slug: 'whatsapp-panel-5-gb', price: 40000, features: ['RAM 5 GB Dedicated', 'CPU 300% Core', 'Disk 25 GB NVMe', 'High Concurrency', 'Custom Domain Support'] },
      { id: 'prod_wa_6gb', name: 'WhatsApp Panel 6 GB', slug: 'whatsapp-panel-6-gb', price: 47000, features: ['RAM 6 GB Dedicated', 'CPU 350% Core', 'Disk 30 GB NVMe', 'Super Fast Network', 'High Traffic Ready'] },
      { id: 'prod_wa_7gb', name: 'WhatsApp Panel 7 GB', slug: 'whatsapp-panel-7-gb', price: 54000, features: ['RAM 7 GB Dedicated', 'CPU 400% Core', 'Disk 35 GB NVMe', 'Direct Terminal Access', 'Priority Support'] },
      { id: 'prod_wa_8gb', name: 'WhatsApp Panel 8 GB', slug: 'whatsapp-panel-8-gb', price: 60000, features: ['RAM 8 GB Dedicated', 'CPU 450% Core', 'Disk 40 GB NVMe', 'High IOPS Storage', 'Zero Throttling'] },
      { id: 'prod_wa_9gb', name: 'WhatsApp Panel 9 GB', slug: 'whatsapp-panel-9-gb', price: 68000, features: ['RAM 9 GB Dedicated', 'CPU 500% Core', 'Disk 45 GB NVMe', 'Extreme Throughput', '24/7 Monitoring'] },
      { id: 'prod_wa_10gb', name: 'WhatsApp Panel 10 GB', slug: 'whatsapp-panel-10-gb', price: 75000, features: ['RAM 10 GB Dedicated', 'CPU 600% Core', 'Disk 50 GB NVMe', 'Enterprise Grade', 'VIP Routing'] },
      { id: 'prod_wa_unlim', name: 'WhatsApp Panel Unlimited', slug: 'whatsapp-panel-unlimited', price: 120000, features: ['RAM Unlimited Allocation', 'Uncapped CPU Core', 'Disk 100 GB NVMe', 'Ultimate Bot Hosting', 'SLA 99.99% Guaranteed'] },
    ];

    for (const p of waPanels) {
      db.prepare(`
        INSERT INTO products (id, name, slug, category_id, price, status, stock, delivery_info, features_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.name, p.slug, 'cat_wa', p.price, 'active', 999, 'Kredensial server panel akan dikirimkan otomatis setelah transaksi berhasil.', JSON.stringify(p.features), now, now);
    }

    // Additional products
    const otherProducts = [
      { id: 'prod_spotify_3m', name: 'Spotify Premium 3 Bulan Individual', slug: 'spotify-premium-3-bulan', cat: 'cat_prem', price: 45000, desc: 'Akun private legal dengan garansi penuh 3 bulan.' },
      { id: 'prod_netflix_1m', name: 'Netflix Premium Ultra HD 1 Bulan', slug: 'netflix-premium-ultra-hd-1-bulan', cat: 'cat_prem', price: 38000, desc: '1 Profil private dengan PIN personal, kualitas 4K UHD.' },
      { id: 'prod_yt_fam', name: 'YouTube Premium 1 Bulan No Ads', slug: 'youtube-premium-1-bulan', cat: 'cat_prem', price: 20000, desc: 'Aktivasi langsung ke email personal tanpa kendala.' },
      { id: 'prod_vps_nvme_2c', name: 'Cloud VPS NVMe 2 Core 4 GB RAM', slug: 'cloud-vps-nvme-2-core-4-gb', cat: 'cat_vps', price: 85000, desc: 'Ubuntu 22.04 LTS / Debian 12, port 1 Gbps, Singapore datacenter.' },
      { id: 'prod_vps_nvme_4c', name: 'Cloud VPS NVMe 4 Core 8 GB RAM', slug: 'cloud-vps-nvme-4-core-8-gb', cat: 'cat_vps', price: 160000, desc: 'High performance virtualization, root access, automated backup.' },
      { id: 'prod_chatgpt_plus', name: 'ChatGPT Plus Direct Account 1 Bulan', slug: 'chatgpt-plus-direct-account', cat: 'cat_ai', price: 75000, desc: 'Akses GPT-4o, image generation DALL-E, data analysis penuh.' },
      { id: 'prod_gemini_biz', name: 'Gemini Pro API Business Key 100k Credits', slug: 'gemini-pro-api-business-key', cat: 'cat_ai', price: 65000, desc: 'API Token siap pakai untuk automasi bisnis dan chatbot produksi.' },
      { id: 'prod_canva_pro_1y', name: 'Canva Pro 1 Tahun Edu / Team Invite', slug: 'canva-pro-1-tahun', cat: 'cat_edit', price: 25000, desc: 'Akses semua template premium, background remover, brand kit.' },
      { id: 'prod_adobe_cc_1m', name: 'Adobe Creative Cloud All Apps 1 Bulan', slug: 'adobe-creative-cloud-all-apps', cat: 'cat_edit', price: 95000, desc: 'Photoshop, Premiere Pro, Illustrator legal cloud.' },
      { id: 'prod_rdp_win', name: 'Windows RDP Dedicated 4 Core 16 GB', slug: 'windows-rdp-dedicated-4c-16gb', cat: 'cat_other', price: 110000, desc: 'Remote Desktop Windows Server 2022 high speed network.' },
    ];

    for (const p of otherProducts) {
      db.prepare(`
        INSERT INTO products (id, name, slug, category_id, price, status, stock, delivery_info, features_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.name, p.slug, p.cat, p.price, 'active', 999, p.desc, JSON.stringify([p.desc]), now, now);
    }
  }

  // Seed Website Settings & QRIS settings
  const settings = [
    { key: 'site_name', value: 'Aurelia Cathērine' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'deposits_enabled', value: 'true' },
    { key: 'purchases_enabled', value: 'true' },
    { key: 'support_enabled', value: 'true' },
    { key: 'qris_owner_name', value: 'PT AURELIA CATHERINE DIGITAL' },
    { key: 'qris_merchant_id', value: 'NMID: ID1020038891024' },
    { key: 'qris_image_url', value: '/assets/qris-aurelia-catherine.svg' },
    { key: 'qris_instructions', value: '1. Buka aplikasi e-Wallet atau Mobile Banking Anda (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay).\n2. Pilih menu Scan QRIS dan scan kode QR di atas.\n3. Masukkan nominal persis sesuai deposit yang Anda ajukan.\n4. Simpan screenshot bukti transfer yang sah dan jelas.\n5. Upload bukti pembayaran di bawah dan klik Kirim Konfirmasi.\n6. Tim Admin Aurelia Cathērine akan memverifikasi dan menyetujui saldo Anda dalam 2-10 menit.' },
    { key: 'announcement_banner', value: 'Layanan server WhatsApp Panel, VPS Cloud, dan aplikasi premium aktif 24 jam dengan verifikasi manual cepat.' },
  ];

  for (const s of settings) {
    const existing = db.prepare('SELECT key FROM website_settings WHERE key = ?').get(s.key);
    if (!existing) {
      db.prepare('INSERT INTO website_settings (key, value, updated_at) VALUES (?, ?, ?)').run(s.key, s.value, now);
    }
  }
}
