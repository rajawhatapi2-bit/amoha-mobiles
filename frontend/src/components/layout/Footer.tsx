'use client';
import Link from 'next/link';
import { HiOutlineMail, HiOutlinePhone, HiOutlineLocationMarker } from 'react-icons/hi';
import { useSettingsStore } from '@/store/settings.store';

const footerLinks = {
  shop: [
    { label: 'All Mobiles', href: '/products' },
    { label: 'Featured', href: '/products?sort=popular' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Repair Services', href: '/services' },
  ],
  account: [
    { label: 'My Profile', href: '/profile' },
    { label: 'My Orders', href: '/orders' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Contact Us', href: '/contact' },
  ],
  policies: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Return Policy', href: '/return-policy' },
    { label: 'Shipping Info', href: '/shipping-info' },
  ],
};

export default function Footer() {
  const { settings } = useSettingsStore();
  const siteName = settings?.siteName || 'AMOHA';
  const contactEmail = settings?.contactEmail || 'support@amoha.com';
  const contactPhone = settings?.contactPhone || '+91 98765 43210';
  const address = settings?.address || 'Mumbai, India';

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-surface-50">
      <div className="page-container py-10 lg:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" prefetch={true} className="flex items-center gap-2">
              {settings?.logo ? (
                <img src={settings.logo} alt={siteName} className="h-9 w-9 rounded-xl object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 font-bold text-white">
                  {siteName.charAt(0)}
                </div>
              )}
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {siteName}<span className="text-primary-400">.</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Your premium destination for the latest smartphones at unbeatable prices with fast delivery.
            </p>
            <div className="mt-5 space-y-2.5">
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-400">
                <HiOutlineMail className="h-4 w-4" />
                {contactEmail}
              </a>
              <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-400">
                <HiOutlinePhone className="h-4 w-4" />
                {contactPhone}
              </a>
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <HiOutlineLocationMarker className="h-4 w-4 flex-shrink-0" />
                {address}
              </span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Shop</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} prefetch={true} className="text-sm text-gray-500 transition-colors hover:text-primary-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Account</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={true} className="text-sm text-gray-500 transition-colors hover:text-primary-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Policies</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.policies.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} prefetch={true} className="text-sm text-gray-500 transition-colors hover:text-primary-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-white/5 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-600">
            &copy; {new Date().getFullYear()} {siteName} Mobiles. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">Powered by Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
