/**
 * Safe client-side API helper
 * Prevents WebKit / Safari "The string did not match the expected pattern" SyntaxError
 * when responses are HTML error pages, empty bodies (204/304), or non-JSON payloads.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export function sanitizeErrorMessage(raw: unknown, fallback: string = 'Terjadi gangguan pada sistem.'): string {
  if (!raw) return fallback;
  const message = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw);

  if (
    message.includes('The string did not match the expected pattern') ||
    message.includes('SyntaxError') ||
    message.includes('Unexpected token') ||
    message.includes('JSON Parse error') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed') ||
    message.includes('TypeError: Load failed') ||
    message.includes('Preflight')
  ) {
    return 'Gagal menghubungkan ke server. Silakan muat ulang halaman atau periksa koneksi internet.';
  }

  return message;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: res.ok
          ? undefined
          : text && text.length < 150 && !text.includes('<html')
          ? text
          : 'Terjadi gangguan komunikasi dengan server.',
      };
    }

    const text = await res.text();
    if (!text || text.trim() === '') {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: res.ok ? undefined : 'Respon server kosong.',
      };
    }

    try {
      const data = JSON.parse(text);
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: !res.ok ? data?.error || 'Permintaan gagal diproses.' : undefined,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: 'Format data dari server tidak valid.',
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Koneksi gagal.';
    // Clean up WebKit generic SyntaxError message if caught
    const cleanMessage =
      message.includes('The string did not match the expected pattern') ||
      message.includes('Unexpected token') ||
      message.includes('JSON Parse error')
        ? 'Format data respon tidak valid atau koneksi terputus.'
        : message;

    return {
      ok: false,
      status: 0,
      data: null,
      error: cleanMessage,
    };
  }
}
