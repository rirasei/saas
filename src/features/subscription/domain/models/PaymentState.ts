import { SubscriptionPlan, BillingCycle } from './Subscription';

export type PaymentAttemptState = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELED';

export interface PaymentAttemptRecord {
  userId: string;
  workspaceId?: string;
  orderId: string;
  amount: number;
  state: PaymentAttemptState;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  code?: string;
  message?: string;
  receiptUrl?: string;
  createdAt?: string;
}
