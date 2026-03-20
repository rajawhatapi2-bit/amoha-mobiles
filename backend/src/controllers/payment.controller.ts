import { Response, NextFunction } from 'express';
import paymentService from '../services/payment.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated } from '../utils/response.util';

class PaymentController {
  /** POST /api/payment/create-order
   *  Creates a Razorpay order and returns the order details to open the checkout modal.
   */
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { couponCode } = req.body;
      const result = await paymentService.createRazorpayOrder(req.user!.userId, couponCode);
      sendSuccess(res, result, 'Razorpay order created');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/payment/verify
   *  Verifies Razorpay signature and creates the confirmed order in the database.
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await paymentService.verifyAndCreateOrder(req.user!.userId, req.body);
      sendCreated(res, order, 'Payment verified and order placed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();
