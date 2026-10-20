import { PaymentConfirmation, PaymentReceipt } from '../models/Payment';

export interface IPaymentRepository {
  confirmPayment(confirmation: PaymentConfirmation): Promise<PaymentReceipt>;
  getExpectedAmount(orderId: string): Promise<number | null>;
}
