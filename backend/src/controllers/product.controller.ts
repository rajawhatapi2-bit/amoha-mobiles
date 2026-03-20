import { Request, Response, NextFunction } from 'express';
import productService from '../services/product.service';
import { AuthenticatedRequest, ProductFilterQuery } from '../types';
import { sendSuccess, sendCreated, sendMessage } from '../utils/response.util';
import { notifyReview } from '../utils/notify';

class ProductController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as ProductFilterQuery;
      const result = await productService.getAll(filters);
      sendSuccess(res, result, 'Products fetched');
    } catch (error) {
      next(error);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getBySlug(req.params.slug);
      sendSuccess(res, product, 'Product fetched');
    } catch (error) {
      next(error);
    }
  }

  async getFeatured(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getFeatured();
      sendSuccess(res, products, 'Featured products fetched');
    } catch (error) {
      next(error);
    }
  }

  async getTrending(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getTrending();
      sendSuccess(res, products, 'Trending products fetched');
    } catch (error) {
      next(error);
    }
  }

  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as ProductFilterQuery;
      const result = await productService.getByCategory(req.params.categorySlug, filters);
      sendSuccess(res, result, 'Category products fetched');
    } catch (error) {
      next(error);
    }
  }

  async searchSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string;
      const suggestions = await productService.searchSuggestions(q);
      sendSuccess(res, suggestions, 'Search suggestions');
    } catch (error) {
      next(error);
    }
  }

  async getRelated(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getRelated(req.params.id);
      sendSuccess(res, products, 'Related products fetched');
    } catch (error) {
      next(error);
    }
  }

  // Admin
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body);
      sendCreated(res, product, 'Product created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(req.params.id, req.body);
      sendSuccess(res, product, 'Product updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.delete(req.params.id);
      sendMessage(res, 'Product deleted');
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateStock(req.params.id, req.body.stock);
      sendSuccess(res, product, 'Stock updated');
    } catch (error) {
      next(error);
    }
  }

  // Reviews
  async addReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const product = await productService.addReview(req.params.id, req.user!.userId, req.body);
      notifyReview(product.name, req.body.rating, req.user!.userId);
      sendCreated(res, product, 'Review added');
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'admin';
      const product = await productService.deleteReview(req.params.id, req.params.reviewId, req.user!.userId, isAdmin);
      sendSuccess(res, product, 'Review deleted');
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
