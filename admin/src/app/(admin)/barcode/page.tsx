'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Search, Package, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { barcodeService, BarcodeProduct } from '@/services/barcode.service';
import { productService } from '@/services/product.service';
import { formatCurrency, getInitials } from '@/lib/utils';
import type { Product } from '@/types';

const LIMIT = 15;

export default function BarcodePage() {
  // Lookup state
  const [query, setQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<BarcodeProduct | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Products table state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingTable(true);
    try {
      const res = await productService.getAll({ page, limit: LIMIT, search: search || undefined });
      setProducts(res.products);
      setTotalPages(res.totalPages);
      setTotalItems(res.totalProducts);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoadingTable(false);
    }
  }, [page, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [search]);

  const handleLookup = async () => {
    const code = query.trim();
    if (!code) return;
    setLooking(true);
    setLookupResult(null);
    setLookupError('');
    try {
      const result = await barcodeService.stockCheck(code);
      setLookupResult(result);
    } catch {
      setLookupError(`No product found for code: ${code}`);
    } finally {
      setLooking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  const handleRegenerate = async (productId: string) => {
    setRegeneratingId(productId);
    try {
      await barcodeService.regenerate(productId);
      toast.success('Barcode regenerated');
      loadProducts();
    } catch {
      toast.error('Failed to regenerate barcode');
    } finally {
      setRegeneratingId(null);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images?.[0] ? (
            <Image
              src={p.images[0]}
              alt={p.name}
              width={36}
              height={36}
              className="rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm text-foreground line-clamp-1">{p.name}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(p.price)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (p) => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
          {(p as any).sku || '—'}
        </code>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (p) => (
        <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono tracking-widest">
          {(p as any).barcode || '—'}
        </code>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => (
        <Badge variant={p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'destructive'}>
          {p.stock} units
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Link href={`/products/${p._id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button
            variant="outline"
            size="icon-sm"
            title="Regenerate barcode"
            disabled={regeneratingId === p._id}
            onClick={() => handleRegenerate(p._id)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regeneratingId === p._id ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Barcode & SKU"
        description="Look up products by barcode or SKU code, and manage product identifiers"
      />

      {/* Lookup tool */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Product Lookup</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Enter a barcode or SKU to look up the product and check stock. Works with barcode scanner input.
          </p>
          <div className="flex gap-2 max-w-lg">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan barcode or type SKU / barcode number..."
              className="font-mono"
              autoFocus
            />
            <Button onClick={handleLookup} disabled={looking || !query.trim()}>
              {looking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Lookup</span>
            </Button>
            {(lookupResult || lookupError) && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => { setLookupResult(null); setLookupError(''); setQuery(''); inputRef.current?.focus(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Result */}
          {lookupError && (
            <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {lookupError}
            </div>
          )}
          {lookupResult && (
            <div className="mt-4 border border-border rounded-lg p-4 max-w-lg">
              <div className="flex items-start gap-4">
                {lookupResult.images?.[0] ? (
                  <Image
                    src={lookupResult.images[0]}
                    alt={lookupResult.name}
                    width={64}
                    height={64}
                    className="rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{lookupResult.name}</p>
                      {lookupResult.category && (
                        <p className="text-xs text-muted-foreground">{lookupResult.category.name}</p>
                      )}
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">SKU</span>
                      <code className="font-mono text-xs">{lookupResult.sku}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Barcode</span>
                      <code className="font-mono text-xs tracking-widest">{lookupResult.barcode}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Price</span>
                      <span className="font-semibold">{formatCurrency(lookupResult.price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Stock</span>
                      <Badge variant={lookupResult.stock > 10 ? 'success' : lookupResult.stock > 0 ? 'warning' : 'destructive'}>
                        {lookupResult.stock} units
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link href={`/products/${lookupResult._id}/edit`}>
                      <Button size="sm" variant="outline">Go to Product</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All products with barcodes table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loadingTable}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products..."
        rowKey={(p) => p._id}
      />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={LIMIT}
      />
    </div>
  );
}
