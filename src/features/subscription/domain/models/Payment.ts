export type PaymentPlan = 'Starter' | 'Pro' | 'Team';
export type BillingPeriod = 'monthly' | 'yearly';

export interface PaymentOrder {
  orderId: string;
  orderName: string;
  amount: number;
  plan: PaymentPlan;
  billingPeriod: BillingPeriod;
}

export interface PaymentConfirmation {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentCardInfo {
  issuerCode?: string;
  number?: string;
  cardType?: string;
  approveNo?: string;
}

export interface PaymentReceipt {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: 'DONE' | 'CANCELED' | 'WAITING_FOR_DEPOSIT' | 'FAILED';
  totalAmount: number;
  method: string;
  approvedAt: string;
  receiptUrl?: string;
  card?: PaymentCardInfo;
}
