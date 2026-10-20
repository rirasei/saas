export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'PENDING';
export type SubscriptionPlan = 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface Subscription {
  id: string;
  workspaceId: string;
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  aiCreditLimit: number;
  aiCreditUsed: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
}


export interface PaymentTransactionRecord {
  id: string;
  orderNumber: string;
  amount: number;
  vat: number;
  totalAmount: number;
  currency: string;
  method: string;
  cardProvider?: string | null;
  receiptUrl?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELED' | 'PENDING';
  paidAt: string;
  createdAt: string;
}

export interface UserSubscriptionDetails {
  subscription: Subscription | null;
  transactions: PaymentTransactionRecord[];
  isAlreadyPaid: boolean;
}
