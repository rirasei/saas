export interface BillingKeyInfo {
  billingKey: string;
  customerKey: string;
  cardCompany?: string;
  cardNumberMasked?: string;
  cardType?: string;
  authenticatedAt: string;
  cycleDays: number; // 기본 30일
  nextBillingDate?: string;
}

export interface BillingChargeResult {
  success: boolean;
  orderId: string;
  orderName: string;
  amount: number;
  paidAt: string;
  receiptUrl?: string;
  billingKey: string;
  nextBillingDate: string;
  card?: {
    company?: string;
    number?: string;
    cardType?: string;
  };
  error?: string;
}

export interface DueBillingItem {
  workspaceId: string;
  userId: string;
  billingKey: string;
  customerKey: string;
  nextBillingDate: string;
  cycleDays: number;
  cardCompany?: string;
  cardNumberMasked?: string;
}

export interface BatchBillingChargeResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  targetDate: string;
  results: Array<{
    userId: string;
    billingKey: string;
    success: boolean;
    result?: BillingChargeResult;
    error?: string;
  }>;
}
