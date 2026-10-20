import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ConfirmPaymentUseCase } from './ConfirmPaymentUseCase';
import { IPaymentRepository } from '../../domain/repositories/PaymentRepository.interface';
import { PaymentConfirmation, PaymentReceipt } from '../../domain/models/Payment';

class MockPaymentRepository implements IPaymentRepository {
  public expectedAmounts: Record<string, number> = {
    'order-valid-1': 94800,
    'order-valid-2': 9900,
  };

  async getExpectedAmount(orderId: string): Promise<number | null> {
    return this.expectedAmounts[orderId] ?? null;
  }

  async confirmPayment(confirmation: PaymentConfirmation): Promise<PaymentReceipt> {
    return {
      paymentKey: confirmation.paymentKey,
      orderId: confirmation.orderId,
      orderName: 'CloudNote Pro (연간 결제)',
      status: 'DONE',
      totalAmount: confirmation.amount,
      method: '카드',
      approvedAt: '2026-10-15T00:00:00+09:00',
      receiptUrl: 'https://dashboard.tosspayments.com/sales-slip?ref=mock',
      card: {
        issuerCode: '61',
        number: '12345678****789*',
        cardType: '신용',
        approveNo: '00000000',
      },
    };
  }
}

describe('ConfirmPaymentUseCase', () => {
  test('정상적인 결제 정보와 일치하는 금액으로 승인을 완료하고 영수증을 반환한다', async () => {
    const repo = new MockPaymentRepository();
    const useCase = new ConfirmPaymentUseCase(repo);

    const result = await useCase.execute({
      paymentKey: 'pk_test_12345678',
      orderId: 'order-valid-1',
      amount: 94800,
    });

    assert.strictEqual(result.status, 'DONE');
    assert.strictEqual(result.totalAmount, 94800);
    assert.strictEqual(result.orderId, 'order-valid-1');
    assert.strictEqual(result.method, '카드');
  });

  test('결제 금액이 상점의 주문 금액과 일치하지 않으면 위변조 방지를 위해 에러를 던진다', async () => {
    const repo = new MockPaymentRepository();
    const useCase = new ConfirmPaymentUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute({
        paymentKey: 'pk_test_tampered',
        orderId: 'order-valid-1',
        amount: 100, // Tampered amount (order was 94800)
      });
    }, /결제 금액이 주문 정보와 일치하지 않습니다/);
  });

  test('paymentKey 또는 orderId가 없으면 에러를 던진다', async () => {
    const repo = new MockPaymentRepository();
    const useCase = new ConfirmPaymentUseCase(repo);

    await assert.rejects(async () => {
      await useCase.execute({
        paymentKey: '',
        orderId: 'order-valid-1',
        amount: 94800,
      });
    }, /결제 키 또는 주문 번호가 유효하지 않습니다/);

    await assert.rejects(async () => {
      await useCase.execute({
        paymentKey: 'pk_test_123',
        orderId: '',
        amount: 94800,
      });
    }, /결제 키 또는 주문 번호가 유효하지 않습니다/);
  });
});
