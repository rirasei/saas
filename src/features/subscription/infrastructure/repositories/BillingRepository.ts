import {
  IBillingRepository,
  IssueBillingKeyParams,
  ChargeBillingParams,
} from '../../domain/repositories/BillingRepository.interface';
import { BillingKeyInfo, DueBillingItem } from '../../domain/models/Billing';
import { PaymentReceipt } from '../../domain/models/Payment';
import { TossPaymentRepository } from './TossPaymentRepository';
import { createAdminClient } from '@/src/shared/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/src/shared/types/database.types';

export class BillingRepository implements IBillingRepository {
  private readonly tossRepo: TossPaymentRepository;
  private readonly supabase: SupabaseClient<Database>;

  constructor(tossRepo?: TossPaymentRepository, supabase?: SupabaseClient<Database>) {
    this.tossRepo = tossRepo || new TossPaymentRepository();
    this.supabase = supabase || createAdminClient();
  }

  async issueBillingKey(params: IssueBillingKeyParams): Promise<BillingKeyInfo> {
    return await this.tossRepo.issueBillingKey(params);
  }

  async chargeBilling(params: ChargeBillingParams): Promise<PaymentReceipt> {
    return await this.tossRepo.chargeBilling(params);
  }

  async saveBillingInfo(userId: string, billingInfo: BillingKeyInfo): Promise<void> {
    let workspaceId: string | undefined;

    const { data: wsMember } = (await this.supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()) as unknown as { data: { workspace_id: string } | null };

    if (wsMember?.workspace_id) {
      workspaceId = wsMember.workspace_id;
    } else {
      const { data: ws } = (await this.supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as { data: { id: string } | null };
      workspaceId = ws?.id;
    }

    if (workspaceId) {
      const { data: ws } = (await this.supabase
        .from('workspaces')
        .select('settings')
        .eq('id', workspaceId)
        .single()) as unknown as { data: { settings: unknown } | null };

      const currentSettings = (ws?.settings as Record<string, unknown>) || {};
      await (this.supabase.from('workspaces') as any)
        .update({
          settings: {
            ...currentSettings,
            billing: billingInfo,
          },
        })
        .eq('id', workspaceId);
    }
  }

  async getBillingInfo(userId: string): Promise<BillingKeyInfo | null> {
    let workspaceId: string | undefined;

    const { data: wsMember } = (await this.supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()) as unknown as { data: { workspace_id: string } | null };

    if (wsMember?.workspace_id) {
      workspaceId = wsMember.workspace_id;
    } else {
      const { data: ws } = (await this.supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as { data: { id: string } | null };
      workspaceId = ws?.id;
    }

    if (!workspaceId) return null;

    const { data: ws } = (await this.supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single()) as unknown as { data: { settings: unknown } | null };

    const settings = ws?.settings as { billing?: BillingKeyInfo } | null;
    return settings?.billing || null;
  }

  /**
   * 시간과 관계없이 기준일(기본: 오늘) 당일 또는 이전에 결제 예정인 모든 빌링키 목록을 조회합니다.
   *
   * @param targetDate 기준 날짜 (기본: 오늘)
   */
  async findDueBillings(targetDate: Date = new Date()): Promise<DueBillingItem[]> {
    const { data: workspaces, error } = (await this.supabase
      .from('workspaces')
      .select('id, owner_id, settings')) as unknown as {
      data: Array<{
        id: string;
        owner_id: string;
        settings: { billing?: BillingKeyInfo } | null;
      }> | null;
      error: unknown;
    };

    if (error || !workspaces || workspaces.length === 0) {
      return [];
    }

    // subscriptions 테이블의 current_period_end도 함께 조회하여 직관적인 테스트 및 운영 지원
    const { data: subscriptions } = (await this.supabase
      .from('subscriptions')
      .select('workspace_id, user_id, current_period_end, status')) as unknown as {
      data: Array<{
        workspace_id: string;
        user_id: string;
        current_period_end: string;
        status: string;
      }> | null;
    };

    const subMapByWorkspace = new Map<string, string>();
    const subMapByUser = new Map<string, string>();
    if (subscriptions) {
      for (const sub of subscriptions) {
        if (sub.current_period_end) {
          subMapByWorkspace.set(sub.workspace_id, sub.current_period_end);
          subMapByUser.set(sub.user_id, sub.current_period_end);
        }
      }
    }

    // 시간과 관계없이 오늘(또는 지정일) 23:59:59.999까지 결제 예정인 모든 빌링키 필터링
    const targetEndOfDayLocal = new Date(targetDate);
    targetEndOfDayLocal.setHours(23, 59, 59, 999);

    const targetEndOfDayUtc = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const maxTargetEndOfDay = Math.max(
      targetEndOfDayLocal.getTime(),
      targetEndOfDayUtc.getTime()
    );

    const dueItems: DueBillingItem[] = [];

    for (const ws of workspaces) {
      const billing = ws.settings?.billing;
      if (!billing || !billing.billingKey) {
        continue;
      }

      const userId = billing.customerKey || ws.owner_id;
      const subPeriodEnd = subMapByWorkspace.get(ws.id) || subMapByUser.get(userId);

      // subscriptions.current_period_end 또는 billing.nextBillingDate 중 만료된 날짜가 있으면 대상에 포함
      const periodEndDate = subPeriodEnd ? new Date(subPeriodEnd) : null;
      const nextBillingDate = billing.nextBillingDate ? new Date(billing.nextBillingDate) : null;

      const isPeriodEndDue =
        periodEndDate && !isNaN(periodEndDate.getTime()) && periodEndDate.getTime() <= maxTargetEndOfDay;
      const isNextBillingDue =
        nextBillingDate && !isNaN(nextBillingDate.getTime()) && nextBillingDate.getTime() <= maxTargetEndOfDay;

      // 시간(시, 분, 초)과 관계없이 날짜가 기준일 당일이거나 이미 지난 경우 대상에 포함
      if (isPeriodEndDue || isNextBillingDue) {
        dueItems.push({
          workspaceId: ws.id,
          userId,
          billingKey: billing.billingKey,
          customerKey: billing.customerKey || userId,
          nextBillingDate: subPeriodEnd || billing.nextBillingDate || new Date().toISOString(),
          cycleDays: billing.cycleDays || 30,
          cardCompany: billing.cardCompany,
          cardNumberMasked: billing.cardNumberMasked,
        });
      }
    }

    return dueItems;
  }

  async deleteBillingKey(billingKey: string): Promise<void> {
    await this.tossRepo.deleteBillingKey(billingKey);
  }

  async deleteBillingInfo(userId: string): Promise<void> {
    const billingInfo = await this.getBillingInfo(userId);
    if (billingInfo?.billingKey) {
      try {
        await this.deleteBillingKey(billingInfo.billingKey);
      } catch (e) {
        console.warn('Failed to delete billing key from Toss Payments:', e);
      }
    }

    let workspaceId: string | undefined;

    const { data: wsMember } = (await this.supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()) as unknown as { data: { workspace_id: string } | null };

    if (wsMember?.workspace_id) {
      workspaceId = wsMember.workspace_id;
    } else {
      const { data: ws } = (await this.supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()) as unknown as { data: { id: string } | null };
      workspaceId = ws?.id;
    }

    if (workspaceId) {
      const { data: ws } = (await this.supabase
        .from('workspaces')
        .select('settings')
        .eq('id', workspaceId)
        .single()) as unknown as { data: { settings: unknown } | null };

      const currentSettings = (ws?.settings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings };
      delete newSettings.billing;

      await (this.supabase.from('workspaces') as any)
        .update({
          settings: newSettings,
        })
        .eq('id', workspaceId);
    }
  }
}

