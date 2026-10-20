import { Suspense } from 'react';
import { PaymentDoneView } from '@/src/features/subscription/presentation/components/PaymentDoneView';

export const metadata = {
  title: '결제 완료 - CloudNote',
  description: '토스페이먼츠 결제가 성공적으로 완료되었습니다. Pro 플랜의 모든 기능을 즉시 사용해 보세요.',
};

export default function PaymentDonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex flex-col justify-center items-center py-12 px-6">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              결제 내역을 확인하는 중입니다...
            </span>
          </div>
        </div>
      }
    >
      <PaymentDoneView />
    </Suspense>
  );
}
