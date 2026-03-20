'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HiOutlineShoppingBag, HiOutlineHeart, HiOutlineUser, HiOutlineMenu, HiOutlineX, HiOutlineSearch, HiOutlineClipboardList, HiOutlineLogout, HiOutlineCollection, HiOutlineCog } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useSettingsStore } from '@/store/settings.store';
import SearchBar from '@/components/ui/SearchBar';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalItems } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const siteName = settings?.siteName || 'AMOHA';
  const tagline = settings?.tagline || 'Explore Plus';
  const announcement = settings?.isAnnouncementActive && settings?.announcement
    ? settings.announcement
    : `Free shipping on orders above Rs.${settings?.freeDeliveryAbove ?? 999}`;
  const contactPhone = settings?.contactPhone || '+91 98765 43210';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-2xl dark:border-white/5 dark:bg-primary-950/95">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-gray-50/80 dark:border-white/5 dark:bg-primary-950/80">
        <div className="page-container flex items-center justify-between py-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{announcement}</span>
          <span className="hidden sm:inline">Support: {contactPhone}</span>
        </div>
      </div>

      {/* Main header */}
      <div className="page-container">
        <div className="flex h-14 items-center gap-4 sm:h-16">
          {/* Logo */}
          <Link href="/" prefetch={true} className="flex flex-shrink-0 items-center gap-2">
            {settings?.logo ? (
              <img src={settings.logo} alt={siteName} className="h-9 w-9 rounded-xl object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 font-bold text-white shadow-glow">
                {siteName.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {siteName}<span className="text-primary-400">.</span>
              </span>
              <p className="text-[10px] -mt-1 font-medium italic text-gray-500 dark:text-gray-400">{tagline.split(' ').map((w, i) => i === tagline.split(' ').length - 1 ? <span key={i} className="text-primary-400">{w}</span> : w + ' ')}</p>
            </div>
          </Link>

          {/* Desktop search */}
          <div className="hidden flex-1 max-w-xl lg:block">
            <SearchBar />
          </div>

          {/* Nav actions */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white lg:hidden"
            >
              <HiOutlineSearch className="h-5 w-5" />
            </button>

            {/* Products */}
            <Link
              href="/products"
              prefetch={true}
              className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/products' || pathname.startsWith('/products?')
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <HiOutlineCollection className="h-4 w-4" />
              <span className="hidden md:inline">Products</span>
            </Link>

            {/* Services */}
            <Link
              href="/services"
              prefetch={true}
              className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/services'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <HiOutlineCog className="h-4 w-4" />
              <span className="hidden md:inline">Services</span>
            </Link>

            {/* Orders */}
            <Link
              href="/orders"
              prefetch={true}
              className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                pathname === '/orders'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <HiOutlineClipboardList className="h-4 w-4" />
              <span className="hidden md:inline">Orders</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Wishlist */}
            <Link
              href="/wishlist"
              prefetch={true}
              className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <HiOutlineHeart className="h-5 w-5" />
              {wishlistItems.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              prefetch={true}
              className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <HiOutlineShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white sm:px-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden text-sm font-medium md:inline">{user?.name?.split(' ')[0] || 'Account'}</span>
                  </button>

                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-surface-100/95 dark:shadow-glass dark:backdrop-blur-xl">
                        <div className="border-b border-gray-100 p-3 dark:border-white/5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
                            <HiOutlineUser className="h-4 w-4" /> My Profile
                          </Link>
                          <Link href="/orders" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
                            <HiOutlineClipboardList className="h-4 w-4" /> My Orders
                          </Link>
                          <Link href="/wishlist" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
                            <HiOutlineHeart className="h-4 w-4" /> My Wishlist
                          </Link>
                        </div>
                        <div className="border-t border-gray-100 py-1 dark:border-white/5">
                          <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                            <HiOutlineLogout className="h-4 w-4" /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white sm:px-3"
                >
                  <HiOutlineUser className="h-5 w-5" />
                  <span className="hidden md:inline">Login</span>
                </Link>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white sm:hidden"
            >
              {isMobileMenuOpen ? <HiOutlineX className="h-5 w-5" /> : <HiOutlineMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {isSearchOpen && (
          <div className="border-t border-gray-100 py-3 dark:border-white/5 lg:hidden animate-slide-down">
            <SearchBar onSelect={() => setIsSearchOpen(false)} />
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white/95 backdrop-blur-xl dark:border-white/5 dark:bg-surface-50/95 sm:hidden animate-slide-down">
          <nav className="page-container flex flex-col py-3">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
              Home
            </Link>
            <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/products' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
              Products
            </Link>
            <Link href="/services" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/services' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
              Services
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/orders" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/orders' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
                  My Orders
                </Link>
                <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/wishlist' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
                  My Wishlist
                </Link>
                <Link href="/cart" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/cart' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
                  Cart {totalItems > 0 && `(${totalItems})`}
                </Link>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-medium transition-all ${pathname === '/profile' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}>
                  My Profile
                </Link>
                <div className="mt-2 border-t border-gray-100 pt-2 dark:border-white/5">
                  <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-500 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-2 border-t border-gray-100 pt-2 dark:border-white/5">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-4 py-3 text-sm font-medium text-primary-600 transition-all hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10">
                  Login / Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
