/**
 * GigBridge Ödeme Servisi
 * iyzico entegrasyonu için backend API çağrıları
 *
 * NOT: Gerçek ödeme işlemleri güvenlik için backend (Firebase Functions veya Node.js API)
 * üzerinden yapılmalıdır. Bu servis o backend'e istek atar.
 */

const PAYMENT_API_URL = process.env.EXPO_PUBLIC_PAYMENT_API_URL ?? 'https://api.gigbridge.app/payments';

export interface PaymentRequest {
  amount: number;          // Kuruş cinsinden (100 = 1 TL)
  currency: 'TRY';
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerUserId: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export async function initiatePayment(req: PaymentRequest): Promise<PaymentResult> {
  try {
    const response = await fetch(`${PAYMENT_API_URL}/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Ödeme başlatılamadı');
    return { success: true, paymentId: data.paymentId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function confirmPayment(paymentId: string, token: string): Promise<PaymentResult> {
  try {
    const response = await fetch(`${PAYMENT_API_URL}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, token }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Ödeme onaylanamadı');
    return { success: true, paymentId: data.paymentId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Plan bilgileri
export const PRO_PLANS = [
  {
    id: 'pro',
    label: 'Pro',
    price: 20000,      // 200 TL
    priceLabel: '₺200/ay',
    description: 'Aylık Pro aboneliği',
  },
  {
    id: 'plus',
    label: 'Plus',
    price: 80000,      // 800 TL
    priceLabel: '₺800/ay',
    description: 'Aylık Plus aboneliği — tüm Pro özellikleri dahil',
    badge: 'EN İYİ',
  },
];

export const BOOKING_COMMISSION_RATE = 0.05; // %5 platform komisyonu
