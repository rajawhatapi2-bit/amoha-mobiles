'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HiOutlineArrowRight, HiOutlineTruck, HiOutlineShieldCheck, HiOutlineRefresh, HiOutlineChevronLeft, HiOutlineChevronRight, HiX } from 'react-icons/hi';
import { HiOutlineBolt } from 'react-icons/hi2';
import type { Product, Banner, Category } from '@/types';
import { productService } from '@/services/product.service';
import { categoryService, bannerService } from '@/services/category.service';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import ProductCard from '@/components/ui/ProductCard';
import { ProductGridSkeleton, BannerSkeleton } from '@/components/ui/Skeletons';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [featuredRes, trendingRes, bannersRes, categoriesRes, newArrivalsRes] = await Promise.allSettled([
          productService.getFeatured(),
          productService.getTrending(),
          bannerService.getAll(),
          categoryService.getAll(),
          productService.getAll({ sort: 'newest', limit: 8 }),
        ]);
        if (featuredRes.status === 'fulfilled') setFeaturedProducts(featuredRes.value);
        if (trendingRes.status === 'fulfilled') setTrendingProducts(trendingRes.value);
        if (bannersRes.status === 'fulfilled') setBanners(bannersRes.value);
        if (categoriesRes.status === 'fulfilled') setCategories(categoriesRes.value);
        if (newArrivalsRes.status === 'fulfilled') setNewArrivals(newArrivalsRes.value.products);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    fetchSettings();
    if (isAuthenticated) {
      fetchCart();
      fetchWishlist();
    }
  }, [fetchCart, fetchWishlist, isAuthenticated]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Show popup after 3 seconds if enabled and not dismissed this session
  useEffect(() => {
    if (!settings?.popup?.isActive || !settings.popup.title) return;
    const dismissed = sessionStorage.getItem('popup_dismissed');
    if (dismissed) return;
    const timer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(timer);
  }, [settings?.popup?.isActive, settings?.popup?.title]);

  const dismissPopup = () => {
    setShowPopup(false);
    sessionStorage.setItem('popup_dismissed', '1');
  };

  const features = [
    { icon: HiOutlineBolt, title: 'Fast Delivery', desc: 'Within 2-3 days' },
    { icon: HiOutlineShieldCheck, title: 'Warranty', desc: 'Product warranty included' },
    { icon: HiOutlineTruck, title: 'Free Shipping', desc: 'On orders above Rs.999' },
    { icon: HiOutlineRefresh, title: 'Easy Returns', desc: '7 day return policy' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--background)]">
      {/* Hero Banner */}
      <section className="bg-gray-50 dark:bg-surface-50">
        <div className="page-container py-3 sm:py-5">
          {isLoading ? (
            <BannerSkeleton />
          ) : banners.length > 0 ? (
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
              <div className="relative aspect-[16/7] sm:aspect-[21/8]">
                <Image
                  src={banners[activeBanner]?.image || '/placeholder-banner.jpg'}
                  alt={banners[activeBanner]?.title || 'Banner'}
                  fill
                  priority
                  className="object-cover transition-opacity duration-500"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="px-4 sm:px-8 lg:px-12">
                    <h1 className="max-w-md text-xl font-bold text-white sm:max-w-lg sm:text-3xl lg:text-4xl lg:leading-tight">
                      {banners[activeBanner]?.title}
                    </h1>
                    {banners[activeBanner]?.subtitle && (
                      <p className="mt-1.5 max-w-sm text-xs text-white/80 sm:text-sm">
                        {banners[activeBanner]?.subtitle}
                      </p>
                    )}
                    <Link
                      href="/products"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-100 sm:mt-4 sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Shop Now <HiOutlineArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveBanner((prev) => (prev - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-700 transition hover:bg-white sm:h-9 sm:w-9"
                  >
                    <HiOutlineChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveBanner((prev) => (prev + 1) % banners.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-700 transition hover:bg-white sm:h-9 sm:w-9"
                  >
                    <HiOutlineChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveBanner(idx)}
                        className={`h-1.5 rounded-full transition-all ${idx === activeBanner ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 sm:rounded-2xl sm:p-10 lg:p-14">
              <div className="relative max-w-lg">
                <h1 className="text-2xl font-bold text-white sm:text-4xl lg:text-5xl">
                  Premium Smartphones
                </h1>
                <p className="mt-2 text-sm text-white/70 sm:text-base">
                  Explore the latest smartphones at the best prices with fast delivery.
                </p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
                >
                  Shop Now <HiOutlineArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-y border-gray-100 dark:border-white/5">
        <div className="page-container grid grid-cols-2 gap-3 py-3 sm:py-4 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <feature.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-800 dark:text-white sm:text-sm">{feature.title}</p>
                <p className="truncate text-[10px] text-gray-400 sm:text-xs">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="py-6 sm:py-8">
          <div className="page-container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Shop by Category</h2>
            </div>
            {/* Mobile/tablet: horizontal scroll | Desktop: grid */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 lg:grid lg:grid-cols-5 xl:grid-cols-6 lg:overflow-visible lg:pb-0">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/products?category=${cat.slug}`}
                  className="group flex flex-shrink-0 lg:flex-shrink items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all hover:border-primary-200 hover:shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-primary-500/30"
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50 dark:bg-white/5">
                    <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="40px" />
                  </div>
                  <div className="min-w-0">
                    <p className="whitespace-nowrap lg:whitespace-normal lg:truncate text-sm font-medium text-gray-700 group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400">
                      {cat.name}
                    </p>
                    {cat.productCount > 0 && (
                      <p className="text-[10px] text-gray-400">{cat.productCount} products</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {!isLoading && featuredProducts.length > 0 && (
        <section className="py-6 sm:py-8 border-t border-gray-50 dark:border-white/5">
          <div className="page-container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Featured Deals</h2>
              <Link href="/products?sort=popular" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 sm:text-sm">
                View All
              </Link>
            </div>
            {/* Mobile/tablet: horizontal scroll | Desktop: responsive grid */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible lg:pb-0">
              {featuredProducts.slice(0, 8).map((product) => (
                <div key={product._id} className="w-[160px] flex-shrink-0 sm:w-[190px] lg:w-auto">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promotional Banner */}
      {settings?.promoBanner?.isActive && settings.promoBanner.image && (
        <section className="py-4 sm:py-6">
          <div className="page-container">
            <Link href={settings.promoBanner.link || '/products'} className="block overflow-hidden rounded-xl sm:rounded-2xl">
              <div className="relative aspect-[21/6] sm:aspect-[21/5]">
                <Image
                  src={settings.promoBanner.image}
                  alt="Promotional Banner"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="100vw"
                />
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Trending */}
      {!isLoading && trendingProducts.length > 0 && (
        <section className="py-6 sm:py-8 border-t border-gray-50 dark:border-white/5">
          <div className="page-container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Trending Now</h2>
              <Link href="/products?sort=popular" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 sm:text-sm">
                View All
              </Link>
            </div>
            {/* Mobile/tablet: horizontal scroll | Desktop: responsive grid */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible lg:pb-0">
              {trendingProducts.slice(0, 8).map((product) => (
                <div key={product._id} className="w-[160px] flex-shrink-0 sm:w-[190px] lg:w-auto">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Discover More */}
      <section className="py-6 sm:py-8 border-t border-gray-50 dark:border-white/5">
        <div className="page-container">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Discover More</h2>
            <p className="mt-0.5 text-xs text-gray-400">Find the latest releases, offers and exclusives right here</p>
          </div>
          {settings?.discoverBanners && settings.discoverBanners.filter((b: any) => b.isActive).length > 0 ? (
            (() => {
              const active = settings.discoverBanners
                .filter((b: any) => b.isActive)
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                .slice(0, 4);
              const [first, second, third, fourth] = active;
              return (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3 sm:grid-rows-2" style={{ minHeight: '420px' }}>
                  {/* Large left banner */}
                  {first && (
                    <Link
                      href={first.link || '/products'}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl sm:col-span-1 sm:row-span-2"
                      style={{ minHeight: '200px' }}
                    >
                      <Image src={first.image} alt={first.title || 'Discover'} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {first.title && (
                        <div className="absolute bottom-4 left-4">
                          <p className="text-base font-bold text-white sm:text-lg lg:text-xl">{first.title}</p>
                        </div>
                      )}
                    </Link>
                  )}
                  {/* Wide top-right banner */}
                  {second && (
                    <Link
                      href={second.link || '/products'}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl sm:col-span-2 sm:row-span-1"
                      style={{ minHeight: '180px' }}
                    >
                      <Image src={second.image} alt={second.title || 'Discover'} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 66vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {second.title && (
                        <div className="absolute bottom-3 left-4">
                          <p className="text-sm font-semibold text-white">{second.title}</p>
                        </div>
                      )}
                    </Link>
                  )}
                  {/* Bottom two smaller banners */}
                  {third && (
                    <Link
                      href={third.link || '/products'}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl sm:col-span-1 sm:row-span-1"
                      style={{ minHeight: '160px' }}
                    >
                      <Image src={third.image} alt={third.title || 'Discover'} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {third.title && (
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs font-semibold text-white sm:text-sm">{third.title}</p>
                        </div>
                      )}
                    </Link>
                  )}
                  {fourth && (
                    <Link
                      href={fourth.link || '/products'}
                      className="group relative overflow-hidden rounded-xl sm:rounded-2xl sm:col-span-1 sm:row-span-1"
                      style={{ minHeight: '160px' }}
                    >
                      <Image src={fourth.image} alt={fourth.title || 'Discover'} fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {fourth.title && (
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs font-semibold text-white sm:text-sm">{fourth.title}</p>
                        </div>
                      )}
                    </Link>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3 sm:grid-rows-2" style={{ minHeight: '420px' }}>
              <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-white/5 sm:col-span-1 sm:row-span-2" style={{ minHeight: '200px' }} />
              <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-white/5 sm:col-span-2 sm:row-span-1" style={{ minHeight: '180px' }} />
              <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-white/5 sm:col-span-1 sm:row-span-1" style={{ minHeight: '160px' }} />
              <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-white/5 sm:col-span-1 sm:row-span-1" style={{ minHeight: '160px' }} />
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals Grid */}
      {!isLoading && newArrivals.length > 0 && (
        <section className="py-6 sm:py-10 border-t border-gray-50 dark:border-white/5">
          <div className="page-container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">New Arrivals</h2>
              <Link href="/products?sort=newest" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 sm:text-sm">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {newArrivals.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-500"
              >
                Explore All Products <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {isLoading && (
        <section className="py-8">
          <div className="page-container">
            <ProductGridSkeleton count={8} />
          </div>
        </section>
      )}

      {/* Popup Modal */}
      {showPopup && settings?.popup?.isActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={dismissPopup}>
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl animate-fade-in"
            style={{ backgroundColor: settings.popup.bgColor || '#1a1a2e' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismissPopup}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/40"
            >
              <HiX className="h-5 w-5" />
            </button>
            {settings.popup.image && (
              <div className="relative aspect-[16/10] w-full">
                <Image src={settings.popup.image} alt={settings.popup.title || 'Offer'} fill className="object-cover" sizes="(max-width: 448px) 100vw, 448px" />
              </div>
            )}
            <div className="p-5 sm:p-6 text-center">
              {settings.popup.title && (
                <h3 className="text-xl font-bold text-white sm:text-2xl">{settings.popup.title}</h3>
              )}
              {settings.popup.subtitle && (
                <p className="mt-1 text-sm font-medium text-primary-400">{settings.popup.subtitle}</p>
              )}
              {settings.popup.description && (
                <p className="mt-2 text-sm text-gray-300">{settings.popup.description}</p>
              )}
              {settings.popup.buttonText && (
                <Link
                  href={settings.popup.buttonLink || '/products'}
                  onClick={dismissPopup}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
                >
                  {settings.popup.buttonText} <HiOutlineArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
