import { BillingKeyInfo, DueBillingItem } from '../models/Billing';
import { PaymentReceipt } from '../models/Payment';

export interface IssueBillingKeyParams {
  authKey: string;
  customerKey: string;
}

export interface ChargeBillingParams {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}

export interface IBillingRepository {
  issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKeyInfo>;
  chargeBilling(params: ChargeBillingParams): Promise<PaymentReceipt>;
  saveBillingInfo(userId: string, billingInfo: BillingKeyInfo): Promise<void>;
  getBillingInfo(userId: string): Promise<BillingKeyInfo | null>;
  findDueBillings(targetDate?: Date): Promise<DueBillingItem[]>;
  deleteBillingKey?(billingKey: string): Promise<void>;
  deleteBillingInfo?(userId: string): Promise<void>;
}

