import Notification, { NotificationType } from '../models/notification.model';

class NotificationService {
  async getAll(page = 1, limit = 20, type?: string) {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications,
      totalNotifications: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getUnreadCount(): Promise<number> {
    return Notification.countDocuments({ isRead: false });
  }

  async getRecent(limit = 10) {
    return Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async markRead(id: string) {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  }

  async markAllRead() {
    await Notification.updateMany({ isRead: false }, { isRead: true });
  }

  async delete(id: string) {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) throw new Error('Notification not found');
  }

  async clearAll() {
    await Notification.deleteMany({ isRead: true });
  }

  async create(data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    return Notification.create(data);
  }
}

export default new NotificationService();
