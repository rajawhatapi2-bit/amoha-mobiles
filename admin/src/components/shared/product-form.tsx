'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { MultiImageUploader } from '@/components/shared/image-uploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productService } from '@/services/product.service';
import { categoryService } from '@/services/category.service';
import { brandService } from '@/services/brand.service';
import type { Category, Brand } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().min(5, 'Short description required'),
  price: z.coerce.number().min(1, 'Price must be > 0'),
  originalPrice: z.coerce.number().min(1, 'Original price must be > 0'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  warranty: z.string().optional(),
  tags: z.string().optional(),
  colors: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

interface Props { productId?: string }

export function ProductForm({ productId }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isFeatured: false, isTrending: false },
  });

  useEffect(() => {
    Promise.all([categoryService.getAll(), brandService.getAll()]).then(([cats, brds]) => {
      setCategories(cats); setBrands(brds);
    });
    if (productId) {
      productService.getById(productId).then((p) => {
        setValue('name', p.name);
        setValue('brand', typeof p.brand === 'object' ? p.brand.name : p.brand);
        setValue('category', typeof p.category === 'object' ? p.category.slug : p.category);
        setValue('description', p.description);
        setValue('shortDescription', p.shortDescription);
        setValue('price', p.price);
        setValue('originalPrice', p.originalPrice);
        setValue('stock', p.stock);
        setValue('warranty', p.warranty || '');
        setValue('tags', p.tags.join(', '));
        setValue('colors', p.colors.join(', '));
        setValue('isFeatured', p.isFeatured);
        setValue('isTrending', p.isTrending);
        setExistingImages(p.images);
        const specEntries = Object.entries(p.specifications).map(([key, value]) => ({ key, value: String(value) }));
        setSpecs(specEntries.length ? specEntries : [{ key: '', value: '' }]);
      });
    }
  }, [productId, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const specsObj = Object.fromEntries(specs.filter((s) => s.key).map((s) => [s.key, s.value]));
      const discount = data.originalPrice > 0
        ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100)
        : 0;

      const payload: any = {
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        brand: data.brand,
        category: data.category,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        originalPrice: data.originalPrice,
        discount: Math.max(0, discount),
        stock: data.stock,
        specifications: specsObj,
        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        colors: data.colors ? data.colors.split(',').map((c: string) => c.trim()).filter(Boolean) : [],
        isFeatured: data.isFeatured,
        isTrending: data.isTrending,
        warranty: data.warranty || '',
        images: existingImages.length > 0 ? existingImages : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop'],
        thumbnail: existingImages[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop',
      };

      if (productId) {
        await productService.update(productId, payload);
        toast.success('Product updated successfully');
      } else {
        await productService.create(payload);
        toast.success('Product created successfully');
      }
      router.push('/products');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title={productId ? 'Edit Product' : 'Add Product'} description={productId ? 'Update product details' : 'Create a new product listing'}>
        <Link href="/products"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input label="Product Name" placeholder="e.g. Samsung Galaxy S24 Ultra" error={errors.name?.message} {...register('name')} />
                <Textarea label="Description" placeholder="Full product description..." rows={4} error={errors.description?.message} {...register('description')} />
                <Textarea label="Short Description" placeholder="Brief summary..." rows={2} error={errors.shortDescription?.message} {...register('shortDescription')} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Brand</label>
                    <Select onValueChange={(v) => setValue('brand', v)} value={watch('brand')}>
                      <SelectTrigger error={errors.brand?.message}><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                    <Select onValueChange={(v) => setValue('category', v)} value={watch('category')}>
                      <SelectTrigger error={errors.category?.message}><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c._id} value={c.slug}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Sale Price (₹)" type="number" error={errors.price?.message} {...register('price')} />
                  <Input label="Original Price (₹)" type="number" error={errors.originalPrice?.message} {...register('originalPrice')} />
                  <Input label="Stock Quantity" type="number" error={errors.stock?.message} {...register('stock')} />
                </div>
                <Input label="Tags (comma separated)" placeholder="smartphone, 5g, flagship" {...register('tags')} />
                <Input label="Colors (comma separated)" placeholder="Black, Silver, Gold" {...register('colors')} />
                <Input label="Warranty" placeholder="e.g. 1 Year, 6 Months" {...register('warranty')} />
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Specifications</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSpecs((p) => [...p, { key: '', value: '' }])}>
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {specs.map((spec, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="e.g. RAM" value={spec.key} onChange={(e) => setSpecs((p) => p.map((s, idx) => idx === i ? { ...s, key: e.target.value } : s))} />
                    <Input placeholder="e.g. 8GB" value={spec.value} onChange={(e) => setSpecs((p) => p.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setSpecs((p) => p.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Product Images</CardTitle></CardHeader>
              <CardContent>
                <MultiImageUploader
                  value={existingImages}
                  onChange={setExistingImages}
                  folder="products"
                  max={10}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Featured</p>
                    <p className="text-xs text-muted-foreground">Show on homepage</p>
                  </div>
                  <Switch checked={watch('isFeatured')} onCheckedChange={(v) => setValue('isFeatured', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Trending</p>
                    <p className="text-xs text-muted-foreground">Show in trending section</p>
                  </div>
                  <Switch checked={watch('isTrending')} onCheckedChange={(v) => setValue('isTrending', v)} />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              {productId ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
