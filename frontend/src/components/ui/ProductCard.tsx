'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineHeart, HiHeart, HiStar, HiOutlineShoppingCart } from 'react-icons/hi';
import type { Product } from '@/types';
import { formatPrice, getRatingColor } from '@/lib/utils';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();

  const wishlisted = isInWishlist(product._id);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    try {
      await addToCart(product._id);
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <Link href={`/product/${product.slug}`} prefetch={true} className="group block">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white transition-all duration-200 hover:border-gray-200 hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/10">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-white/[0.03]">
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover p-2 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
          />

          {!product.inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50">
              <span className="rounded-md bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                Out of Stock
              </span>
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              wishlisted
                ? 'bg-pink-50 text-pink-500 dark:bg-pink-500/20'
                : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 dark:bg-black/40 dark:text-gray-300'
            }`}
          >
            {wishlisted ? (
              <HiHeart className="h-4 w-4" />
            ) : (
              <HiOutlineHeart className="h-4 w-4" />
            )}
          </button>

          {/* Add to cart on hover */}
          {product.inStock && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-xs font-medium text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-primary-500 active:scale-[0.97]"
            >
              <HiOutlineShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 sm:p-3.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {product.brand}
          </p>

          <h3 className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-800 dark:text-gray-200 sm:text-[13px]">
            {product.name}
          </h3>

          {/* Specs */}
          {(product.specifications?.ram || product.specifications?.storage) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {product.specifications?.ram && (
                <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                  {product.specifications.ram}
                </span>
              )}
              {product.specifications?.storage && (
                <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                  {product.specifications.storage}
                </span>
              )}
            </div>
          )}

          {/* Rating */}
          {product.numReviews > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${getRatingColor(product.ratings)}`}>
                {product.ratings.toFixed(1)} <HiStar className="h-2.5 w-2.5" />
              </span>
              <span className="text-[10px] text-gray-400">({product.numReviews})</span>
            </div>
          )}

          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[11px] text-gray-400 line-through">
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
