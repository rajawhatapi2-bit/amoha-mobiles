'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  HiStar,
  HiOutlineHeart,
  HiHeart,
  HiOutlineShoppingBag,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineRefresh,
  HiOutlineChevronRight,
  HiOutlineShare,
  HiOutlineChevronLeft,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import type { Product } from '@/types';
import { productService } from '@/services/product.service';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice, getStockStatus, getRatingColor, formatDate } from '@/lib/utils';
import ProductCard from '@/components/ui/ProductCard';
import { ProductDetailSkeleton } from '@/components/ui/Skeletons';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews'>('specs');
  const [imageZoomed, setImageZoomed] = useState(false);

  const { addToCart, isLoading: cartLoading } = useCartStore();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const data = await productService.getBySlug(slug);
        setProduct(data);
        if (data.colors?.length) setSelectedColor(data.colors[0]);
        const relatedData = await productService.getRelated(data._id);
        setRelated(relatedData);
      } catch {
        toast.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
    setSelectedImage(0);
    setQuantity(1);
    setActiveTab('specs');
  }, [slug]);

  // Track product view for logged-in users
  useEffect(() => {
    if (product && isAuthenticated) {
      productService.trackView(product._id).catch(() => {});
    }
  }, [product?._id, isAuthenticated]);

  const navigateImage = useCallback(
    (dir: 1 | -1) => {
      if (!product) return;
      setSelectedImage((prev) => {
        const next = prev + dir;
        if (next < 0) return product.images.length - 1;
        if (next >= product.images.length) return 0;
        return next;
      });
    },
    [product],
  );

  if (isLoading) {
    return <div className="page-container py-10"><ProductDetailSkeleton /></div>;
  }

  if (!product) {
    return (
      <div className="page-container flex flex-col items-center justify-center py-32 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
          <HiOutlineShoppingBag className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Product Not Found</h2>
        <p className="mt-2 text-gray-500">The product you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-500">
          Browse Shop
        </Link>
      </div>
    );
  }

  const wishlisted = isInWishlist(product._id);
  const stockStatus = getStockStatus(product.stock);
  const savings = product.originalPrice > product.price ? product.originalPrice - product.price : 0;

  const handleAddToCart = async () => {
    try {
      await addToCart(product._id, quantity, selectedColor);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async () => {
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product._id);
        toast.success('Added to wishlist!');
      }
    } catch {
      toast.error('Please login first');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch {
      // ignore
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Please write a review comment');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await productService.submitReview(product._id, {
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      toast.success('Review submitted successfully!');
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      const updated = await productService.getBySlug(slug);
      setProduct(updated);
    } catch {
      toast.error('Failed to submit review. You may have already reviewed this product.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const specEntries = product.specifications
    ? Object.entries(product.specifications).filter(([, v]) => v && v !== '')
    : [];

  return (
    <main className="min-h-screen">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="border-b border-gray-200 dark:border-white/5 bg-surface-50/50">
        <div className="page-container flex items-center gap-2 py-3 text-xs text-gray-500">
          <Link href="/" className="transition-colors hover:text-primary-400">Home</Link>
          <HiOutlineChevronRight className="h-3 w-3 flex-shrink-0" />
          <Link href="/products" className="transition-colors hover:text-primary-400">Products</Link>
          <HiOutlineChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate text-gray-500 dark:text-gray-400">{product.name}</span>
        </div>
      </nav>

      <div className="page-container py-6 sm:py-8 lg:py-10">
        {/* ══════════════════ Product Hero ══════════════════ */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12 xl:gap-16">

          {/* ── Image Gallery ── */}
          <section className="flex flex-col gap-3 sm:gap-4">
            {/* Main Image */}
            <div className="glass-card group relative overflow-hidden">
              <div
                className={`relative aspect-square cursor-zoom-in transition-transform duration-500 ${imageZoomed ? 'scale-150 cursor-zoom-out' : ''}`}
                onClick={() => setImageZoomed((z) => !z)}
              >
                <Image
                  src={product.images[selectedImage] || product.thumbnail}
                  alt={`${product.name} – image ${selectedImage + 1}`}
                  fill
                  priority
                  className="object-contain p-4 sm:p-6 lg:p-8"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 45vw"
                />
              </div>

              {/* Discount badge */}
              {product.discount > 0 && (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg sm:text-sm">
                  {product.discount}% OFF
                </span>
              )}

              {/* Image pagination arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateImage(-1); }}
                    className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-black/40 text-white/70 opacity-0 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-gray-900 dark:hover:text-white group-hover:opacity-100 sm:h-10 sm:w-10"
                    aria-label="Previous image"
                  >
                    <HiOutlineChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateImage(1); }}
                    className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-black/40 text-white/70 opacity-0 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-gray-900 dark:hover:text-white group-hover:opacity-100 sm:h-10 sm:w-10"
                    aria-label="Next image"
                  >
                    <HiOutlineChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image dots (mobile) */}
              {product.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:hidden">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setSelectedImage(idx); }}
                      className={`h-1.5 rounded-full transition-all ${selectedImage === idx ? 'w-5 bg-primary-500' : 'w-1.5 bg-white/30'}`}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails (tablet+) */}
            {product.images.length > 1 && (
              <div className="hidden gap-2 overflow-x-auto scrollbar-hide pb-1 sm:flex">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 md:h-20 md:w-20 ${
                      selectedImage === idx
                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                        : 'border-gray-200 dark:border-white/10 opacity-60 hover:border-white/25 hover:opacity-100'
                    }`}
                    aria-label={`Select image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Product Info ── */}
          <section className="flex flex-col lg:sticky lg:top-4 lg:self-start">
            {/* Brand + Share */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400">{product.brand}</p>
              <button
                onClick={handleShare}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 transition-all hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white"
                aria-label="Share product"
              >
                <HiOutlineShare className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <h1 className="mt-2 text-xl font-bold leading-tight text-gray-900 dark:text-white sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>

            {/* Rating + Stock */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-white ${getRatingColor(product.ratings)}`}>
                <HiStar className="h-4 w-4" /> {product.ratings.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">{product.numReviews} {product.numReviews === 1 ? 'review' : 'reviews'}</span>
              <span className="hidden h-4 w-px bg-gray-200 dark:bg-white/10 sm:block" />
              <span className={`text-sm font-medium ${stockStatus.color}`}>{stockStatus.label}</span>
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-base text-gray-500 line-through sm:text-lg">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {savings > 0 && (
              <p className="mt-1.5 text-sm font-semibold text-emerald-400">
                You save {formatPrice(savings)} ({product.discount}% off)
              </p>
            )}

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-[15px] sm:leading-relaxed">
              {product.shortDescription || product.description}
            </p>

            {/* Divider */}
            <hr className="my-5 border-gray-100 dark:border-white/[0.06] sm:my-6" />

            {/* Colors */}
            {product.colors?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Color: <span className="font-semibold text-gray-900 dark:text-white">{selectedColor}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-200 sm:px-5 sm:py-2.5 sm:text-sm ${
                        selectedColor === color
                          ? 'border-primary-500 bg-primary-500/10 text-primary-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:bg-white/[0.06]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className={product.colors?.length > 0 ? 'mt-5' : ''}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Quantity</p>
              <div className="mt-2 inline-flex items-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-4 py-2.5 text-lg text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-bold text-gray-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="px-4 py-2.5 text-lg text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock || cartLoading}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-primary-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:py-4 sm:text-base"
              >
                <HiOutlineShoppingBag className="h-5 w-5" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={handleWishlist}
                className={`flex h-auto w-14 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 sm:w-16 ${
                  wishlisted
                    ? 'border-pink-500/30 bg-pink-500/10 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)]'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {wishlisted ? <HiHeart className="h-5 w-5" /> : <HiOutlineHeart className="h-5 w-5" />}
              </button>
            </div>

            {/* Assurance badges */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: HiOutlineTruck, label: 'Free Delivery', sub: 'On orders above ₹999' },
                { icon: HiOutlineShieldCheck, label: product.warranty || 'Warranty', sub: 'Brand warranty' },
                { icon: HiOutlineRefresh, label: '7 Day Returns', sub: 'Easy returns' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-3 text-center transition-colors hover:bg-gray-50 dark:bg-white/[0.04] sm:gap-1.5 sm:p-4"
                >
                  <item.icon className="h-5 w-5 text-primary-400 sm:h-6 sm:w-6" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 sm:text-xs">{item.label}</span>
                  <span className="hidden text-[10px] text-gray-500 sm:block">{item.sub}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ══════════════════ Tabs ══════════════════ */}
        <section className="mt-10 sm:mt-14 lg:mt-16">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-200 dark:border-white/10">
            {(['specs', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3.5 text-sm font-semibold transition-colors sm:px-8 sm:text-base ${
                  activeTab === tab
                    ? 'text-primary-400'
                    : 'text-gray-500 hover:text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab === 'specs' ? 'Specifications' : `Reviews (${product.numReviews})`}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6 sm:mt-8">
            {activeTab === 'specs' ? (
              /* ── Specifications Table ── */
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-sm">
                    <tbody>
                      {specEntries.map(([key, value], idx) => (
                        <tr
                          key={key}
                          className={`border-b border-gray-100 dark:border-white/[0.04] last:border-0 ${
                            idx % 2 === 0 ? 'bg-gray-50 dark:bg-white/[0.015]' : ''
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium capitalize text-gray-500 dark:text-gray-400 sm:w-2/5 sm:px-6">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          <td className="px-4 py-3.5 text-gray-900 dark:text-white sm:px-6">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ── Reviews ── */
              <div className="space-y-4 sm:space-y-5">
                {product.reviews?.length > 0 ? (
                  product.reviews.map((review) => (
                    <article key={review._id} className="glass-card-sm p-4 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-sm font-bold text-primary-400">
                          {review.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.user.name}</p>
                            <span
                              className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-white ${getRatingColor(review.rating)}`}
                            >
                              <HiStar className="h-3 w-3" /> {review.rating}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                        </div>
                      </div>
                      {review.title && (
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{review.title}</p>
                      )}
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{review.comment}</p>
                    </article>
                  ))
                ) : (
                  <div className="glass-card flex flex-col items-center py-14 text-center">
                    <p className="mt-3 text-sm text-gray-500">No reviews yet. Be the first to review!</p>
                  </div>
                )}

                {/* ── Review Form ── */}
                {isAuthenticated ? (
                  <div className="glass-card p-4 sm:p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Write a Review</h3>
                    <form onSubmit={handleSubmitReview} className="mt-5 space-y-5">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Rating
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-110"
                              aria-label={`Rate ${star} stars`}
                            >
                              <HiStar
                                className={`h-8 w-8 transition-colors ${
                                  star <= (hoverRating || reviewRating) ? 'text-amber-400' : 'text-gray-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="review-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Title <span className="normal-case tracking-normal text-gray-600">(optional)</span>
                        </label>
                        <input
                          id="review-title"
                          type="text"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          className="glass-input py-2.5 text-sm"
                          placeholder="Brief summary of your review"
                        />
                      </div>
                      <div>
                        <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Your Review
                        </label>
                        <textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="glass-input py-2.5 text-sm min-h-[100px] resize-none"
                          placeholder="Share your experience with this product..."
                          rows={4}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-primary-500 hover:shadow-glow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmittingReview ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Review'
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="glass-card-sm p-5 text-center">
                    <p className="text-sm text-gray-500">
                      <Link href="/login" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
                        Sign in
                      </Link>{' '}
                      to write a review
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════ Related Products ══════════════════ */}
        {related.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-center justify-between">
              <h2 className="section-title">You May Also Like</h2>
              <Link
                href="/products"
                className="hidden items-center gap-1 text-sm font-semibold text-primary-400 transition-colors hover:text-primary-300 sm:inline-flex"
              >
                View All <HiOutlineChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
