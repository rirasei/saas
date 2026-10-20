import { ISubscriptionRepository } from '../../domain/repositories/SubscriptionRepository.interface';
import { NotePermission } from '@/src/features/note/domain/models/NotePermission';

export class CheckNotePermissionUseCase {
  constructor(private readonly subscriptionRepo: ISubscriptionRepository) {}

  async execute(userId: string): Promise<NotePermission> {
    if (!userId || userId.trim() === '') {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        reason: '사용자 정보가 유효하지 않습니다.',
      };
    }

    const subscription = await this.subscriptionRepo.getSubscriptionByUserId(userId);

    const isPeriodValid = subscription?.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).getTime() > Date.now()
      : false;


    // 결제가 완료된 ACTIVE 상태이거나, 구독 취소(CANCELED) 상태라도 결제 주기(currentPeriodEnd)가 남아있는 경우 권한 유지
    const hasValidAccess =
      subscription?.status === 'ACTIVE' ||
      ((subscription?.status === 'CANCELED' || subscription?.cancelAtPeriodEnd) && isPeriodValid);

    if (hasValidAccess) {
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      };
    }


    return {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      reason: '토스페이먼츠 결제가 완료된 회원만 노트를 생성, 수정, 삭제, 조회할 수 있습니다.',
    };
  }
}
