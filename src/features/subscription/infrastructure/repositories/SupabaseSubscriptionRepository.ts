import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/src/shared/types/database.types';
import { createAdminClient } from '@/src/shared/lib/supabase/admin';
import {
  ISubscriptionRepository,
  ActivateSubscriptionParams,
  CreatePendingPaymentParams,
} from '../../domain/repositories/SubscriptionRepository.interface';
import {
  Subscription,
  PaymentTransactionRecord,
  UserSubscriptionDetails,
} from '../../domain/models/Subscription';
import { PaymentAttemptRecord } from '../../domain/models/PaymentState';

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  private readonly supabase: SupabaseClient<Database>;

  constructor(supabase?: SupabaseClient<Database>) {
    if (supabase && process.env.NODE_ENV === 'test') {
      this.supabase = supabase;
    } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createAdminClient();
    } else if (supabase) {
      this.supabase = supabase;
    } else {
      this.supabase = createAdminClient();
    }
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    if (!userId) return null;

    const { data: rows, error } = (await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)) as unknown as {
      data: Database['public']['Tables']['subscriptions']['Row'][] | null;
      error: unknown;
    };

    if (error || !rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      plan: row.plan,
      billingCycle: row.billing_cycle,
      status: row.status,
      aiCreditLimit: row.ai_credit_limit,
      aiCreditUsed: row.ai_credit_used,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    };

  }

  async activateSubscription(params: ActivateSubscriptionParams): Promise<Subscription> {
    const { userId, plan, billingCycle, orderId, amount, receiptUrl } = params;

    // 1. Resolve workspace ID for the user
    let workspaceId = params.workspaceId;
    if (!workspaceId) {
      const { data: wsMember } = (await this.supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as {
        data: { workspace_id: string } | null;
      };

      if (wsMember?.workspace_id) {
        workspaceId = wsMember.workspace_id;
      } else {
        const { data: ws } = (await this.supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .maybeSingle()) as unknown as {
          data: { id: string } | null;
        };
        workspaceId = ws?.id || 'b888c638-2b9b-412a-b9f1-f410afe2d257';
      }
    }

    const now = new Date();
    const periodMonths = billingCycle === 'YEARLY' ? 12 : 1;
    const periodEnd = new Date(now.getTime() + periodMonths * 30 * 24 * 60 * 60 * 1000);

    // 2. Check if user already has a subscription
    const existingSub = await this.getSubscriptionByUserId(userId);

    let subscriptionId: string;

    if (existingSub) {
      subscriptionId = existingSub.id;
      await (this.supabase.from('subscriptions') as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<unknown>;
        };
      })
        .update({
          plan,
          billing_cycle: billingCycle,
          status: 'ACTIVE',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          ai_credit_limit: plan === 'TEAM' ? 2000 : 500,
          updated_at: now.toISOString(),
        })
        .eq('id', subscriptionId);
    } else {
      const { data: newSub } = (await (this.supabase.from('subscriptions') as unknown as {
        insert: (values: Record<string, unknown>) => {
          select: () => {
            single: () => Promise<{ data: { id: string } | null }>;
          };
        };
      })
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          plan,
          billing_cycle: billingCycle,
          status: 'ACTIVE',
          ai_credit_limit: plan === 'TEAM' ? 2000 : 500,
          ai_credit_used: 0,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        })
        .select()
        .single()) as { data: { id: string } | null };

      subscriptionId = newSub?.id || 'sub-' + Date.now();
    }

    // 3. Record transaction in payment_transactions table
    const netAmount = Math.round(amount / 1.1);
    const vat = amount - netAmount;

    await (this.supabase.from('payment_transactions') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      order_number: orderId,
      subscription_id: subscriptionId,
      workspace_id: workspaceId,
      user_id: userId,
      amount: netAmount,
      vat,
      total_amount: amount,
      currency: 'KRW',
      method: 'CARD',
      receipt_url: receiptUrl || null,
      status: 'SUCCESS',
      paid_at: now.toISOString(),
    });

    return {
      id: subscriptionId,
      workspaceId,
      userId,
      plan,
      billingCycle,
      status: 'ACTIVE',
      aiCreditLimit: plan === 'TEAM' ? 2000 : 500,
      aiCreditUsed: 0,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await this.getSubscriptionByUserId(userId);
    if (!sub) return false;
    if (sub.status === 'ACTIVE') return true;
    if (sub.status === 'CANCELED' || sub.cancelAtPeriodEnd) {
      if (sub.currentPeriodEnd) {
        return new Date(sub.currentPeriodEnd).getTime() > Date.now();
      }
    }
    return false;
  }

  async cancelSubscription(userId: string, reason?: string): Promise<void> {
    if (!userId) return;

    // 1. Update subscriptions to CANCELED and set cancel_at_period_end to true
    // Note: current_period_end remains intact so the user retains paid usage rights until that date.
    await (this.supabase.from('subscriptions') as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({
        status: 'CANCELED',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 2. Activity log
    await (this.supabase.from('activity_logs') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      workspace_id: 'b888c638-2b9b-412a-b9f1-f410afe2d257',
      action: 'SYNCED',
      user_id: userId,
      version: 'CANCELED',
      metadata: { reason: reason || '사용자 구독 취소 요청', timestamp: new Date().toISOString() },
    });
  }

  async resumeSubscription(userId: string): Promise<void> {
    if (!userId) return;

    // 1. Update subscriptions to ACTIVE
    await (this.supabase.from('subscriptions') as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({
        status: 'ACTIVE',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 2. Restore payment_transactions status to SUCCESS
    await (this.supabase.from('payment_transactions') as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => Promise<unknown>;
        };
      };
    })
      .update({
        status: 'SUCCESS',
      })
      .eq('user_id', userId)
      .eq('status', 'REFUNDED');

    // 3. Activity log
    await (this.supabase.from('activity_logs') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      workspace_id: 'b888c638-2b9b-412a-b9f1-f410afe2d257',
      action: 'SYNCED',
      user_id: userId,
      version: 'ACTIVE',
      metadata: { timestamp: new Date().toISOString() },
    });
  }

  async refundPayment(userId: string, orderNumber: string, reason?: string): Promise<void> {
    if (!userId || !orderNumber) return;

    // 1. Update payment_transactions to REFUNDED
    await (this.supabase.from('payment_transactions') as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => Promise<unknown>;
        };
      };
    })
      .update({
        status: 'REFUNDED',
      })
      .eq('order_number', orderNumber)
      .eq('user_id', userId);

    // 2. Cancel user subscription
    await (this.supabase.from('subscriptions') as unknown as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    })
      .update({
        status: 'CANCELED',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // 3. Activity log
    await (this.supabase.from('activity_logs') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      workspace_id: 'b888c638-2b9b-412a-b9f1-f410afe2d257',
      action: 'SYNCED',
      user_id: userId,
      version: 'REFUNDED',
      metadata: { orderNumber, reason: reason || '사용자 결제 취소 및 환불', timestamp: new Date().toISOString() },
    });
  }

  async recordPaymentAttempt(record: PaymentAttemptRecord): Promise<void> {
    const { userId, orderId, amount, state, code, message, receiptUrl } = record;
    if (!userId || !orderId) return;

    let workspaceId = record.workspaceId;
    if (!workspaceId) {
      const { data: wsMember } = (await this.supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as {
        data: { workspace_id: string } | null;
      };

      if (wsMember?.workspace_id) {
        workspaceId = wsMember.workspace_id;
      } else {
        const { data: ws } = (await this.supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .maybeSingle()) as unknown as {
          data: { id: string } | null;
        };
        workspaceId = ws?.id || 'b888c638-2b9b-412a-b9f1-f410afe2d257';
      }
    }

    const netAmount = Math.round(amount / 1.1);
    const vat = amount - netAmount;

    // Status in PostgreSQL is SUCCESS or FAILED
    const dbStatus = state === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    const cardProvider = state === 'CANCELED' ? 'USER_CANCEL' : (code || 'PAYMENT_FAILED');
    const description = state === 'CANCELED' 
      ? (message || '사용자에 의해 결제가 취소되었습니다.')
      : (message || receiptUrl || '결제 처리 완료');

    await (this.supabase.from('payment_transactions') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      order_number: orderId,
      workspace_id: workspaceId,
      user_id: userId,
      amount: netAmount,
      vat,
      total_amount: amount,
      currency: 'KRW',
      method: 'CARD',
      card_provider: cardProvider,
      receipt_url: description,
      status: dbStatus,
      paid_at: new Date().toISOString(),
    });
  }

  async createPendingPayment(params: CreatePendingPaymentParams): Promise<PaymentAttemptRecord> {
    const { userId, orderId, amount, plan, billingCycle } = params;

    let workspaceId = params.workspaceId;
    if (!workspaceId) {
      const { data: wsMember } = (await this.supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as {
        data: { workspace_id: string } | null;
      };

      if (wsMember?.workspace_id) {
        workspaceId = wsMember.workspace_id;
      } else {
        const { data: ws } = (await this.supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .maybeSingle()) as unknown as {
          data: { id: string } | null;
        };
        workspaceId = ws?.id || 'b888c638-2b9b-412a-b9f1-f410afe2d257';
      }
    }

    const now = new Date().toISOString();

    // Record PENDING payment initiation log in activity_logs
    await (this.supabase.from('activity_logs') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      workspace_id: workspaceId,
      user_id: userId,
      action: 'SYNCED',
      version: 'PENDING',
      metadata: {
        type: 'PAYMENT_PENDING',
        orderId,
        amount,
        plan,
        billingCycle,
        state: 'PENDING',
        createdAt: now,
      },
    });

    return {
      userId,
      workspaceId,
      orderId,
      amount,
      state: 'PENDING',
      plan,
      billingCycle,
      createdAt: now,
    };
  }

  async getPendingPayment(orderId: string): Promise<PaymentAttemptRecord | null> {
    if (!orderId) return null;

    const { data } = (await this.supabase
      .from('activity_logs')
      .select('metadata')
      .eq('version', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(20)) as unknown as {
      data: Array<{ metadata?: Record<string, unknown> }> | null;
    };

    if (!data || data.length === 0) return null;

    const match = data.find((row) => row.metadata?.orderId === orderId);
    if (!match || !match.metadata) return null;

    return {
      userId: String(match.metadata.userId || ''),
      orderId: String(match.metadata.orderId),
      amount: Number(match.metadata.amount || 0),
      state: 'PENDING',
      plan: (match.metadata.plan as any) || 'PRO',
      billingCycle: (match.metadata.billingCycle as any) || 'YEARLY',
      createdAt: String(match.metadata.createdAt || ''),
    };
  }

  async getPaymentTransactions(userId: string): Promise<PaymentTransactionRecord[]> {
    if (!userId) return [];

    const { data, error } = (await (this.supabase.from('payment_transactions') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: Array<{
              id: string;
              order_number: string;
              amount: number;
              vat: number;
              total_amount: number;
              currency: string;
              method: string;
              card_provider?: string | null;
              receipt_url?: string | null;
              status: string;
              paid_at: string;
              created_at: string;
            }> | null;
            error: unknown;
          }>;
        };
      };
    })
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: Array<any> | null;
      error: unknown;
    };

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      amount: Number(row.amount || 0),
      vat: Number(row.vat || 0),
      totalAmount: Number(row.total_amount || 0),
      currency: row.currency || 'KRW',
      method: row.method || 'CARD',
      cardProvider: row.card_provider || null,
      receiptUrl: row.receipt_url || null,
      status: row.status as 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELED' | 'PENDING',
      paidAt: row.paid_at || row.created_at,
      createdAt: row.created_at,
    }));
  }

  async getUserSubscriptionDetails(userId: string): Promise<UserSubscriptionDetails> {
    const [subscription, transactions] = await Promise.all([
      this.getSubscriptionByUserId(userId),
      this.getPaymentTransactions(userId),
    ]);

    const isAlreadyPaid = subscription?.status === 'ACTIVE' || transactions.some((t) => t.status === 'SUCCESS');

    return {
      subscription,
      transactions,
      isAlreadyPaid,
    };
  }
}
