// ==========================================
// CONFIRMO CRYPTO PAYMENT GATEWAY
// ==========================================

const CONFIRMO_API_URL = 'https://confirmo.net/api/v3';

interface ConfirmoInvoiceRequest {
  invoice: {
    currencyFrom: string;
    amount: number;
  };
  settlement: {
    currency: string | null; // null = use customer's payment asset
  };
  product: {
    name: string;
    description?: string;
  };
  reference?: string;
  returnUrl: string;
  notifyUrl: string;
}

interface ConfirmoInvoiceResponse {
  id: string;
  status: 'prepared' | 'active' | 'confirming' | 'paid' | 'expired' | 'error';
  url: string; // Payment page URL
  merchantAmount: {
    amount: number;
    currency: string;
  };
  createdAt: string;
  expiresAt?: string;
}

interface ConfirmoWebhookPayload {
  id: string;
  status: 'prepared' | 'active' | 'confirming' | 'paid' | 'expired' | 'error';
  merchantAmount: {
    amount: number;
    currency: string;
  };
  reference?: string;
  cryptoTransactions?: Array<{
    txid: string;
    amount: number;
    currency: string;
    confirmations: number;
  }>;
}

export async function createConfirmoInvoice(
  data: ConfirmoInvoiceRequest
): Promise<ConfirmoInvoiceResponse> {
  const apiKey = process.env.CONFIRMO_API_KEY;

  if (!apiKey) {
    throw new Error('CONFIRMO_API_KEY is not set');
  }

  const response = await fetch(`${CONFIRMO_API_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Confirmo API error:', error);
    throw new Error(`Confirmo API error: ${response.status}`);
  }

  return response.json();
}

export async function getConfirmoInvoice(invoiceId: string): Promise<ConfirmoInvoiceResponse> {
  const apiKey = process.env.CONFIRMO_API_KEY;

  if (!apiKey) {
    throw new Error('CONFIRMO_API_KEY is not set');
  }

  const response = await fetch(`${CONFIRMO_API_URL}/invoices/${invoiceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Confirmo API error:', error);
    throw new Error(`Confirmo API error: ${response.status}`);
  }

  return response.json();
}

// Verify webhook by fetching invoice details (recommended by Confirmo)
export async function verifyConfirmoWebhook(
  payload: ConfirmoWebhookPayload
): Promise<ConfirmoInvoiceResponse | null> {
  try {
    const invoice = await getConfirmoInvoice(payload.id);

    // Verify the status matches what was sent in the webhook
    if (invoice.status !== payload.status) {
      console.warn('Webhook status mismatch:', payload.status, 'vs', invoice.status);
    }

    return invoice;
  } catch (error) {
    console.error('Failed to verify Confirmo webhook:', error);
    return null;
  }
}

export type { ConfirmoInvoiceRequest, ConfirmoInvoiceResponse, ConfirmoWebhookPayload };
