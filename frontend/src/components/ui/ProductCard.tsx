'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiOutlineHeart, HiHeart, HiStar, HiOutlineShoppingCart, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import type { Product } from '@/types';
import { formatPrice, getRatingColor } from '@/lib/utils';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useCompareStore } from '@/store/compare.store';
import toast from 'react-hot-toast';

const PLACEHOLDER_IMG = '/images/no-product.svg';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { addToCompare, removeFromCompare, isInCompare } = useCompareStore();
  const router = useRouter();

  const wishlisted = isInWishlist(product._id);
  const compared = isInCompare(product._id);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (compared) {
      removeFromCompare(product._id);
      toast.success('Removed from compare');
    } else {
      addToCompare(product);
      toast.success('Added to compare');
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent('/product/' + product.slug));
      return;
    }
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product._id);
        toast.success('Added to wishlist');
      }
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent('/product/' + product.slug));
      return;
    }
    try {
      await addToCart(product._id);
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const discountPercent = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Link href={`/product/${product.slug}`} prefetch={true} className="group block">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/10 dark:hover:shadow-black/20">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-white/[0.03]">
          <Image
            src={product.thumbnail || PLACEHOLDER_IMG}
            alt={product.name}
            fill
            unoptimized
            className="object-cover p-3 transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
          />

          {/* Discount badge */}
          {discountPercent > 0 && product.inStock && (
            <div className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              -{discountPercent}%
            </div>
          )}

          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px] dark:bg-black/60">
              <span className="rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white">
                Out of Stock
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all ${
              wishlisted
                ? 'bg-pink-50 text-pink-500 dark:bg-pink-500/20'
                : 'bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100 dark:bg-black/40 dark:text-gray-300'
            }`}
          >
            {wishlisted ? (
              <HiHeart className="h-4 w-4" />
            ) : (
              <HiOutlineHeart className="h-4 w-4" />
            )}
          </button>

          {/* Compare */}
          <button
            onClick={handleCompare}
            className={`absolute right-2 top-12 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all ${
              compared
                ? 'bg-primary-50 text-primary-500 dark:bg-primary-500/20'
                : 'bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100 dark:bg-black/40 dark:text-gray-300'
            }`}
          >
            <HiOutlineSwitchHorizontal className="h-4 w-4" />
          </button>

          {/* Add to cart on hover */}
          {product.inStock && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-primary-600 py-2.5 text-xs font-semibold text-white opacity-0 transition-all duration-300 translate-y-full group-hover:translate-y-0 group-hover:opacity-100 hover:bg-primary-500 active:scale-[0.98]"
            >
              <HiOutlineShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {product.brand}
          </p>

          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100 sm:text-[15px]">
            {product.name}
          </h3>

          {/* Specs */}
          {(product.specifications?.ram || product.specifications?.storage) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.specifications?.ram && (
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
                  {product.specifications.ram}
                </span>
              )}
              {product.specifications?.storage && (
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
                  {product.specifications.storage}
                </span>
              )}
            </div>
          )}

          {/* Rating */}
          {product.numReviews > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white ${getRatingColor(product.ratings)}`}>
                {product.ratings.toFixed(1)} <HiStar className="h-2.5 w-2.5" />
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">({product.numReviews})</span>
            </div>
          )}

          <div className="mt-auto pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[12px] text-gray-500 dark:text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
