import Product from '../models/product.model';
import { NotFoundError } from '../errors/app-error';

class BarcodeService {
  /** Lookup a product by barcode or SKU */
  async lookupByBarcode(code: string) {
    const product = await Product.findOne({
      $or: [{ barcode: code }, { sku: code }],
    }).lean();
    if (!product) throw new NotFoundError('Product with this barcode/SKU');
    return product;
  }

  /** Bulk lookup multiple barcodes */
  async bulkLookup(codes: string[]) {
    return Product.find({
      $or: [{ barcode: { $in: codes } }, { sku: { $in: codes } }],
    })
      .select('name slug sku barcode stock inStock price thumbnail')
      .lean();
  }

  /** Generate new barcode for a product that doesn't have one */
  async regenerateBarcode(productId: string) {
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError('Product');
    // Force re-generation by clearing existing
    product.barcode = '';
    product.sku = '';
    await product.save(); // pre-save hook auto-generates
    return product;
  }

  /** Get stock info by barcode (for scanning) */
  async getStockByBarcode(code: string) {
    const product = await Product.findOne({
      $or: [{ barcode: code }, { sku: code }],
    })
      .select('name slug sku barcode stock inStock price thumbnail brand category')
      .lean();
    if (!product) throw new NotFoundError('Product with this barcode/SKU');
    return {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      stock: product.stock,
      inStock: product.inStock,
      price: product.price,
      thumbnail: product.thumbnail,
      brand: product.brand,
      category: product.category,
    };
  }
}

export default new BarcodeService();
