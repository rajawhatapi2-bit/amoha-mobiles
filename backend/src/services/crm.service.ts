import { PipelineStage } from 'mongoose';
import User from '../models/user.model';
import Order from '../models/order.model';
import CrmNote from '../models/crm-note.model';
import { NotFoundError } from '../errors/app-error';

class CrmService {
  /** Get all customers with aggregated stats (LTV, order count, last order) */
  async getCustomers(query: { page?: number; limit?: number; search?: string; segment?: string; sortBy?: string; sortOrder?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders',
        },
      },
      {
        $addFields: {
          totalOrders: { $size: '$orders' },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$orders',
                    as: 'o',
                    cond: { $ne: ['$$o.orderStatus', 'cancelled'] },
                  },
                },
                as: 'o',
                in: '$$o.totalAmount',
              },
            },
          },
          lastOrderDate: { $max: '$orders.createdAt' },
          paidOrders: {
            $size: {
              $filter: {
                input: '$orders',
                as: 'o',
                cond: { $eq: ['$$o.paymentStatus', 'paid'] },
              },
            },
          },
        },
      },
      // Compute segment based on total spent
      {
        $addFields: {
          segment: {
            $switch: {
              branches: [
                { case: { $gte: ['$totalSpent', 50000] }, then: 'vip' },
                { case: { $gte: ['$totalSpent', 20000] }, then: 'loyal' },
                { case: { $gt: ['$totalOrders', 0] }, then: 'regular' },
              ],
              default: 'new',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'crmnotes',
          localField: '_id',
          foreignField: 'customer',
          as: 'notes',
        },
      },
      { $addFields: { notesCount: { $size: '$notes' } } },
    ];

    // Search filter
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      pipeline.push({
        $match: {
          $or: [{ name: regex }, { email: regex }, { phone: regex }],
        },
      });
    }

    // Segment filter
    if (query.segment && query.segment !== 'all') {
      pipeline.push({ $match: { segment: query.segment } });
    }

    // Sort
    const sortField = query.sortBy || 'lastOrderDate';
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDir } as Record<string, 1 | -1> });

    // Count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await User.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    // Paginate
    pipeline.push({ $skip: skip }, { $limit: limit });
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        avatar: 1,
        isBlocked: 1,
        isVerified: 1,
        createdAt: 1,
        totalOrders: 1,
        totalSpent: 1,
        paidOrders: 1,
        lastOrderDate: 1,
        segment: 1,
        notesCount: 1,
      },
    });

    const customers = await User.aggregate(pipeline);

    return {
      items: customers,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  /** Get a single customer profile with full details */
  async getCustomerProfile(customerId: string) {
    const user = await User.findById(customerId).select('-password -refreshToken -resetPasswordToken -resetPasswordExpiry').lean();
    if (!user) throw new NotFoundError('Customer');

    const [orders, notes, stats] = await Promise.all([
      Order.find({ user: customerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('items.product', 'name thumbnail price')
        .lean(),
      CrmNote.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .populate('author', 'name')
        .lean(),
      Order.aggregate([
        { $match: { user: user._id, orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' },
          },
        },
      ]),
    ]);

    const customerStats = stats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0, firstOrder: null, lastOrder: null };

    let segment = 'new';
    if (customerStats.totalSpent >= 50000) segment = 'vip';
    else if (customerStats.totalSpent >= 20000) segment = 'loyal';
    else if (customerStats.totalOrders > 0) segment = 'regular';

    return {
      customer: user,
      stats: { ...customerStats, segment },
      recentOrders: orders,
      notes,
    };
  }

  /** Add a CRM note to a customer */
  async addNote(customerId: string, authorId: string, data: { type: string; content: string }) {
    const user = await User.findById(customerId);
    if (!user) throw new NotFoundError('Customer');

    const note = await CrmNote.create({
      customer: customerId,
      author: authorId,
      type: data.type,
      content: data.content,
    });

    return CrmNote.findById(note._id).populate('author', 'name').lean();
  }

  /** Delete a CRM note */
  async deleteNote(noteId: string) {
    const note = await CrmNote.findByIdAndDelete(noteId);
    if (!note) throw new NotFoundError('Note');
    return note;
  }

  /** Get segment summary stats */
  async getSegmentSummary() {
    const segments = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders',
        },
      },
      {
        $addFields: {
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: { input: '$orders', as: 'o', cond: { $ne: ['$$o.orderStatus', 'cancelled'] } },
                },
                as: 'o',
                in: '$$o.totalAmount',
              },
            },
          },
          totalOrders: { $size: '$orders' },
        },
      },
      {
        $addFields: {
          segment: {
            $switch: {
              branches: [
                { case: { $gte: ['$totalSpent', 50000] }, then: 'vip' },
                { case: { $gte: ['$totalSpent', 20000] }, then: 'loyal' },
                { case: { $gt: ['$totalOrders', 0] }, then: 'regular' },
              ],
              default: 'new',
            },
          },
        },
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          avgSpent: { $avg: '$totalSpent' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    return segments.map((s) => ({
      segment: s._id,
      count: s.count,
      totalRevenue: Math.round(s.totalRevenue),
      avgSpent: Math.round(s.avgSpent),
    }));
  }
}

export default new CrmService();
