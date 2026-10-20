import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GetLandingDataUseCase } from './GetLandingDataUseCase';
import { ILandingRepository } from '../../domain/repositories/LandingRepository.interface';
import { LandingData } from '../../domain/models/LandingData';

class MockLandingRepository implements ILandingRepository {
  async getLandingData(): Promise<LandingData> {
    return {
      hero: {
        badge: 'CloudNote 3.0 공식 출시',
        headline: '생각을 기록하고, 팀과 실시간으로 연결하세요',
        subheadline: 'Markdown 완벽 지원, AI 지능형 요약 및 실시간 클라우드 자동 동기화로 생산성을 극대화하는 올인원 메모 워크스페이스.',
        trialText: '무료로 시작하기 (14일 체험)',
      },
      metrics: [
        { id: 'sla', value: '99.99%', label: '글로벌 가용성 SLA', colorClass: 'text-primary' },
        { id: 'latency', value: '< 50ms', label: '동기화 전송 지연 시간', colorClass: 'text-secondary' },
        { id: 'notes', value: '450만+', label: '매월 생성되는 팀 노트', colorClass: 'text-on-surface' },
        { id: 'encryption', value: '256-bit', label: 'AES 엔드투엔드 암호화', colorClass: 'text-tertiary' },
      ],
      features: [
        {
          id: 'sync',
          icon: 'sync',
          title: '초고속 클라우드 동기화',
          description: '비행기나 지하철 등 네트워크 연결이 끊긴 오프라인 환경에서도 작업하세요.',
          colorBgClass: 'bg-primary/10',
          colorTextClass: 'text-primary',
          visualType: 'sparkline',
        },
      ],
      testimonials: [
        {
          id: 't1',
          author: '이하은',
          role: 'Series B 핀테크 스타트업 리드 PM',
          content: '스프린트 회의 직후 AI가 정리해 주는 액션 아이템 덕분에 회의록 정리 시간이 하루 1시간 이상 줄었습니다.',
          avatarUrl: 'https://example.com/avatar.jpg',
          rating: 5,
        },
      ],
    };
  }
}

describe('GetLandingDataUseCase', () => {
  it('랜딩 페이지에 필요한 메트릭, 기능 목록 및 후기 데이터를 반환한다', async () => {
    const repo = new MockLandingRepository();
    const useCase = new GetLandingDataUseCase(repo);

    const data = await useCase.execute();

    assert.ok(data);
    assert.strictEqual(data.metrics.length, 4);
    assert.strictEqual(data.metrics[0].value, '99.99%');
    assert.strictEqual(data.features[0].title, '초고속 클라우드 동기화');
    assert.strictEqual(data.testimonials[0].author, '이하은');
  });
});
