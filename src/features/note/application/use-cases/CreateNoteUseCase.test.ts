import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CreateNoteUseCase } from './CreateNoteUseCase';
import { INoteRepository, CreateNoteData } from '../../domain/repositories/NoteRepository.interface';
import { NoteDetail } from '../../domain/models/NoteDetail';
import { NoteSummary } from '../../domain/models/NoteSummary';
import { ISubscriptionRepository } from '@/src/features/subscription/domain/repositories/SubscriptionRepository.interface';
import { Subscription } from '@/src/features/subscription/domain/models/Subscription';

class MockNoteRepository implements INoteRepository {
  public createdNotes: CreateNoteData[] = [];

  async getNoteById(): Promise<NoteDetail | null> {
    return null;
  }
  async saveNoteTitle(): Promise<void> {}
  async toggleChecklist(): Promise<void> {}
  async getNotes(): Promise<NoteSummary[]> {
    return [];
  }
  async deleteNote(): Promise<void> {}
  async togglePin(): Promise<void> {}

  async createNote(data: CreateNoteData): Promise<NoteDetail> {
    this.createdNotes.push(data);
    return {
      id: 'new-note-id',
      workspaceId: 'ws-1',
      title: data.title,
      folderName: data.folderName || '제품 기획',
      iconEmoji: '📝',
      tags: ['#새노트'],
      isPinned: false,
      wordCount: 0,
      readingTimeMinutes: 1,
      syncStatusText: '방금 전 저장됨',
      aiSummary: {
        title: '새 노트',
        description: '내용 없음',
        badgeText: '기본',
      },
      checklists: [],
      author: {
        name: '사용자',
        versionHash: 'rev-1',
        encryptionStatus: 'AES-256 GCM',
      },
    };
  }
}

class MockSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly active: boolean = true) {}

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return {
      id: 'sub-1',
      workspaceId: 'ws-1',
      userId,
      plan: 'PRO',
      billingCycle: 'YEARLY',
      status: this.active ? 'ACTIVE' : 'TRIALING',
      aiCreditLimit: 500,
      aiCreditUsed: 0,
      currentPeriodStart: '2026-10-15T00:00:00Z',
      currentPeriodEnd: '2027-10-15T00:00:00Z',
    };
  }

  async activateSubscription(): Promise<Subscription> {
    throw new Error('Not implemented');
  }

  async hasActiveSubscription(): Promise<boolean> {
    return this.active;
  }

  async recordPaymentAttempt(): Promise<void> {}
  async cancelSubscription(): Promise<void> {}
  async createPendingPayment(): Promise<any> {
    return {} as any;
  }
  async getPendingPayment(): Promise<any> {
    return null;
  }
  async getPaymentTransactions(): Promise<any[]> { return []; }
  async getUserSubscriptionDetails(): Promise<any> { return { subscription: null, transactions: [], isAlreadyPaid: false }; }
  async resumeSubscription(): Promise<void> {}
  async refundPayment(): Promise<void> {}
}

describe('CreateNoteUseCase', () => {
  test('결제가 완료된 회원은 새 노트를 정상적으로 생성할 수 있다', async () => {
    const noteRepo = new MockNoteRepository();
    const subRepo = new MockSubscriptionRepository(true);
    const useCase = new CreateNoteUseCase(noteRepo, subRepo);

    const result = await useCase.execute({
      userId: 'user-paid',
      title: '새로운 2026 로드맵',
      folderName: '제품 기획',
    });

    assert.strictEqual(result.title, '새로운 2026 로드맵');
    assert.strictEqual(noteRepo.createdNotes.length, 1);
  });

  test('결제가 완료되지 않은(미결제/체험) 회원이 노트를 생성하려 하면 권한 에러를 던진다', async () => {
    const noteRepo = new MockNoteRepository();
    const subRepo = new MockSubscriptionRepository(false);
    const useCase = new CreateNoteUseCase(noteRepo, subRepo);

    await assert.rejects(async () => {
      await useCase.execute({
        userId: 'user-unpaid',
        title: '새로운 메모',
      });
    }, /결제가 완료된 회원만 노트를 생성할 수 있습니다/);
  });

  test('제목이 비어있으면 에러를 던진다', async () => {
    const noteRepo = new MockNoteRepository();
    const subRepo = new MockSubscriptionRepository(true);
    const useCase = new CreateNoteUseCase(noteRepo, subRepo);

    await assert.rejects(async () => {
      await useCase.execute({
        userId: 'user-paid',
        title: '   ',
      });
    }, /노트 제목을 입력해 주세요/);
  });
});
