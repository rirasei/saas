import { IPaymentRepository } from '../../domain/repositories/PaymentRepository.interface';
import { PaymentConfirmation, PaymentReceipt } from '../../domain/models/Payment';

export class ConfirmPaymentUseCase {
  constructor(private readonly paymentRepo: IPaymentRepository) {}

  async execute(confirmation: PaymentConfirmation): Promise<PaymentReceipt> {
    const { paymentKey, orderId, amount } = confirmation;

    if (!paymentKey || !orderId || paymentKey.trim() === '' || orderId.trim() === '') {
      throw new Error('결제 키 또는 주문 번호가 유효하지 않습니다.');
    }

    if (!amount || amount <= 0) {
      throw new Error('결제 금액이 유효하지 않습니다.');
    }

    // Critical 2.2: Mandatory server-side amount verification against stored order amount
    const expectedAmount = await this.paymentRepo.getExpectedAmount(orderId);
    if (expectedAmount !== null && expectedAmount !== amount) {
      throw new Error('결제 금액이 주문 정보와 일치하지 않습니다.');
    }

    return await this.paymentRepo.confirmPayment(confirmation);
  }
}
