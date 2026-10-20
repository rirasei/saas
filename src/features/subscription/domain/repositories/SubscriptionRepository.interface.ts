import {
  Subscription,
  SubscriptionPlan,
  BillingCycle,
  PaymentTransactionRecord,
  UserSubscriptionDetails,
} from '../models/Subscription';
import { PaymentAttemptRecord } from '../models/PaymentState';

export interface ActivateSubscriptionParams {
  userId: string;
  workspaceId?: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  orderId: string;
  amount: number;
  receiptUrl?: string;
}

export interface CreatePendingPaymentParams {
  userId: string;
  workspaceId?: string;
  orderId: string;
  amount: number;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
}

export interface ISubscriptionRepository {
  getSubscriptionByUserId(userId: string): Promise<Subscription | null>;
  activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription>;
  hasActiveSubscription(userId: string): Promise<boolean>;
  recordPaymentAttempt(record: PaymentAttemptRecord): Promise<void>;
  createPendingPayment(params: CreatePendingPaymentParams): Promise<PaymentAttemptRecord>;
  getPendingPayment(orderId: string): Promise<PaymentAttemptRecord | null>;
  cancelSubscription(userId: string, reason?: string): Promise<void>;
  resumeSubscription(userId: string): Promise<void>;
  refundPayment(userId: string, orderNumber: string, reason?: string): Promise<void>;
  getPaymentTransactions(userId: string): Promise<PaymentTransactionRecord[]>;
  getUserSubscriptionDetails(userId: string): Promise<UserSubscriptionDetails>;
}

