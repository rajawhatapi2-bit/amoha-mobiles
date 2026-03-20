import Product from '../models/product.model';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { ProductFilterQuery } from '../types';
import slugify from 'slugify';

class ProductService {
  async getAll(filters: ProductFilterQuery) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '12', 10);
    const skip = (page - 1) * limit;

    const query: any = {};

    // Brand filter (comma-separated)
    if (filters.brand) {
      const brands = filters.brand.split(',').map((b) => b.trim());
      query.brand = { $in: brands };
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Price range
    if (filters.priceMin || filters.priceMax) {
      query.price = {};
      if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
      if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
    }

    // RAM filter (comma-separated)
    if (filters.ram) {
      const rams = filters.ram.split(',').map((r) => r.trim());
      query['specifications.ram'] = { $in: rams };
    }

    // Storage filter (comma-separated)
    if (filters.storage) {
      const storages = filters.storage.split(',').map((s) => s.trim());
      query['specifications.storage'] = { $in: storages };
    }

    // Battery filter
    if (filters.battery) {
      const batteries = filters.battery.split(',').map((b) => b.trim());
      query['specifications.battery'] = { $in: batteries };
    }

    // Rating filter
    if (filters.rating) {
      query.ratings = { $gte: parseFloat(filters.rating) };
    }

    // Search — use regex for partial matching (e.g. "sams" matches "Samsung")
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      query.$or = [
        { name: re },
        { brand: re },
        { description: re },
        { tags: re },
        { category: re },
      ];
    }

    // Sort
    let sortOption: any = { createdAt: -1 };
    if (filters.sort) {
      switch (filters.sort) {
        case 'price_low': sortOption = { price: 1 }; break;
        case 'price_high': sortOption = { price: -1 }; break;
        case 'rating': sortOption = { ratings: -1 }; break;
        case 'newest': sortOption = { createdAt: -1 }; break;
        case 'popular': sortOption = { numReviews: -1 }; break;
        case 'discount': sortOption = { discount: -1 }; break;
        default: sortOption = { createdAt: -1 };
      }
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    return {
      products,
      totalProducts,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
    };
  }

  async getBySlug(slug: string) {
    const product = await Product.findOne({ slug }).populate('reviews.user', 'name avatar').lean();
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async getFeatured() {
    return Product.find({ isFeatured: true, inStock: true }).limit(10).lean();
  }

  async getTrending() {
    return Product.find({ isTrending: true, inStock: true }).limit(10).lean();
  }

  async getByCategory(categorySlug: string, filters: ProductFilterQuery) {
    // Map category slug to category name or use slug directly
    return this.getAll({ ...filters, category: categorySlug });
  }

  async searchSuggestions(query: string) {
    if (!query || query.length < 1) return [];

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    const products = await Product.find({
      $or: [
        { name: re },
        { brand: re },
        { tags: re },
      ],
    })
      .limit(8)
      .select('name slug thumbnail price brand')
      .lean();

    return products;
  }

  async getRelated(productId: string) {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product');

    return Product.find({
      _id: { $ne: productId },
      $or: [
        { category: product.category },
        { brand: product.brand },
      ],
    })
      .limit(8)
      .lean();
  }

  // Admin methods
  async create(data: any) {
    const slug = slugify(data.name, { lower: true, strict: true });

    // Check for duplicate slug
    const existing = await Product.findOne({ slug });
    if (existing) {
      data.slug = `${slug}-${Date.now()}`;
    } else {
      data.slug = slug;
    }

    const product = await Product.create(data);
    return product;
  }

  async update(id: string, data: any) {
    if (data.name) {
      const baseSlug = slugify(data.name, { lower: true, strict: true });
      const existing = await Product.findOne({ slug: baseSlug, _id: { $ne: id } });
      data.slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async delete(id: string) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async updateStock(id: string, stock: number) {
    if (stock < 0) throw new BadRequestError('Stock cannot be negative');

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { stock, inStock: stock > 0 } },
      { new: true },
    );
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  // Reviews
  async addReview(productId: string, userId: string, review: { rating: number; title: string; comment: string }) {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product');

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === userId,
    );
    if (alreadyReviewed) {
      throw new BadRequestError('You have already reviewed this product');
    }

    product.reviews.push({
      user: userId as any,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: new Date(),
    });

    // Recalculate ratings
    product.numReviews = product.reviews.length;
    product.ratings =
      product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.numReviews;
    product.ratings = Math.round(product.ratings * 10) / 10;

    await product.save();
    return product;
  }

  async deleteReview(productId: string, reviewId: string, userId: string, isAdmin: boolean) {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product');

    const reviewIndex = product.reviews.findIndex(
      (r) => r._id?.toString() === reviewId,
    );
    if (reviewIndex === -1) throw new NotFoundError('Review');

    // Only review owner or admin can delete
    if (!isAdmin && product.reviews[reviewIndex].user.toString() !== userId) {
      throw new BadRequestError('You can only delete your own reviews');
    }

    product.reviews.splice(reviewIndex, 1);

    // Recalculate ratings
    product.numReviews = product.reviews.length;
    product.ratings = product.numReviews > 0
      ? Math.round((product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.numReviews) * 10) / 10
      : 0;

    await product.save();
    return product;
  }

  // Admin: get all reviews across products
  async getAllReviews(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const products = await Product.find({ 'reviews.0': { $exists: true } })
      .select('name slug reviews')
      .populate('reviews.user', 'name email avatar')
      .lean();

    // Flatten reviews from all products
    const allReviews = products.flatMap((product) =>
      product.reviews.map((review: any) => ({
        ...review,
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
      })),
    );

    // Sort by newest first
    allReviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalReviews = allReviews.length;
    const paginatedReviews = allReviews.slice(skip, skip + limit);

    return {
      reviews: paginatedReviews,
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
    };
  }
}

export default new ProductService();
