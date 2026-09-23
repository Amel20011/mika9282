'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  ArrowRight,
  Headphones,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useUser } from '@/components/customer/CustomerLayoutShell';
import { formatRupiah } from '@/lib/format';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  price: number;
  status: string;
  stock: number;
  deliveryInfo: string | null;
  features: string[];
}

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, refreshUser, updateLocalBalance } = useUser();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Purchase Modal State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    orderNumber: string;
    newBalance: number;
    deliveryInfo: string | null;
  } | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products'),
        ]);
        const catData = await catRes.json();
        const prodData = await prodRes.json();

        if (catData.categories) setCategories(catData.categories);
        if (prodData.products) setProducts(prodData.products);
      } catch (err) {
        console.error('Failed to load marketplace data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || p.categorySlug === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Execute purchase
  const handlePurchase = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!activeProduct) return;

    setPurchasing(true);
    setPurchaseError(null);

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: activeProduct.id, quantity: 1 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pembelian gagal diproses.');
      }

      updateLocalBalance(data.newBalance);
      setPurchaseSuccess({
        orderNumber: data.orderNumber,
        newBalance: data.newBalance,
        deliveryInfo: activeProduct.deliveryInfo,
      });
      await refreshUser();
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setPurchasing(false);
    }
  };

  const closeModal = () => {
    setActiveProduct(null);
    setPurchaseError(null);
    setPurchaseSuccess(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-6">
      {/* Account Balance & Greeting Card */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 p-5 sm:p-6 text-white shadow-lg shadow-sky-900/10">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-sky-100 backdrop-blur-md">
                Akun Resmi
              </span>
              <span className="text-xs text-sky-200">
                {user ? `Halo, ${user.name}` : 'Selamat Datang'}
              </span>
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
              Aurelia Cathērine Marketplace
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-sky-100/90">
              Layanan digital, lisensi panel, aplikasi premium & voucher instan
            </p>
          </div>

          {/* Quick Balance or Action Widget */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center space-x-3 rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/15">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-sky-200">
                    Saldo Aktif
                  </span>
                  <span className="text-lg font-extrabold tracking-tight">
                    {formatRupiah(user.balance)}
                  </span>
                </div>
                <Link
                  href="/deposit"
                  className="flex items-center space-x-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-sky-700 shadow-sm hover:bg-sky-50 active:scale-95 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Isi Saldo</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-sky-700 shadow-sm hover:bg-sky-50 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Subtle decorative background circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-sky-400/20 blur-xl" />
      </section>

      {/* Search & Category Filter Section */}
      <section className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari produk digital (WhatsApp Panel, VPS, Canva Pro, CapCut...)"
            className="w-full rounded-xl border border-sky-100 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === cat.slug
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Katalog Produk</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {filteredProducts.length} produk tersedia
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-100 p-4"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Tidak ada produk yang sesuai
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Coba gunakan kata kunci lain atau pilih kategori berbeda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  setActiveProduct(product);
                  setPurchaseError(null);
                  setPurchaseSuccess(null);
                }}
                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-sky-100 bg-white p-4 shadow-2xs hover:border-sky-300 hover:shadow-md hover:shadow-sky-600/5 transition-all"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                    {product.categoryName}
                  </span>
                  <h3 className="mt-1 font-bold text-slate-900 line-clamp-2 text-sm group-hover:text-sky-600 transition-colors">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase">Harga</span>
                    <span className="font-extrabold text-sm sm:text-base text-slate-900">
                      {formatRupiah(product.price)}
                    </span>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Human Customer Service Banner */}
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Butuh Bantuan atau Pertanyaan?
            </h4>
            <p className="text-xs text-slate-500">
              Customer Service kami siap membantu proses transaksi dan verifikasi Anda secara langsung.
            </p>
          </div>
        </div>
        <Link
          href="/support"
          className="shrink-0 rounded-xl bg-white border border-sky-200 px-4 py-2 text-xs font-bold text-sky-700 shadow-2xs hover:bg-sky-50 transition-colors"
        >
          Hubungi Layanan CS
        </Link>
      </section>

      {/* Purchase & Detail Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                  {activeProduct.categoryName}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeProduct.name}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success state */}
            {purchaseSuccess ? (
              <div className="my-5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-bold">Pembelian Berhasil!</span>
                </div>
                <div className="text-xs space-y-1 text-emerald-800">
                  <p>
                    Nomor Pesanan: <strong className="font-mono">{purchaseSuccess.orderNumber}</strong>
                  </p>
                  <p>
                    Sisa Saldo Anda: <strong>{formatRupiah(purchaseSuccess.newBalance)}</strong>
                  </p>
                </div>
                {purchaseSuccess.deliveryInfo && (
                  <div className="rounded-lg bg-white p-3 border border-emerald-200 text-xs">
                    <span className="block font-semibold text-slate-700 mb-1">Informasi Layanan / Akses:</span>
                    <pre className="whitespace-pre-wrap font-sans text-slate-600">
                      {purchaseSuccess.deliveryInfo}
                    </pre>
                  </div>
                )}
                <div className="pt-2 flex gap-2">
                  <Link
                    href="/transactions"
                    className="flex-1 text-center rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Lihat di Transaksi
                  </Link>
                  <button
                    onClick={closeModal}
                    className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Details */}
                <div className="my-4 space-y-3">
                  <div className="flex items-baseline justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Harga Produk</span>
                    <span className="text-xl font-black text-slate-900">
                      {formatRupiah(activeProduct.price)}
                    </span>
                  </div>

                  {activeProduct.features && activeProduct.features.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Fitur & Ketentuan:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {activeProduct.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Balance Check */}
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Saldo Anda saat ini:</span>
                      <span className="font-bold">
                        {user ? formatRupiah(user.balance) : 'Belum masuk'}
                      </span>
                    </div>
                    {user && user.balance < activeProduct.price && (
                      <div className="mt-2 text-rose-600 font-medium flex items-center space-x-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Saldo kurang {formatRupiah(activeProduct.price - user.balance)}. Silakan isi saldo terlebih dahulu.</span>
                      </div>
                    )}
                  </div>

                  {purchaseError && (
                    <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{purchaseError}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>

                  {!user ? (
                    <Link
                      href="/login"
                      className="flex-1 text-center rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
                    >
                      Masuk untuk Beli
                    </Link>
                  ) : user.balance < activeProduct.price ? (
                    <Link
                      href="/deposit"
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Isi Saldo QRIS</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={purchasing}
                      onClick={handlePurchase}
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:from-sky-500 hover:to-blue-500 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {purchasing ? (
                        <span>Memproses...</span>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Bayar Sekarang</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
