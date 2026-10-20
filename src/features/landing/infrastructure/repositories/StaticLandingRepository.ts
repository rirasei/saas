import { ILandingRepository } from '../../domain/repositories/LandingRepository.interface';
import { LandingData } from '../../domain/models/LandingData';

export class StaticLandingRepository implements ILandingRepository {
  async getLandingData(): Promise<LandingData> {
    return {
      hero: {
        badge: 'CloudNote 3.0 공식 출시',
        headline: '생각을 기록하고, 팀과 실시간으로 연결하세요!!!',
        subheadline:
          'Markdown 완벽 지원, AI 지능형 요약 및 실시간 클라우드 자동 동기화로 생산성을 극대화하는 올인원 메모 워크스페이스. 복잡한 아이디어를 가장 명료한 지식으로 바꿉니다.',
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
          description:
            '비행기나 지하철 등 네트워크 연결이 끊긴 오프라인 환경에서도 작업하세요. 재연결 시 0.1초 만에 최신 변경분만 지능적으로 증분 백업합니다.',
          colorBgClass: 'bg-primary/10',
          colorTextClass: 'text-primary',
          visualType: 'sparkline',
        },
        {
          id: 'ai',
          icon: 'neurology',
          title: 'AI 지능형 요약 & 자동 분류',
          description:
            '긴 회의록과 방대한 리서치 자료를 클릭 한 번으로 핵심 요약본으로 추출합니다. 문맥을 파악해 연관 태그를 알아서 부여해 줍니다.',
          colorBgClass: 'bg-secondary/10',
          colorTextClass: 'text-secondary',
          visualType: 'tags',
        },
        {
          id: 'block',
          icon: 'edit_note',
          title: '블록 에디터 & 마크다운',
          description:
            '키보드만으로 작동하는 슬래시(/) 명령어와 수식(KaTeX), 코드 하이라이팅, 다이어그램을 막힘없이 작성하는 직관적인 블록 아키텍처.',
          colorBgClass: 'bg-primary-container/10',
          colorTextClass: 'text-primary-container',
          visualType: 'keyboard',
        },
      ],
      testimonials: [
        {
          id: 't1',
          author: '이하은',
          role: 'Series B 핀테크 스타트업 리드 PM',
          content:
            '“스프린트 회의 직후 AI가 정리해 주는 액션 아이템 덕분에 회의록 정리 시간이 하루 1시간 이상 줄었습니다. 팀 동기화가 말도 안 되게 빠릅니다.”',
          avatarUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAmT4gWRjgQup7nAVBS9ZH9zu1RwqA7G6DDxPyBbEI-PqPUCLoNUpueuA7lNUQ5R8wbluFOjh5ljxEafP2W1mm_AK-ynJFrJMOdMifqbKB9QQJkRxKxp5eSR3DQEr1pHi-t1ZsNkGrR6Jug65fHT9jskP_q6_g09ZPJVrItE-m7rPKfwSHKaHzg-0T1HX05hAckFJs8fv6AyPZmIX0BbNn0spbpB6wfdwcq1WFnodqDNaatfzgCy_RSwA',
          rating: 5,
        },
        {
          id: 't2',
          author: '박준우',
          role: 'AI 인프라 플랫폼 시니어 엔지니어',
          content:
            '“마크다운과 KaTeX 수식 블록 지원 수준이 완성형입니다. 네트워크 없는 KTX 안에서 코드 아키텍처를 쓰다가 도착하면 알아서 충돌 없이 동기화됩니다.”',
          avatarUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuClHDec0CwNJhz3imvh3Z6bg57Pwe6YJdX9JzF_wyJ3YNwd7ZY3FxSt2fvNcDQvc1YEL6LJR8mJQOfARTJgY5vJ-dG_0to5o1ApUj2XRPeuxNUh6G8GbjYnLsDgof4-F-Q4T5KENuNFk5dslpfzO5cfDsXZmDTcQ6Kunpjc-o9D8oLJn7bAJgioPYe4eMPu2DoRq1L7AQyZZoSjFtyMjOzQrfT5FZqpUf7nandGtC5JlO38eT66iISuTA',
          rating: 5,
        },
        {
          id: 't3',
          author: '최서연',
          role: 'UX Research Lab 디렉터',
          content:
            '“수백 편의 사용자 인터뷰와 논문 노트를 다루는데, 시맨틱 태그 자동 분류와 즉각적인 검색 엔진 속도 덕분에 다른 툴로 돌아갈 수 없습니다.”',
          avatarUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuC0SD2NWBHYAXzS2E2oJha_USz3SoLv95RWa1jdpy7vxxRZVyBNxaNBweWGHGIvbe2ddtioCadj8ko4oWa_hgRjWxHyGMdJQQpZjjYSlRy7dyucXXbQJZeKlCaGnmevAPvwdVW17os_QgDvwBnZaaKGf4W80t3WTYNXVQLmd0wmXLSlpLdWmsPfnBsrHMgu-O0q2qDANNW4xvATSeY0qXkRT_Hr3ptTaR8ZnIBLLBHEfuAH4fxnt526Lw',
          rating: 5,
        },
      ],
    };
  }
}
