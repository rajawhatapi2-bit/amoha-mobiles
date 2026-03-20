import { PipelineStage } from 'mongoose';
import ProductView from '../models/product-view.model';
import Cart from '../models/cart.model';
import Order from '../models/order.model';

class ProductViewService {
  /** Record a product view for a logged-in user */
  async trackView(userId: string, productId: string) {
    return ProductView.create({ user: userId, product: productId });
  }

  /** Admin — paginated list of all product views with user + product info */
  async getAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {};

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ];

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': regex },
            { 'user.email': regex },
            { 'product.name': regex },
          ],
        },
      });
    }

    pipeline.push({ $sort: { viewedAt: -1 } });

    // Count total
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await ProductView.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    // Fetch page
    pipeline.push({ $skip: skip }, { $limit: limit });
    pipeline.push({
      $project: {
        _id: 1,
        viewedAt: 1,
        duration: 1,
        'user._id': 1,
        'user.name': 1,
        'user.email': 1,
        'user.phone': 1,
        'product._id': 1,
        'product.name': 1,
        'product.slug': 1,
        'product.thumbnail': 1,
        'product.price': 1,
      },
    });

    const views = await ProductView.aggregate(pipeline);

    return {
      items: views,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  /** Admin — get unique users with their view counts */
  async getUserViewSummary(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: '$user',
          totalViews: { $sum: 1 },
          lastViewedAt: { $max: '$viewedAt' },
          products: { $addToSet: '$product' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ];

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      pipeline.push({
        $match: {
          $or: [{ 'user.name': regex }, { 'user.email': regex }],
        },
      });
    }

    pipeline.push({
      $addFields: { uniqueProducts: { $size: '$products' } },
    });

    pipeline.push({ $sort: { lastViewedAt: -1 } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await ProductView.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    pipeline.push({ $skip: skip }, { $limit: limit });
    pipeline.push({
      $project: {
        _id: 0,
        userId: '$_id',
        totalViews: 1,
        uniqueProducts: 1,
        lastViewedAt: 1,
        'user.name': 1,
        'user.email': 1,
        'user.phone': 1,
      },
    });

    const users = await ProductView.aggregate(pipeline);

    return {
      items: users,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  /** Admin — get all product views for a specific user */
  async getUserViews(userId: string) {
    return ProductView.find({ user: userId })
      .populate('product', 'name slug thumbnail price')
      .sort({ viewedAt: -1 })
      .lean();
  }
}

class CartAbandonmentService {
  /**
   * Get carts that have items but no completed order within the last N hours.
   * A cart is "abandoned" if the user has items in cart and their latest order
   * (if any) was placed before the cart was last updated — or they have no orders at all.
   */
  async getAbandonedCarts(query: { page?: number; limit?: number; search?: string; minAge?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const minAgeHours = query.minAge ?? 0;

    const matchFilter: Record<string, unknown> = { 'items.0': { $exists: true } };
    if (minAgeHours > 0) {
      const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);
      matchFilter.updatedAt = { $lte: cutoff };
    }

    const pipeline: PipelineStage[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Exclude carts where user has a recent completed order
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$user._id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                orderStatus: { $nin: ['cancelled', 'returned'] },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'latestOrder',
        },
      },
      // abandoned = no order at all OR latest order was placed before cart was last updated
      {
        $match: {
          $or: [
            { latestOrder: { $size: 0 } },
            {
              $expr: {
                $lt: [{ $arrayElemAt: ['$latestOrder.createdAt', 0] }, '$updatedAt'],
              },
            },
          ],
        },
      },
      // Lookup product details for items
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
    ];

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      pipeline.push({
        $match: {
          $or: [{ 'user.name': regex }, { 'user.email': regex }],
        },
      });
    }

    pipeline.push({ $sort: { updatedAt: -1 } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Cart.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    pipeline.push({ $skip: skip }, { $limit: limit });
    pipeline.push({
      $project: {
        _id: 1,
        updatedAt: 1,
        itemCount: { $size: '$items' },
        subtotal: 1,
        totalAmount: 1,
        items: {
          $map: {
            input: '$items',
            as: 'item',
            in: {
              quantity: '$$item.quantity',
              color: '$$item.color',
              price: '$$item.price',
              totalPrice: '$$item.totalPrice',
              product: {
                $let: {
                  vars: {
                    matched: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$productDetails',
                            as: 'pd',
                            cond: { $eq: ['$$pd._id', '$$item.product'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    _id: '$$matched._id',
                    name: '$$matched.name',
                    thumbnail: '$$matched.thumbnail',
                    price: '$$matched.price',
                  },
                },
              },
            },
          },
        },
        'user._id': 1,
        'user.name': 1,
        'user.email': 1,
        'user.phone': 1,
      },
    });

    const carts = await Cart.aggregate(pipeline);

    return {
      items: carts,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  }

  /** CSV export of abandoned carts */
  async getAbandonedCartsCSV(minAgeHours: number = 0): Promise<string> {
    const matchFilter: Record<string, unknown> = { 'items.0': { $exists: true } };
    if (minAgeHours > 0) {
      const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);
      matchFilter.updatedAt = { $lte: cutoff };
    }

    const carts = await Cart.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$user._id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                orderStatus: { $nin: ['cancelled', 'returned'] },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'latestOrder',
        },
      },
      {
        $match: {
          $or: [
            { latestOrder: { $size: 0 } },
            {
              $expr: {
                $lt: [{ $arrayElemAt: ['$latestOrder.createdAt', 0] }, '$updatedAt'],
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    const header = 'Customer Name,Email,Phone,Items Count,Cart Total,Products,Last Updated\n';
    const rows = carts.map((c) => {
      const name = (c.user?.name || '').replace(/,/g, ' ');
      const email = c.user?.email || '';
      const phone = (c.user?.phone || '').replace(/,/g, ' ');
      const itemsCount = c.items?.length || 0;
      const total = c.totalAmount || 0;
      const products = (c.productDetails || [])
        .map((p: { name?: string }) => (p.name || '').replace(/,/g, ' '))
        .join(' | ');
      const lastUpdated = c.updatedAt ? new Date(c.updatedAt).toISOString() : '';
      return `${name},${email},${phone},${itemsCount},${total},"${products}",${lastUpdated}`;
    });

    return header + rows.join('\n');
  }
}

export const productViewService = new ProductViewService();
export const cartAbandonmentService = new CartAbandonmentService();
