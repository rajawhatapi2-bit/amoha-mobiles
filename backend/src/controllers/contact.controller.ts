import { Request, Response, NextFunction } from 'express';
import contactService from '../services/contact.service';
import { sendSuccess, sendCreated, sendMessage } from '../utils/response.util';
import { notifyContact } from '../utils/notify';

class ContactController {
  // Public: submit contact message
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactService.create(req.body);
      notifyContact(message.name, message.subject, message._id.toString());
      sendCreated(res, message, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin: list all messages
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, isRead } = req.query;
      const result = await contactService.getAll({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
      });
      sendSuccess(res, result, 'Messages fetched');
    } catch (error) {
      next(error);
    }
  }

  // Admin: mark as read
  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await contactService.markRead(req.params.id);
      sendSuccess(res, message, 'Message marked as read');
    } catch (error) {
      next(error);
    }
  }

  // Admin: delete
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await contactService.delete(req.params.id);
      sendMessage(res, 'Message deleted');
    } catch (error) {
      next(error);
    }
  }

  // Admin: unread count
  async getUnreadCount(_req: Request, res: Response, next: NextFunction) {
    try {
      const count = await contactService.getUnreadCount();
      sendSuccess(res, { count }, 'Unread count fetched');
    } catch (error) {
      next(error);
    }
  }
}

export default new ContactController();
