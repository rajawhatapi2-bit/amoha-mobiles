import { Request, Response, NextFunction } from 'express';
import orderService from '../services/order.service';
import User from '../models/user.model';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendMessage } from '../utils/response.util';
import { notifyOrder } from '../utils/notify';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../utils/email.util';

class OrderController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.create(req.user!.userId, req.body);
      if (order) {
        notifyOrder(order.orderNumber, order.totalAmount, order._id.toString());
        // Send order confirmation email
        const user = await User.findById(req.user!.userId).lean();
        if (user) {
          const items = (order as any).items?.map((i: any) => ({
            name: i.product?.name || 'Product',
            quantity: i.quantity,
            price: i.price,
          })) || [];
          sendOrderConfirmationEmail(user.email, user.name, {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            items,
          }).catch(() => {});
        }
      }
      sendCreated(res, order, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await orderService.getAll(req.user!.userId, page, limit);
      sendSuccess(res, result, 'Orders fetched');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getById(req.params.id, req.user!.userId);
      sendSuccess(res, order, 'Order fetched');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const order = await orderService.cancel(req.params.id, req.user!.userId, reason);
      sendSuccess(res, order, 'Order cancelled');
    } catch (error) {
      next(error);
    }
  }

  async trackOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.trackOrder(req.params.id, req.user!.userId);
      sendSuccess(res, order, 'Order tracking info');
    } catch (error) {
      next(error);
    }
  }

  // Admin
  async getAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const result = await orderService.getAllOrders(page, limit, status);
      sendSuccess(res, result, 'All orders fetched');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { orderStatus, message } = req.body;
      const order = await orderService.updateOrderStatus(req.params.id, orderStatus, message);
      // Send status update email to customer
      if (order) {
        const customer = await User.findById((order as any).user).lean();
        if (customer) {
          sendOrderStatusEmail(customer.email, customer.name, order.orderNumber, orderStatus, message).catch(() => {});
        }
      }
      sendSuccess(res, order, 'Order status updated');
    } catch (error) {
      next(error);
    }
  }
}

export default new OrderController();
