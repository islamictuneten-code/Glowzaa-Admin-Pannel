import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  limit,
  serverTimestamp,
  runTransaction,
  writeBatch,
  DocumentReference,
  DocumentSnapshot
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Product, 
  CategoryDoc, 
  SubCategory, 
  InventoryTransaction, 
  AuthUser, 
  Customer, 
  Order, 
  OrderItem, 
  OrderStatus, 
  DeliveryStatus,
  PaymentStatus,
  Payment,
  CustomerLedgerEntry,
  DeliveryHistoryEntry,
  CashHandover,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethodOption,
  PaymentTypeOption,
  LedgerTransactionType,
  CompanySettings,
  FieldDutySession,
  GpsLocationPing,
  CustomerVisit,
  FieldDutyStatus,
  CustomerVisitOutcome
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes any keys with value `undefined` from an object before sending to Firestore updateDoc / setDoc / Transaction.set.
 * Firestore throws an error if any field in the write payload is `undefined`.
 */
export function cleanUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => (item && typeof item === 'object' && !(item instanceof Date) ? cleanUndefined(item) : item)) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanUndefined(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

// Default 9 Initial Categories requested by user
export const INITIAL_CATEGORIES_DATA: Omit<CategoryDoc, 'id'>[] = [
  {
    name: 'Makeup & Cosmetics',
    slug: 'makeup-and-cosmetics',
    description: 'Lipsticks, foundations, eyeliners, compact powders, and professional makeup palettes.',
    status: 'active',
    order: 1,
    subCategories: [
      { id: 'sub-lip', name: 'Lips (Lipstick & Lip Gloss)', slug: 'lips', status: 'active' },
      { id: 'sub-face', name: 'Face (Foundation & Concealer)', slug: 'face', status: 'active' },
      { id: 'sub-eyes', name: 'Eyes (Mascara, Kajal & Liner)', slug: 'eyes', status: 'active' },
      { id: 'sub-palettes', name: 'Palettes & Highlighters', slug: 'palettes', status: 'active' }
    ]
  },
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Serums, moisturizers, cleansers, toners, sunscreens, and anti-aging treatments.',
    status: 'active',
    order: 2,
    subCategories: [
      { id: 'sub-serum', name: 'Face Serums & Ampoules', slug: 'serums', status: 'active' },
      { id: 'sub-moist', name: 'Moisturizers & Night Creams', slug: 'moisturizers', status: 'active' },
      { id: 'sub-cleanser', name: 'Facewash & Cleansing Foams', slug: 'cleansers', status: 'active' },
      { id: 'sub-sun', name: 'Sunscreens (SPF 50+)', slug: 'sunscreens', status: 'active' }
    ]
  },
  {
    name: 'Hair Care',
    slug: 'hair-care',
    description: 'Shampoos, conditioners, hair oils, hair masks, and scalp care essentials.',
    status: 'active',
    order: 3,
    subCategories: [
      { id: 'sub-shampoo', name: 'Shampoos & Conditioners', slug: 'shampoos', status: 'active' },
      { id: 'sub-hairoil', name: 'Hair Oils & Serums', slug: 'hair-oils', status: 'active' },
      { id: 'sub-hairmask', name: 'Hair Spa & Repair Masks', slug: 'hair-masks', status: 'active' }
    ]
  },
  {
    name: 'Hair Accessories',
    slug: 'hair-accessories',
    description: 'Hair clips, scrunchies, headbands, claws, bobby pins, and styling ribbons.',
    status: 'active',
    order: 4,
    subCategories: [
      { id: 'sub-clips', name: 'Hair Clips & Claws', slug: 'hair-clips', status: 'active' },
      { id: 'sub-scrunchies', name: 'Silk Scrunchies & Bands', slug: 'scrunchies', status: 'active' },
      { id: 'sub-headbands', name: 'Fashion Headbands', slug: 'headbands', status: 'active' }
    ]
  },
  {
    name: 'Fashion Accessories',
    slug: 'fashion-accessories',
    description: 'Jewelry, sunglasses, cosmetic organizer pouches, handbags, and beauty tools.',
    status: 'active',
    order: 5,
    subCategories: [
      { id: 'sub-pouches', name: 'Cosmetic Travel Pouches', slug: 'pouches', status: 'active' },
      { id: 'sub-brushes', name: 'Makeup Brush Sets & Sponges', slug: 'brushes', status: 'active' },
      { id: 'sub-mirrors', name: 'LED Compact Mirrors', slug: 'mirrors', status: 'active' }
    ]
  },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Body lotions, body washes, deodorants, intimate hygiene, and hand creams.',
    status: 'active',
    order: 6,
    subCategories: [
      { id: 'sub-bodylotion', name: 'Body Lotions & Butters', slug: 'body-lotions', status: 'active' },
      { id: 'sub-showergel', name: 'Shower Gels & Body Washes', slug: 'shower-gels', status: 'active' },
      { id: 'sub-handcare', name: 'Hand & Foot Creams', slug: 'hand-creams', status: 'active' }
    ]
  },
  {
    name: 'Kids Products',
    slug: 'kids-products',
    description: 'Gentle baby washes, baby lotions, kids hair detanglers, and gentle accessories.',
    status: 'active',
    order: 7,
    subCategories: [
      { id: 'sub-babywash', name: 'Baby Shampoo & Wash', slug: 'baby-wash', status: 'active' },
      { id: 'sub-babylotion', name: 'Gentle Baby Moisturizer', slug: 'baby-lotion', status: 'active' }
    ]
  },
  {
    name: 'Gift & Lifestyle',
    slug: 'gift-and-lifestyle',
    description: 'Curated skincare gift boxes, festive wholesale combos, and aroma diffusers.',
    status: 'active',
    order: 8,
    subCategories: [
      { id: 'sub-giftbox', name: 'Luxury Beauty Gift Boxes', slug: 'gift-boxes', status: 'active' },
      { id: 'sub-combos', name: 'B2B Retail Combos', slug: 'retail-combos', status: 'active' }
    ]
  },
  {
    name: 'Other Products',
    slug: 'other-products',
    description: 'Packaging materials, display stands, testers, and miscellaneous wholesale supplies.',
    status: 'active',
    order: 9,
    subCategories: [
      { id: 'sub-testers', name: 'Retail Counter Testers', slug: 'testers', status: 'active' },
      { id: 'sub-packaging', name: 'B2B Wholesale Packaging', slug: 'packaging', status: 'active' }
    ]
  }
];

// Initial starter products for Glowzaa B2B catalog
export const INITIAL_PRODUCTS_DATA: Omit<Product, 'id'>[] = [
  {
    name: 'Glowzaa Velvet Matte Liquid Lipstick - Crimson Velvet',
    sku: 'GZ-LIP-001',
    category: 'Makeup & Cosmetics',
    subCategory: 'Lips (Lipstick & Lip Gloss)',
    brand: 'Glowzaa Cosmetics',
    brandName: 'Glowzaa Cosmetics',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=80',
    description: 'Ultra-pigmented 16-hour long-wear waterproof matte liquid lipstick with vitamin E and jojoba oil.',
    status: 'active',
    stockStatus: 'in_stock',
    purchasePrice: 280,
    wholesalePrice: 420,
    mrp: 650,
    minSellingPrice: 400,
    openingStock: 120,
    currentStock: 95,
    lowStockThreshold: 20,
    unit: 'piece',
    barcode: '894110023401',
    size: '6ml',
    color: '#9E1B32 Crimson',
    variant: 'Matte Liquid'
  },
  {
    name: 'Glowzaa 10% Niacinamide + Zinc 1% Clarifying Serum',
    sku: 'GZ-SKN-101',
    category: 'Skincare',
    subCategory: 'Face Serums & Ampoules',
    brand: 'Glowzaa Derma Care',
    brandName: 'Glowzaa Derma Care',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80',
    description: 'High-strength vitamin and mineral blemish formula for pore minimizing and sebum balance.',
    status: 'active',
    stockStatus: 'in_stock',
    purchasePrice: 450,
    wholesalePrice: 650,
    mrp: 950,
    minSellingPrice: 620,
    openingStock: 80,
    currentStock: 64,
    lowStockThreshold: 15,
    unit: 'piece',
    barcode: '894110023402',
    size: '30ml'
  },
  {
    name: 'Glowzaa Hyaluronic Acid Deep Moisture Gel Cream',
    sku: 'GZ-SKN-102',
    category: 'Skincare',
    subCategory: 'Moisturizers & Night Creams',
    brand: 'Glowzaa Derma Care',
    brandName: 'Glowzaa Derma Care',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&auto=format&fit=crop&q=80',
    description: 'Oil-free lightweight 72-hour moisture surge water gel with 5 multi-molecular hyaluronic acids.',
    status: 'active',
    stockStatus: 'in_stock',
    purchasePrice: 380,
    wholesalePrice: 550,
    mrp: 850,
    minSellingPrice: 520,
    openingStock: 60,
    currentStock: 42,
    lowStockThreshold: 15,
    unit: 'piece',
    barcode: '894110023403',
    size: '50g'
  },
  {
    name: 'Glowzaa Onion & Biotin Anti-Hair Fall Shampoo',
    sku: 'GZ-HR-201',
    category: 'Hair Care',
    subCategory: 'Shampoos & Conditioners',
    brand: 'Glowzaa Organics',
    brandName: 'Glowzaa Organics',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80',
    description: 'Sulfate & paraben free herbal red onion extract shampoo infused with plant keratin.',
    status: 'active',
    stockStatus: 'low_stock',
    purchasePrice: 220,
    wholesalePrice: 340,
    mrp: 520,
    minSellingPrice: 320,
    openingStock: 50,
    currentStock: 8,
    lowStockThreshold: 12,
    unit: 'piece',
    barcode: '894110023404',
    size: '300ml'
  },
  {
    name: 'Glowzaa Premium Mulberry Silk Scrunchie Set (Pack of 3)',
    sku: 'GZ-ACC-301',
    category: 'Hair Accessories',
    subCategory: 'Silk Scrunchies & Bands',
    brand: 'Glowzaa Luxe',
    brandName: 'Glowzaa Luxe',
    image: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=500&auto=format&fit=crop&q=80',
    description: '100% 22-Momme pure Grade 6A mulberry silk hair ties prevents frizz, creasing and breakage.',
    status: 'active',
    stockStatus: 'in_stock',
    purchasePrice: 160,
    wholesalePrice: 260,
    mrp: 450,
    minSellingPrice: 240,
    openingStock: 150,
    currentStock: 110,
    lowStockThreshold: 25,
    unit: 'pack',
    barcode: '894110023405',
    color: 'Rose Gold / Champagne / Pearl'
  },
  {
    name: 'Glowzaa Rose & Argan Oil Deep Hydration Body Lotion',
    sku: 'GZ-PC-401',
    category: 'Personal Care',
    subCategory: 'Body Lotions & Butters',
    brand: 'Glowzaa Botanicals',
    brandName: 'Glowzaa Botanicals',
    image: 'https://images.unsplash.com/photo-1608248597359-0027f3c4db96?w=500&auto=format&fit=crop&q=80',
    description: 'Fast-absorbing non-greasy body lotion with Bulgarian rose water and Moroccan cold-pressed argan oil.',
    status: 'active',
    stockStatus: 'in_stock',
    purchasePrice: 290,
    wholesalePrice: 420,
    mrp: 650,
    minSellingPrice: 400,
    openingStock: 75,
    currentStock: 52,
    lowStockThreshold: 15,
    unit: 'piece',
    barcode: '894110023406',
    size: '400ml'
  }
];

// Helper to compute stock status
export function getStockStatus(currentStock: number, lowStockThreshold: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

// -------------------------------------------------------------
// 1. CATEGORY SERVICE
// -------------------------------------------------------------

export async function seedInitialCategoriesIfEmpty(): Promise<void> {
  try {
    const categoriesRef = collection(db, 'categories');
    const snap = await getDocs(categoriesRef);
    if (snap.empty) {
      console.log('Seeding initial categories into Firestore...');
      const batch = writeBatch(db);
      for (const cat of INITIAL_CATEGORIES_DATA) {
        const docId = `cat-${cat.slug}`;
        const newDocRef = doc(categoriesRef, docId);
        batch.set(newDocRef, {
          ...cat,
          id: docId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Categories seeded successfully.');
    } else {
      // Check if duplicate category documents exist with the same name and remove duplicates
      const seenNames = new Set<string>();
      const duplicatesToDelete: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const normName = (data.name || '').toLowerCase().trim();
        if (normName) {
          if (seenNames.has(normName)) {
            duplicatesToDelete.push(docSnap.id);
          } else {
            seenNames.add(normName);
          }
        }
      });

      if (duplicatesToDelete.length > 0) {
        console.log(`Cleaning up ${duplicatesToDelete.length} duplicate category documents in Firestore...`);
        const cleanupBatch = writeBatch(db);
        for (const dupId of duplicatesToDelete) {
          cleanupBatch.delete(doc(categoriesRef, dupId));
        }
        await cleanupBatch.commit();
      }
    }
  } catch (err) {
    console.error('Error seeding categories:', err);
  }
}

export function subscribeCategories(onUpdate: (categories: CategoryDoc[]) => void, onError?: (error: Error) => void) {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const list: CategoryDoc[] = [];
    const seen = new Set<string>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const normName = (data.name || '').toLowerCase().trim();
      // Only include unique categories by name
      if (normName && !seen.has(normName)) {
        seen.add(normName);
        list.push({
          id: docSnap.id,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          status: data.status || 'active',
          order: data.order || 0,
          subCategories: data.subCategories || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          createdBy: data.createdBy
        });
      }
    });
    onUpdate(list);
  }, (err) => {
    console.error('Categories subscription error:', err);
    if (onError) onError(err);
  });
}

export async function createCategoryInFirestore(
  data: { name: string; description?: string; status: 'active' | 'inactive'; subCategories?: SubCategory[] },
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.name.trim()) {
      return { success: false, error: 'Category name is required.' };
    }

    const categoriesRef = collection(db, 'categories');
    const existingSnap = await getDocs(categoriesRef);
    const count = existingSnap.size;

    const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newDocRef = doc(categoriesRef);

    const newCategory: CategoryDoc = {
      id: newDocRef.id,
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || '',
      status: data.status,
      order: count + 1,
      subCategories: data.subCategories || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.uid
    };

    await setDoc(newDocRef, newCategory);
    return { success: true, id: newDocRef.id };
  } catch (err: any) {
    console.error('Error creating category:', err);
    return { success: false, error: err.message || 'Failed to create category in Firestore.' };
  }
}

export async function updateCategoryInFirestore(
  categoryId: string,
  data: Partial<CategoryDoc>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'categories', categoryId);
    await updateDoc(docRef, cleanUndefined({
      ...data,
      updatedAt: new Date().toISOString()
    }));
    return { success: true };
  } catch (err: any) {
    console.error('Error updating category:', err);
    return { success: false, error: err.message || 'Failed to update category in Firestore.' };
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'categories', categoryId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting category:', err);
    return { success: false, error: err.message || 'Failed to delete category.' };
  }
}

// -------------------------------------------------------------
// 2. PRODUCT SERVICE
// -------------------------------------------------------------

export async function seedInitialProductsIfEmpty(): Promise<void> {
  try {
    const productsRef = collection(db, 'products');
    const snap = await getDocs(productsRef);
    if (snap.empty) {
      console.log('Seeding initial products into Firestore...');
      const batch = writeBatch(db);
      for (const prod of INITIAL_PRODUCTS_DATA) {
        const docId = (prod as any).id || prod.sku;
        const newDocRef = docId ? doc(productsRef, docId) : doc(productsRef);
        batch.set(newDocRef, {
          ...prod,
          id: newDocRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Products seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding products:', err);
  }
}

export function subscribeProducts(onUpdate: (products: Product[]) => void, onError?: (error: Error) => void) {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const currentStock = Number(data.currentStock) || 0;
      const lowStockThreshold = Number(data.lowStockThreshold) || 10;
      const stockStatus = getStockStatus(currentStock, lowStockThreshold);

      list.push({
        id: docSnap.id,
        name: data.name || '',
        sku: data.sku || '',
        category: data.category || 'Other Products',
        categoryId: data.categoryId || '',
        subCategory: data.subCategory || '',
        brand: data.brand || data.brandName || '',
        brandName: data.brand || data.brandName || '',
        image: data.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80',
        description: data.description || '',
        status: data.status || 'active',
        stockStatus,
        purchasePrice: Number(data.purchasePrice) || 0,
        wholesalePrice: Number(data.wholesalePrice) || 0,
        mrp: Number(data.mrp) || 0,
        minSellingPrice: Number(data.minSellingPrice) || Number(data.wholesalePrice) || 0,
        openingStock: Number(data.openingStock) || 0,
        currentStock,
        lowStockThreshold,
        unit: data.unit || 'piece',
        barcode: data.barcode || '',
        size: data.size || '',
        color: data.color || '',
        variant: data.variant || '',
        warehouseLocation: data.warehouseLocation || 'Central Warehouse',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Products subscription error:', err);
    if (onError) onError(err);
  });
}

export async function createProductInFirestore(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validations
    if (!productData.name.trim()) return { success: false, error: 'Product name is required.' };
    if (!productData.sku.trim()) return { success: false, error: 'Product SKU/Code is required.' };
    if (!productData.category) return { success: false, error: 'Category selection is required.' };
    if (productData.purchasePrice < 0) return { success: false, error: 'Purchase price cannot be negative.' };
    if (productData.wholesalePrice <= 0) return { success: false, error: 'Wholesale price must be greater than 0.' };
    if (productData.mrp <= 0) return { success: false, error: 'MRP must be greater than 0.' };

    const productsRef = collection(db, 'products');

    // Check SKU uniqueness
    const skuQuery = query(productsRef, where('sku', '==', productData.sku.trim().toUpperCase()));
    const skuSnap = await getDocs(skuQuery);
    if (!skuSnap.empty) {
      return { success: false, error: `SKU "${productData.sku.trim().toUpperCase()}" is already assigned to another product.` };
    }

    const currentStock = Number(productData.currentStock) || 0;
    const lowStockThreshold = Number(productData.lowStockThreshold) || 10;
    const stockStatus = getStockStatus(currentStock, lowStockThreshold);
    const newDocRef = doc(productsRef);

    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: newDocRef.id,
      sku: productData.sku.trim().toUpperCase(),
      stockStatus,
      image: productData.image?.trim() || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid
    };

    await setDoc(newDocRef, cleanUndefined(newProduct));

    // If opening stock > 0, log initial inventory transaction
    if (currentStock > 0) {
      const transRef = collection(db, 'inventoryTransactions');
      await addDoc(transRef, {
        productId: newDocRef.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        previousStock: 0,
        adjustmentQuantity: currentStock,
        newStock: currentStock,
        type: 'stock_in',
        reason: 'Initial Opening Stock Entry',
        userId: currentUser.uid,
        userName: currentUser.name,
        userRole: currentUser.role,
        createdAt: now
      });
    }

    return { success: true, id: newDocRef.id };
  } catch (err: any) {
    console.error('Error creating product:', err);
    return { success: false, error: err.message || 'Failed to save product in Firestore.' };
  }
}

export async function updateProductInFirestore(
  productId: string,
  updates: Partial<Product>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'products', productId);
    const now = new Date().toISOString();

    const dataToUpdate: any = cleanUndefined({
      ...updates,
      updatedAt: now
    });

    if (updates.currentStock !== undefined || updates.lowStockThreshold !== undefined) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentData = snap.data();
        const stock = updates.currentStock !== undefined ? Number(updates.currentStock) : Number(currentData.currentStock);
        const threshold = updates.lowStockThreshold !== undefined ? Number(updates.lowStockThreshold) : Number(currentData.lowStockThreshold);
        dataToUpdate.stockStatus = getStockStatus(stock, threshold);
      }
    }

    await updateDoc(docRef, dataToUpdate);
    return { success: true };
  } catch (err: any) {
    console.error('Error updating product in Firestore:', err);
    return { success: false, error: err.message || 'Failed to update product.' };
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting product from Firestore:', err);
    return { success: false, error: err.message || 'Failed to delete product.' };
  }
}

// -------------------------------------------------------------
// 3. INVENTORY & STOCK ADJUSTMENT SERVICE (ADMIN ONLY)
// -------------------------------------------------------------

export async function adjustProductStockInFirestore(
  productId: string,
  adjustmentQuantity: number,
  reason: string,
  currentUser: AuthUser,
  type: 'adjustment' | 'stock_in' | 'damage' | 'audit' | 'return' | 'sample' = 'adjustment'
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Administrators are permitted to adjust inventory stock.' };
    }
    if (adjustmentQuantity === 0) {
      return { success: false, error: 'Adjustment quantity cannot be 0.' };
    }
    if (!reason.trim()) {
      return { success: false, error: 'A specific reason is required for auditing inventory adjustments.' };
    }

    const productDocRef = doc(db, 'products', productId);
    const transCollectionRef = collection(db, 'inventoryTransactions');

    const result = await runTransaction(db, async (transaction) => {
      const productSnap = await transaction.get(productDocRef);
      if (!productSnap.exists()) {
        throw new Error('Product not found in Firestore database.');
      }

      const productData = productSnap.data();
      const previousStock = Number(productData.currentStock) || 0;
      const lowStockThreshold = Number(productData.lowStockThreshold) || 10;
      const newStock = previousStock + adjustmentQuantity;

      if (newStock < 0) {
        throw new Error(`Cannot reduce stock by ${Math.abs(adjustmentQuantity)}. Current warehouse stock is only ${previousStock} units.`);
      }

      const stockStatus = getStockStatus(newStock, lowStockThreshold);
      const now = new Date().toISOString();

      // 1. Update live stock on Product document
      transaction.update(productDocRef, {
        currentStock: newStock,
        stockStatus,
        updatedAt: now
      });

      // 2. Insert immutable inventory transaction log
      const newTransRef = doc(transCollectionRef);
      transaction.set(newTransRef, {
        id: newTransRef.id,
        productId,
        productName: productData.name,
        sku: productData.sku,
        previousStock,
        adjustmentQuantity,
        newStock,
        type,
        reason: reason.trim(),
        userId: currentUser.uid,
        userName: currentUser.name,
        userRole: currentUser.role,
        createdAt: now
      });

      return { newStock };
    });

    return { success: true, newStock: result.newStock };
  } catch (err: any) {
    console.error('Error executing stock adjustment transaction:', err);
    return { success: false, error: err.message || 'Failed to adjust inventory stock.' };
  }
}

export function subscribeInventoryTransactions(
  onUpdate: (transactions: InventoryTransaction[]) => void,
  onError?: (error: Error) => void
) {
  const transRef = collection(db, 'inventoryTransactions');
  const q = query(transRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: InventoryTransaction[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        productId: data.productId || '',
        productName: data.productName || 'Unknown Item',
        sku: data.sku || 'N/A',
        previousStock: Number(data.previousStock) || 0,
        adjustmentQuantity: Number(data.adjustmentQuantity) || 0,
        newStock: Number(data.newStock) || 0,
        type: data.type || 'adjustment',
        reason: data.reason || '',
        userId: data.userId || '',
        userName: data.userName || 'System',
        userRole: data.userRole || 'admin',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Inventory transactions subscription error:', err);
    if (onError) onError(err);
  });
}

// -------------------------------------------------------------
// 4. CUSTOMER / RETAIL SHOP MANAGEMENT SERVICE
// -------------------------------------------------------------

export const INITIAL_CUSTOMERS_SEED_DATA: Omit<Customer, 'id'>[] = [
  {
    customerId: 'CUST-1001',
    shopName: 'Apsara Beauty Corner & Cosmetics',
    ownerName: 'Alhaj Md. Mizanur Rahman',
    phone: '+880 1711-294820',
    alternatePhone: '+880 1819-223344',
    email: 'apsarabeauty.dhaka@gmail.com',
    address: 'Shop 14-16, 2nd Floor, Chawkbazar Super Market',
    area: 'Chawkbazar',
    city: 'Dhaka',
    district: 'Dhaka',
    assignedSalesUserId: 'sales-01',
    assignedSalesUserName: 'Tanvir Ahmed',
    assignedSalesSellerId: 'sales-01',
    assignedSalesSellerName: 'Tanvir Ahmed',
    creditLimit: 150000,
    paymentTermDays: 15,
    tradeLicenseNo: 'TRAD/DSCC/019284/2023',
    notes: 'Premium wholesale client. Prefers delivery on Saturday mornings.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2025-02-10T10:00:00.000Z'
  },
  {
    customerId: 'CUST-1002',
    shopName: 'Shingaar Glamour Hub',
    ownerName: 'Mrs. Rokeya Begum',
    phone: '+880 1819-482910',
    alternatePhone: '',
    email: 'shingaar.elephantrd@yahoo.com',
    address: 'Holding 42, Multiplan Center Adjacent, Elephant Road',
    area: 'New Market / Elephant Road',
    city: 'Dhaka',
    district: 'Dhaka',
    assignedSalesUserId: 'sales-01',
    assignedSalesUserName: 'Tanvir Ahmed',
    assignedSalesSellerId: 'sales-01',
    assignedSalesSellerName: 'Tanvir Ahmed',
    creditLimit: 200000,
    paymentTermDays: 30,
    tradeLicenseNo: 'TRAD/DSCC/049102/2022',
    notes: 'Major reseller for lipstick and skincare bundles in Dhaka South.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2024-11-05T11:30:00.000Z'
  },
  {
    customerId: 'CUST-1003',
    shopName: 'Radiance Beauty & Accessories',
    ownerName: 'Kazi Farhan Ishrak',
    phone: '+880 1912-784019',
    alternatePhone: '+880 1711-556677',
    email: 'radiance.dhanmondi@gmail.com',
    address: 'Shop G-08, Shimanto Square (Rifles Square), Road 2',
    area: 'Dhanmondi',
    city: 'Dhaka',
    district: 'Dhaka',
    assignedSalesUserId: 'sales-02',
    assignedSalesUserName: 'Nusrat Jahan',
    assignedSalesSellerId: 'sales-02',
    assignedSalesSellerName: 'Nusrat Jahan',
    creditLimit: 120000,
    paymentTermDays: 15,
    tradeLicenseNo: 'TRAD/DSCC/082194/2024',
    notes: 'High-end retail salon partner.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2025-06-18T14:15:00.000Z'
  },
  {
    customerId: 'CUST-1004',
    shopName: 'Prestige Cosmetics Resellers',
    ownerName: 'Mohammad Nazmul Huda',
    phone: '+880 1678-901234',
    alternatePhone: '',
    email: 'prestige.bashundhara@gmail.com',
    address: 'Level 4, Block C, Shop 42, Bashundhara City Shopping Mall',
    area: 'Panthapath',
    city: 'Dhaka',
    district: 'Dhaka',
    assignedSalesUserId: 'sales-02',
    assignedSalesUserName: 'Nusrat Jahan',
    assignedSalesSellerId: 'sales-02',
    assignedSalesSellerName: 'Nusrat Jahan',
    creditLimit: 250000,
    paymentTermDays: 30,
    tradeLicenseNo: 'TRAD/DNCC/021948/2021',
    notes: 'Largest volume client in central Panthapath zone.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2024-08-12T09:45:00.000Z'
  },
  {
    customerId: 'CUST-1005',
    shopName: 'Beauty Touch Glamour Corner',
    ownerName: 'Imtiaz Ahmed Chowdhury',
    phone: '+880 1713-994012',
    alternatePhone: '',
    email: 'beautytouch.ctg@gmail.com',
    address: 'Shop 212, Central Plaza, GEC Circle',
    area: 'GEC Circle',
    city: 'Chattogram',
    district: 'Chattogram',
    assignedSalesUserId: 'sales-03',
    assignedSalesUserName: 'Shafiqul Islam',
    assignedSalesSellerId: 'sales-03',
    assignedSalesSellerName: 'Shafiqul Islam',
    creditLimit: 300000,
    paymentTermDays: 30,
    tradeLicenseNo: 'TRAD/CCC/019284/2022',
    notes: 'Chattogram division key flagship distributor.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2024-05-15T12:00:00.000Z'
  },
  {
    customerId: 'CUST-1006',
    shopName: 'Suruchi Cosmetics & Gift Palace',
    ownerName: 'Dewan Sajjad Ali',
    phone: '+880 1715-449102',
    alternatePhone: '',
    email: 'suruchi.sylhet@yahoo.com',
    address: 'Shop 105, Blue Water Shopping City, Zindabazar',
    area: 'Zindabazar',
    city: 'Sylhet',
    district: 'Sylhet',
    assignedSalesUserId: 'sales-03',
    assignedSalesUserName: 'Shafiqul Islam',
    assignedSalesSellerId: 'sales-03',
    assignedSalesSellerName: 'Shafiqul Islam',
    creditLimit: 150000,
    paymentTermDays: 20,
    tradeLicenseNo: 'TRAD/SCC/081920/2023',
    notes: 'Sylhet core commercial zone reseller.',
    status: 'active',
    totalPurchase: 0,
    totalPaid: 0,
    currentDue: 0,
    createdAt: '2025-03-01T15:20:00.000Z'
  }
];

export async function seedInitialCustomersIfEmpty(): Promise<void> {
  try {
    const custRef = collection(db, 'customers');
    const snap = await getDocs(custRef);
    if (snap.empty) {
      console.log('Seeding initial customers into Firestore...');
      const batch = writeBatch(db);
      for (const cust of INITIAL_CUSTOMERS_SEED_DATA) {
        const newDocRef = doc(custRef);
        batch.set(newDocRef, {
          ...cust,
          id: newDocRef.id,
          createdAt: cust.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Customers seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding customers:', err);
  }
}

export function subscribeCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (error: Error) => void
) {
  const custRef = collection(db, 'customers');
  const q = query(custRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: Customer[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        customerId: data.customerId || `CUST-${docSnap.id.slice(0, 6).toUpperCase()}`,
        shopName: data.shopName || '',
        ownerName: data.ownerName || '',
        phone: data.phone || '',
        alternatePhone: data.alternatePhone || '',
        email: data.email || '',
        address: data.address || '',
        area: data.area || '',
        city: data.city || '',
        district: data.district || 'Dhaka',
        notes: data.notes || '',
        assignedSalesUserId: data.assignedSalesUserId || data.assignedSalesSellerId || '',
        assignedSalesUserName: data.assignedSalesUserName || data.assignedSalesSellerName || 'Unassigned',
        assignedSalesSellerId: data.assignedSalesUserId || data.assignedSalesSellerId || '',
        assignedSalesSellerName: data.assignedSalesUserName || data.assignedSalesSellerName || 'Unassigned',
        creditLimit: Number(data.creditLimit) || 100000,
        paymentTermDays: Number(data.paymentTermDays) || 15,
        tradeLicenseNo: data.tradeLicenseNo || '',
        status: data.status || 'active',
        totalPurchase: Number(data.totalPurchase) || 0,
        totalPaid: Number(data.totalPaid) || 0,
        currentDue: Number(data.currentDue) || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || '',
        createdBy: data.createdBy || '',
        lastOrderDate: data.lastOrderDate || '',
        latitude: typeof data.latitude === 'number' ? data.latitude : (data.latitude ? Number(data.latitude) : null),
        longitude: typeof data.longitude === 'number' ? data.longitude : (data.longitude ? Number(data.longitude) : null),
        locationAccuracyMeters: typeof data.locationAccuracyMeters === 'number' ? data.locationAccuracyMeters : (data.locationAccuracyMeters ? Number(data.locationAccuracyMeters) : null),
        isGpsVerified: Boolean(data.isGpsVerified || (data.latitude && data.longitude)),
        locationCapturedAt: data.locationCapturedAt || null,
        locationCapturedByUserId: data.locationCapturedByUserId || null
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Customers subscription error:', err);
    if (onError) onError(err);
  });
}

/**
 * Resolves the actual Firestore document ID for a customer.
 * Handles cases where customerId is the document ID, the custom customerId string (e.g., CUST-1001),
 * or referenced via order details.
 */
export async function resolveCustomerDocumentId(
  inputCustomerId?: string | null,
  orderId?: string | null
): Promise<string | null> {
  const cleanId = (inputCustomerId || '').trim();

  // 1. Direct check if document exists with cleanId
  if (cleanId) {
    try {
      const directSnap = await getDoc(doc(db, 'customers', cleanId));
      if (directSnap.exists()) {
        return directSnap.id;
      }
    } catch (e) {
      // ignore
    }

    // 2. Query where customerId == cleanId
    try {
      const q1 = query(collection(db, 'customers'), where('customerId', '==', cleanId), limit(1));
      const qSnap1 = await getDocs(q1);
      if (!qSnap1.empty) {
        return qSnap1.docs[0].id;
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Try resolving via order record if orderId is provided
  if (orderId && orderId.trim()) {
    try {
      const orderSnap = await getDoc(doc(db, 'orders', orderId.trim()));
      if (orderSnap.exists()) {
        const ordData = orderSnap.data() as Order;

        if (ordData.customerId) {
          const ordCustId = ordData.customerId.trim();
          const directOrdCust = await getDoc(doc(db, 'customers', ordCustId));
          if (directOrdCust.exists()) {
            return directOrdCust.id;
          }
          const q2 = query(collection(db, 'customers'), where('customerId', '==', ordCustId), limit(1));
          const qSnap2 = await getDocs(q2);
          if (!qSnap2.empty) {
            return qSnap2.docs[0].id;
          }
        }

        // Match by phone number if available
        if (ordData.phone) {
          const cleanPhone = ordData.phone.replace(/[^0-9+]/g, '');
          if (cleanPhone) {
            const allCusts = await getDocs(collection(db, 'customers'));
            for (const docSnap of allCusts.docs) {
              const cData = docSnap.data();
              const cPhone = (cData.phone || '').replace(/[^0-9+]/g, '');
              if (cPhone && (cPhone === cleanPhone || cPhone.endsWith(cleanPhone.slice(-8)))) {
                return docSnap.id;
              }
            }
          }
        }

        // Match by shopName if available
        if (ordData.shopName) {
          const sName = ordData.shopName.trim().toLowerCase();
          const allCusts = await getDocs(collection(db, 'customers'));
          for (const docSnap of allCusts.docs) {
            const cData = docSnap.data();
            if (cData.shopName && cData.shopName.trim().toLowerCase() === sName) {
              return docSnap.id;
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 4. Fallback search across customers list if cleanId provided
  if (cleanId) {
    try {
      const allCusts = await getDocs(collection(db, 'customers'));
      for (const docSnap of allCusts.docs) {
        const cData = docSnap.data();
        if (
          docSnap.id === cleanId ||
          cData.customerId === cleanId ||
          cData.phone === cleanId ||
          (cData.shopName && cData.shopName.toLowerCase() === cleanId.toLowerCase())
        ) {
          return docSnap.id;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return cleanId || null;
}

/**
 * Checks for existing customers with the same normalized phone number
 */
export async function checkDuplicatePhoneInFirestore(
  phone: string,
  excludeCustomerId?: string
): Promise<{ isDuplicate: boolean; existingCustomer?: Customer }> {
  try {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return { isDuplicate: false };

    const custRef = collection(db, 'customers');
    const snapshot = await getDocs(custRef);
    
    let existingCustomer: Customer | undefined;

    snapshot.forEach((docSnap) => {
      if (excludeCustomerId && docSnap.id === excludeCustomerId) return;
      const data = docSnap.data();
      const existingClean = (data.phone || '').replace(/[^0-9+]/g, '');
      const existingCleanAlt = (data.alternatePhone || '').replace(/[^0-9+]/g, '');
      
      if (
        (existingClean && existingClean.includes(cleanPhone.slice(-8))) ||
        (cleanPhone && existingClean && cleanPhone.includes(existingClean.slice(-8))) ||
        (existingCleanAlt && existingCleanAlt.includes(cleanPhone.slice(-8)))
      ) {
        existingCustomer = {
          id: docSnap.id,
          customerId: data.customerId || docSnap.id,
          shopName: data.shopName || '',
          ownerName: data.ownerName || '',
          phone: data.phone || '',
          address: data.address || '',
          area: data.area || '',
          district: data.district || '',
          status: data.status || 'active',
          totalPurchase: Number(data.totalPurchase) || 0,
          totalPaid: Number(data.totalPaid) || 0,
          currentDue: Number(data.currentDue) || 0,
          createdAt: data.createdAt || ''
        };
      }
    });

    return {
      isDuplicate: Boolean(existingCustomer),
      existingCustomer
    };
  } catch (err) {
    console.error('Error checking duplicate phone:', err);
    return { isDuplicate: false };
  }
}

export async function createCustomerInFirestore(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchase' | 'totalPaid' | 'currentDue'> & {
    totalPurchase?: number;
    totalPaid?: number;
    currentDue?: number;
  },
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.shopName?.trim()) {
      return { success: false, error: 'Shop Name is required.' };
    }
    if (!data.ownerName?.trim()) {
      return { success: false, error: 'Owner / Proprietor Name is required.' };
    }
    if (!data.phone?.trim()) {
      return { success: false, error: 'Primary Phone Number is required.' };
    }
    if (!data.address?.trim()) {
      return { success: false, error: 'Full Address is required.' };
    }
    if (!data.district?.trim()) {
      return { success: false, error: 'District is required.' };
    }

    const custRef = collection(db, 'customers');
    const newDocRef = doc(custRef);
    const now = new Date().toISOString();

    const newCustomer: Customer = {
      id: newDocRef.id,
      customerId: data.customerId?.trim() || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      shopName: data.shopName.trim(),
      ownerName: data.ownerName.trim(),
      phone: data.phone.trim(),
      alternatePhone: data.alternatePhone?.trim() || '',
      email: data.email?.trim() || '',
      address: data.address.trim(),
      area: data.area?.trim() || '',
      city: data.city?.trim() || '',
      district: data.district.trim(),
      notes: data.notes?.trim() || '',
      assignedSalesUserId: data.assignedSalesUserId || data.assignedSalesSellerId || '',
      assignedSalesUserName: data.assignedSalesUserName || data.assignedSalesSellerName || 'Unassigned',
      assignedSalesSellerId: data.assignedSalesUserId || data.assignedSalesSellerId || '',
      assignedSalesSellerName: data.assignedSalesUserName || data.assignedSalesSellerName || 'Unassigned',
      creditLimit: Number(data.creditLimit) || 100000,
      paymentTermDays: Number(data.paymentTermDays) || 15,
      tradeLicenseNo: data.tradeLicenseNo?.trim() || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      locationAccuracyMeters: data.locationAccuracyMeters ?? null,
      isGpsVerified: data.isGpsVerified ?? false,
      locationCapturedAt: data.locationCapturedAt ?? (data.latitude ? now : null),
      locationCapturedByUserId: data.locationCapturedByUserId ?? (data.latitude ? currentUser.uid : null),
      status: data.status || 'active',
      // Financial summaries cannot be set manually; default to 0
      totalPurchase: 0,
      totalPaid: 0,
      currentDue: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.uid,
      lastOrderDate: ''
    };

    await setDoc(newDocRef, cleanUndefined(newCustomer));
    return { success: true, id: newDocRef.id };
  } catch (err: any) {
    console.error('Error creating customer in Firestore:', err);
    return { success: false, error: err.message || 'Failed to create customer in database.' };
  }
}

export async function updateCustomerInFirestore(
  customerId: string,
  data: Partial<Customer>,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!customerId) return { success: false, error: 'Customer ID is required.' };
    
    // Prevent manual alteration of financial summary totals
    const { totalPurchase, totalPaid, currentDue, ...allowedData } = data as any;

    const docRef = doc(db, 'customers', customerId);
    await updateDoc(docRef, cleanUndefined({
      ...allowedData,
      assignedSalesSellerId: allowedData.assignedSalesUserId || allowedData.assignedSalesSellerId || '',
      assignedSalesSellerName: allowedData.assignedSalesUserName || allowedData.assignedSalesSellerName || 'Unassigned',
      updatedAt: new Date().toISOString()
    }));

    return { success: true };
  } catch (err: any) {
    console.error('Error updating customer in Firestore:', err);
    return { success: false, error: err.message || 'Failed to update customer in database.' };
  }
}

export async function toggleCustomerStatusInFirestore(
  customerId: string,
  currentStatus: 'active' | 'inactive'
): Promise<{ success: boolean; error?: string }> {
  try {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const docRef = doc(db, 'customers', customerId);
    await updateDoc(docRef, {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error toggling customer status:', err);
    return { success: false, error: err.message || 'Failed to change customer status.' };
  }
}

export async function assignSalesSellerToCustomerInFirestore(
  customerId: string,
  salesUserId: string,
  salesUserName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'customers', customerId);
    await updateDoc(docRef, {
      assignedSalesUserId: salesUserId,
      assignedSalesUserName: salesUserName,
      assignedSalesSellerId: salesUserId,
      assignedSalesSellerName: salesUserName,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err: any) {
    console.error('Error assigning sales seller:', err);
    return { success: false, error: err.message || 'Failed to assign sales officer.' };
  }
}

export async function deleteCustomerFromFirestore(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'customers', customerId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting customer from Firestore:', err);
    return { success: false, error: err.message || 'Failed to delete customer.' };
  }
}

// ==========================================
// ORDERS FIRESTORE MANAGEMENT & STOCK RULES
// ==========================================

export const INITIAL_ORDERS_SEED_DATA: Partial<Order>[] = [
  {
    orderNumber: 'ORD-2026-1081',
    customerId: '',
    customerName: 'Apsara Beauty Corner & Cosmetics',
    shopName: 'Apsara Beauty Corner & Cosmetics',
    ownerName: 'Alhaj Md. Mizanur Rahman',
    customerPhone: '+880 1711-294820',
    phone: '+880 1711-294820',
    customerAddress: 'Shop 14-16, 2nd Floor, Chawkbazar Super Market',
    address: 'Shop 14-16, 2nd Floor, Chawkbazar Super Market',
    area: 'Chawkbazar',
    district: 'Dhaka',
    salesUserId: 'sales-01',
    salesUserName: 'Tanvir Ahmed',
    salesSellerId: 'sales-01',
    salesSellerName: 'Tanvir Ahmed',
    deliveryStaffId: 'deliv-01',
    deliveryStaffName: 'Rony Howlader',
    items: [
      {
        productId: '',
        productName: 'Glowzaa Velvet Matte Liquid Lipstick - Crimson Velvet',
        sku: 'GZ-LIP-001',
        category: 'Makeup & Cosmetics',
        quantity: 10,
        unitPrice: 420,
        discount: 0,
        subtotal: 4200,
        totalPrice: 4200,
        mrp: 650,
        minSellingPrice: 400,
        unit: 'Piece'
      },
      {
        productId: '',
        productName: 'Glowzaa 10% Niacinamide & Zinc Clarifying Serum 30ml',
        sku: 'GZ-SKN-001',
        category: 'Skincare',
        quantity: 15,
        unitPrice: 580,
        discount: 0,
        subtotal: 8700,
        totalPrice: 8700,
        mrp: 850,
        minSellingPrice: 550,
        unit: 'Piece'
      }
    ],
    subtotal: 12900,
    totalDiscount: 400,
    discount: 400,
    grandTotal: 12500,
    totalAmount: 12500,
    paidAmount: 5000,
    dueAmount: 7500,
    orderStatus: 'confirmed',
    paymentStatus: 'partial',
    deliveryStatus: 'assigned',
    paymentMethod: 'Cash',
    notes: 'Urgent weekend delivery required.',
    stockDeducted: true,
    stockRestored: false,
    createdDate: '2026-08-18',
    createdAt: '2026-08-18T10:30:00.000Z'
  },
  {
    orderNumber: 'ORD-2026-1082',
    customerId: '',
    customerName: 'Shinghar Cosmetics & Parlour Supply',
    shopName: 'Shinghar Cosmetics & Parlour Supply',
    ownerName: 'Subrata Kumar Dey',
    customerPhone: '+880 1819-338291',
    phone: '+880 1819-338291',
    customerAddress: 'Shop 8, Ground Floor, New Market Shopping Complex',
    address: 'Shop 8, Ground Floor, New Market Shopping Complex',
    area: 'New Market',
    district: 'Dhaka',
    salesUserId: 'sales-02',
    salesUserName: 'Nusrat Jahan',
    salesSellerId: 'sales-02',
    salesSellerName: 'Nusrat Jahan',
    items: [
      {
        productId: '',
        productName: 'Glowzaa Red Onion & Black Seed Hair Growth Oil 200ml',
        sku: 'GZ-HAR-001',
        category: 'Hair Care',
        quantity: 20,
        unitPrice: 380,
        discount: 0,
        subtotal: 7600,
        totalPrice: 7600,
        mrp: 580,
        minSellingPrice: 350,
        unit: 'Bottle'
      }
    ],
    subtotal: 7600,
    totalDiscount: 0,
    discount: 0,
    grandTotal: 7600,
    totalAmount: 7600,
    paidAmount: 0,
    dueAmount: 7600,
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    deliveryStatus: 'unassigned',
    paymentMethod: 'Credit Account (Net 30)',
    notes: 'Check batch expiration before dispatch.',
    stockDeducted: false,
    stockRestored: false,
    createdDate: '2026-08-19',
    createdAt: '2026-08-19T09:00:00.000Z'
  }
];

export async function seedInitialOrdersIfEmpty(): Promise<void> {
  try {
    const ordersRef = collection(db, 'orders');
    const snap = await getDocs(ordersRef);
    if (snap.empty) {
      console.log('Seeding initial wholesale orders into Firestore...');
      
      // Look up existing customers and products to attach real document IDs
      const custSnap = await getDocs(collection(db, 'customers'));
      const prodSnap = await getDocs(collection(db, 'products'));
      
      const custList = custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      const prodList = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];

      const batch = writeBatch(db);

      for (let i = 0; i < INITIAL_ORDERS_SEED_DATA.length; i++) {
        const seedOrder = INITIAL_ORDERS_SEED_DATA[i];
        const newDocRef = doc(ordersRef);
        
        const matchedCust = custList[i % custList.length] || null;
        const matchedProd1 = prodList[0] || null;
        const matchedProd2 = prodList[1] || null;

        const resolvedItems = (seedOrder.items || []).map((item, idx) => {
          const matchedProd = idx === 0 ? matchedProd1 : matchedProd2;
          return {
            ...item,
            productId: matchedProd ? matchedProd.id : `prod-${idx + 1}`,
            productName: matchedProd ? matchedProd.name : item.productName,
            sku: matchedProd ? matchedProd.sku : item.sku
          };
        });

        const orderDocData: Order = {
          id: newDocRef.id,
          orderId: newDocRef.id,
          orderNumber: seedOrder.orderNumber || `ORD-2026-${1080 + i}`,
          customerId: matchedCust ? matchedCust.id : `cust-0${i + 1}`,
          customerName: matchedCust ? matchedCust.shopName : (seedOrder.shopName || ''),
          shopName: matchedCust ? matchedCust.shopName : (seedOrder.shopName || ''),
          ownerName: matchedCust ? matchedCust.ownerName : (seedOrder.ownerName || ''),
          customerPhone: matchedCust ? matchedCust.phone : (seedOrder.phone || ''),
          phone: matchedCust ? matchedCust.phone : (seedOrder.phone || ''),
          customerAddress: matchedCust ? matchedCust.address : (seedOrder.address || ''),
          address: matchedCust ? matchedCust.address : (seedOrder.address || ''),
          area: matchedCust ? matchedCust.area : (seedOrder.area || ''),
          city: matchedCust ? (matchedCust.city || matchedCust.district) : (seedOrder.district || 'Dhaka'),
          district: matchedCust ? matchedCust.district : (seedOrder.district || 'Dhaka'),
          salesUserId: seedOrder.salesUserId || 'sales-01',
          salesUserName: seedOrder.salesUserName || 'Tanvir Ahmed',
          salesSellerId: seedOrder.salesUserId || 'sales-01',
          salesSellerName: seedOrder.salesUserName || 'Tanvir Ahmed',
          deliveryStaffId: seedOrder.deliveryStaffId || '',
          deliveryStaffName: seedOrder.deliveryStaffName || '',
          items: resolvedItems as any,
          subtotal: Number(seedOrder.subtotal) || 0,
          totalDiscount: Number(seedOrder.totalDiscount) || 0,
          discount: Number(seedOrder.discount) || 0,
          grandTotal: Number(seedOrder.grandTotal) || Number(seedOrder.totalAmount) || 0,
          totalAmount: Number(seedOrder.grandTotal) || Number(seedOrder.totalAmount) || 0,
          paidAmount: Number(seedOrder.paidAmount) || 0,
          dueAmount: Number(seedOrder.dueAmount) || 0,
          orderStatus: (seedOrder.orderStatus as any) || 'pending',
          paymentStatus: (seedOrder.paymentStatus as any) || 'unpaid',
          deliveryStatus: (seedOrder.deliveryStatus as any) || 'unassigned',
          paymentMethod: seedOrder.paymentMethod || 'Cash',
          notes: seedOrder.notes || '',
          stockDeducted: Boolean(seedOrder.stockDeducted),
          stockRestored: false,
          createdDate: seedOrder.createdDate || new Date().toISOString().split('T')[0],
          createdAt: seedOrder.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system'
        };

        batch.set(newDocRef, orderDocData);
      }

      await batch.commit();
      console.log('Wholesale orders seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding wholesale orders:', err);
  }
}

export function subscribeOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
) {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: Order[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      const subtotal = Number(data.subtotal) || 0;
      const totalDiscount = Number(data.totalDiscount) || Number(data.discount) || 0;
      const grandTotal = Number(data.grandTotal) || Number(data.totalAmount) || Math.max(0, subtotal - totalDiscount);
      const paidAmount = Number(data.paidAmount) || 0;
      const dueAmount = Number(data.dueAmount) !== undefined ? Number(data.dueAmount) : Math.max(0, grandTotal - paidAmount);

      // Auto compute payment status accurately
      let paymentStatus: PaymentStatus = 'unpaid';
      if (paidAmount >= grandTotal && grandTotal > 0) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0 && paidAmount < grandTotal) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'unpaid';
      }

      const isFullyDelivered = (data.deliveryStatus === 'delivered' || data.orderStatus === 'delivered');

      const items: OrderItem[] = Array.isArray(data.items) 
        ? data.items.map((item: any) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unitPrice) || 0;
            const disc = Number(item.discount) || 0;
            const itemSub = Number(item.subtotal) || Number(item.totalPrice) || Math.max(0, (price * qty) - disc);
            
            const orderedQuantity = item.orderedQuantity !== undefined ? Number(item.orderedQuantity) : qty;
            const deliveredQuantity = item.deliveredQuantity !== undefined 
              ? Number(item.deliveredQuantity) 
              : (isFullyDelivered ? orderedQuantity : 0);
            const remainingQuantity = item.remainingQuantity !== undefined 
              ? Number(item.remainingQuantity) 
              : Math.max(0, orderedQuantity - deliveredQuantity);
            const packedQuantity = item.packedQuantity !== undefined ? Number(item.packedQuantity) : orderedQuantity;

            return {
              productId: item.productId || '',
              productName: item.productName || 'Unnamed Product',
              sku: item.sku || '',
              category: item.category || 'General',
              quantity: orderedQuantity,
              orderedQuantity,
              deliveredQuantity,
              remainingQuantity,
              packedQuantity,
              unitPrice: price,
              discount: disc,
              subtotal: itemSub,
              totalPrice: itemSub,
              purchasePrice: Number(item.purchasePrice) || 0,
              mrp: Number(item.mrp) || price,
              minSellingPrice: Number(item.minSellingPrice) || 0,
              unit: item.unit || 'Piece',
              image: item.image || ''
            };
          })
        : [];

      list.push({
        id: docSnap.id,
        orderId: docSnap.id,
        orderNumber: data.orderNumber || `ORD-${docSnap.id.slice(0, 6).toUpperCase()}`,
        customerId: data.customerId || '',
        customerName: data.customerName || data.shopName || '',
        shopName: data.shopName || data.customerName || 'Retail Shop',
        ownerName: data.ownerName || '',
        customerPhone: data.customerPhone || data.phone || '',
        phone: data.phone || data.customerPhone || '',
        customerAddress: data.customerAddress || data.address || '',
        address: data.address || data.customerAddress || '',
        area: data.area || '',
        city: data.city || data.district || '',
        district: data.district || 'Dhaka',
        salesUserId: data.salesUserId || data.salesSellerId || '',
        salesUserName: data.salesUserName || data.salesSellerName || 'Sales Representative',
        salesSellerId: data.salesUserId || data.salesSellerId || '',
        salesSellerName: data.salesUserName || data.salesSellerName || 'Sales Representative',
        deliveryStaffId: data.deliveryStaffId || '',
        deliveryStaffName: data.deliveryStaffName || '',
        items,
        subtotal,
        totalDiscount,
        discount: totalDiscount,
        grandTotal,
        totalAmount: grandTotal,
        paidAmount,
        dueAmount,
        orderStatus: data.orderStatus || 'pending',
        paymentStatus: (data.paymentStatus || paymentStatus),
        deliveryStatus: data.deliveryStatus || 'unassigned',
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || '',
        stockDeducted: Boolean(data.stockDeducted),
        stockRestored: Boolean(data.stockRestored),
        confirmedAt: data.confirmedAt || '',
        confirmedBy: data.confirmedBy || '',
        cancelledAt: data.cancelledAt || '',
        cancelledBy: data.cancelledBy || '',
        returnedAt: data.returnedAt || '',
        returnedBy: data.returnedBy || '',
        createdDate: data.createdDate || (data.createdAt ? data.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || '',
        createdBy: data.createdBy || ''
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Orders subscription error:', err);
    if (onError) onError(err);
  });
}

/**
 * Creates a new B2B Sales Order in Firestore.
 * IMPORTANT: Does NOT decrease product stock upon creation. Stock is only reduced when CONFIRMED.
 */
export async function createOrderInFirestore(
  orderData: {
    customerId: string;
    customerName?: string;
    shopName: string;
    ownerName: string;
    phone: string;
    address: string;
    area: string;
    district: string;
    salesUserId: string;
    salesUserName: string;
    items: OrderItem[];
    subtotal: number;
    totalDiscount?: number;
    discount?: number;
    grandTotal: number;
    paidAmount: number;
    notes?: string;
    paymentMethod?: string;
    orderStatus?: OrderStatus;
  },
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; orderNumber?: string; error?: string }> {
  try {
    if (!orderData.customerId) {
      return { success: false, error: 'Please select a Customer / Retail Shop.' };
    }
    if (!orderData.items || orderData.items.length === 0) {
      return { success: false, error: 'Please add at least one product to the order.' };
    }

    for (const item of orderData.items) {
      if (!item.productId) {
        return { success: false, error: 'Invalid product in order items.' };
      }
      if (item.quantity <= 0) {
        return { success: false, error: `Quantity for "${item.productName}" must be greater than 0.` };
      }
      if (item.unitPrice < 0) {
        return { success: false, error: `Price for "${item.productName}" cannot be negative.` };
      }
    }

    // Precise financial calculations
    const calculatedSubtotal = orderData.items.reduce((sum, item) => {
      const itemSub = Math.max(0, (item.unitPrice * item.quantity) - (item.discount || 0));
      return sum + itemSub;
    }, 0);

    const totalDiscount = Math.max(0, Number(orderData.totalDiscount) || Number(orderData.discount) || 0);
    const grandTotal = Math.max(0, calculatedSubtotal - totalDiscount);
    const paidAmount = Math.max(0, Number(orderData.paidAmount) || 0);

    // Business rule: Paid amount cannot be greater than Grand Total
    if (paidAmount > grandTotal) {
      return { 
        success: false, 
        error: `Paid amount (৳${paidAmount.toLocaleString()}) cannot be greater than Grand Total (৳${grandTotal.toLocaleString()}).` 
      };
    }

    const dueAmount = Math.max(0, grandTotal - paidAmount);

    // Determine payment status automatically
    let paymentStatus: PaymentStatus = 'unpaid';
    if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    const now = new Date();
    const isoNow = now.toISOString();
    const dateStr = isoNow.split('T')[0];
    
    // Generate human-friendly sequential order number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${randomSuffix}`;

    const ordersRef = collection(db, 'orders');
    const newDocRef = doc(ordersRef);

    const newOrderDoc: Order = {
      id: newDocRef.id,
      orderId: newDocRef.id,
      orderNumber,
      customerId: orderData.customerId,
      customerName: orderData.shopName,
      shopName: orderData.shopName,
      ownerName: orderData.ownerName,
      customerPhone: orderData.phone,
      phone: orderData.phone,
      customerAddress: orderData.address,
      address: orderData.address,
      area: orderData.area,
      district: orderData.district,
      salesUserId: orderData.salesUserId || currentUser.uid,
      salesUserName: orderData.salesUserName || currentUser.name,
      salesSellerId: orderData.salesUserId || currentUser.uid,
      salesSellerName: orderData.salesUserName || currentUser.name,
      deliveryStaffId: '',
      deliveryStaffName: '',
      items: orderData.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        category: i.category || 'General',
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        discount: Number(i.discount) || 0,
        subtotal: Math.max(0, (Number(i.unitPrice) * Number(i.quantity)) - (Number(i.discount) || 0)),
        totalPrice: Math.max(0, (Number(i.unitPrice) * Number(i.quantity)) - (Number(i.discount) || 0)),
        mrp: Number(i.mrp) || Number(i.unitPrice),
        minSellingPrice: Number(i.minSellingPrice) || 0,
        unit: i.unit || 'Piece',
        image: i.image || ''
      })),
      subtotal: calculatedSubtotal,
      totalDiscount,
      discount: totalDiscount,
      grandTotal,
      totalAmount: grandTotal,
      paidAmount,
      dueAmount,
      orderStatus: orderData.orderStatus || 'pending',
      paymentStatus,
      deliveryStatus: 'unassigned',
      paymentMethod: orderData.paymentMethod || 'Cash',
      notes: orderData.notes || '',
      stockDeducted: false, // RULE: Order creation does NOT reduce stock
      stockRestored: false,
      createdDate: dateStr,
      createdAt: isoNow,
      updatedAt: isoNow,
      createdBy: currentUser.uid
    };

    await setDoc(newDocRef, cleanUndefined(newOrderDoc));
    return { success: true, id: newDocRef.id, orderNumber };
  } catch (err: any) {
    console.error('Error creating order in Firestore:', err);
    return { success: false, error: err.message || 'Failed to create sales order.' };
  }
}

/**
 * Confirms an order and atomically deducts stock from products,
 * updates customer ledger (SALE + Downpayment if paidAmount > 0),
 * and updates customer financial summary atomically.
 */
export async function confirmOrderInFirestore(
  orderId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;

      // Idempotency: Prevent duplicate confirmation and stock deduction
      if (orderData.stockDeducted === true || orderData.orderStatus === 'confirmed') {
        return { success: true, alreadyConfirmed: true };
      }

      if (orderData.orderStatus === 'cancelled') {
        throw new Error('Cannot confirm a cancelled order.');
      }

      // 1. Fetch and validate stock for all products (UPFRONT READS ONLY - NO WRITES HERE)
      const productDocs: { ref: any; data: Product; item: OrderItem }[] = [];

      for (const item of orderData.items) {
        let prodRef = doc(db, 'products', item.productId);
        let prodSnap = await transaction.get(prodRef);

        // Fallback: Check if product document exists using item.sku as document ID
        if (!prodSnap.exists() && item.sku && item.sku !== item.productId) {
          const skuRef = doc(db, 'products', item.sku);
          const skuSnap = await transaction.get(skuRef);
          if (skuSnap.exists()) {
            prodRef = skuRef;
            prodSnap = skuSnap;
          }
        }

        if (!prodSnap.exists()) {
          throw new Error(
            `Product not found: "${item.productName || item.productId}". The requested product does not exist in the catalog or has been deleted.`
          );
        }

        const prodData = prodSnap.data() as Product;
        const currentStock = Number(prodData.currentStock) || 0;

        if (currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock available for "${item.productName}". Current available: ${currentStock} ${item.unit || 'units'}, Requested: ${item.quantity} ${item.unit || 'units'}.`
          );
        }

        productDocs.push({ ref: prodRef, data: prodData, item });
      }

      // 2. Fetch customer upfront (UPFRONT READS ONLY)
      let custRef = null;
      let custSnap = null;
      if (orderData.customerId) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
      }

      const now = new Date().toISOString();

      // 3. NOW ALL READS ARE COMPLETE - START WRITES
      // 3a. Perform atomic stock deductions & create inventory transactions (WRITES)
      for (const { ref: prodRef, data: prodData, item } of productDocs) {
        const prevStock = Number(prodData.currentStock) || 0;
        const newStock = Math.max(0, prevStock - item.quantity);
        const lowThreshold = Number(prodData.lowStockThreshold) || 10;
        
        let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (newStock === 0) stockStatus = 'out_of_stock';
        else if (newStock <= lowThreshold) stockStatus = 'low_stock';

        // Update product currentStock
        transaction.update(prodRef, {
          currentStock: newStock,
          stockStatus,
          updatedAt: now
        });

        // Create immutable inventoryTransaction
        const txCol = collection(db, 'inventoryTransactions');
        const newTxRef = doc(txCol);
        
        transaction.set(newTxRef, {
          id: newTxRef.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          type: 'SALE',
          adjustmentQuantity: -item.quantity,
          quantity: item.quantity,
          previousStock: prevStock,
          newStock,
          referenceOrderId: orderId,
          referenceOrderNumber: orderData.orderNumber,
          reason: `Wholesale Order Confirmed: ${orderData.orderNumber} (${orderData.shopName})`,
          performedBy: currentUser.name || 'Admin',
          performedAt: now,
          userId: currentUser.uid,
          userName: currentUser.name || 'Admin',
          userRole: currentUser.role || 'admin',
          createdAt: now
        });
      }

      // 4. Atomically update Customer Financial Balance & Ledger
      const grandTotal = Math.round(Number(orderData.grandTotal) || Number(orderData.totalAmount) || 0);
      const paidAtBooking = Math.round(Number(orderData.paidAmount) || 0);

      if (orderData.customerId && custRef && custSnap && custSnap.exists()) {
        const custData = custSnap.data() as Customer;
        const prevTotalPurchase = Math.round(Number(custData.totalPurchase) || 0);
        const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
        const prevTotalReturned = Math.round(Number(custData.totalReturned) || 0);

        const newTotalPurchase = prevTotalPurchase + grandTotal;
        const newTotalPaid = prevTotalPaid + paidAtBooking;
        const netLiability = newTotalPurchase - prevTotalReturned;
        const newDue = Math.max(0, netLiability - newTotalPaid);
        const newAdvance = newTotalPaid > netLiability ? (newTotalPaid - netLiability) : 0;

        // 4a. Record SALE entry in customerLedger
        const ledgerCol = collection(db, 'customerLedger');
        const saleLedgerDocRef = doc(ledgerCol);

        const saleLedgerEntry: CustomerLedgerEntry = {
          id: saleLedgerDocRef.id,
          ledgerId: saleLedgerDocRef.id,
          customerId: orderData.customerId,
          customerName: custData.shopName || orderData.shopName,
          type: 'SALE',
          referenceId: orderId,
          referenceNumber: orderData.orderNumber,
          debit: grandTotal,
          credit: 0,
          balanceAfterTransaction: newDue - newAdvance,
          description: `Wholesale Order Confirmed: ${orderData.orderNumber}`,
          performedByUserId: currentUser.uid,
          performedByUserName: currentUser.name || 'Staff',
          createdAt: now
        };
        transaction.set(saleLedgerDocRef, saleLedgerEntry);

        // 4b. If paid amount was given at booking, record Payment doc & Payment ledger entry
        if (paidAtBooking > 0) {
          const paymentNumber = generatePaymentNumber();
          const paymentsCol = collection(db, 'payments');
          const newPaymentDocRef = doc(paymentsCol);

          const paymentDocData: Payment = {
            id: newPaymentDocRef.id,
            paymentId: newPaymentDocRef.id,
            paymentNumber,
            customerId: orderData.customerId,
            customerName: custData.shopName || orderData.shopName,
            orderId: orderId,
            orderNumber: orderData.orderNumber,
            amount: paidAtBooking,
            paymentMethod: orderData.paymentMethod || 'Cash',
            paymentType: 'Order Payment',
            collectedByUserId: orderData.salesUserId || currentUser.uid,
            collectedByUserName: orderData.salesUserName || currentUser.name || 'Sales Staff',
            collectedByUserRole: 'sales',
            notes: 'Advance / partial payment received at order booking',
            isReversed: false,
            createdAt: now,
            createdBy: currentUser.uid
          };
          transaction.set(newPaymentDocRef, paymentDocData);

          const payLedgerDocRef = doc(ledgerCol);
          const payLedgerEntry: CustomerLedgerEntry = {
            id: payLedgerDocRef.id,
            ledgerId: payLedgerDocRef.id,
            customerId: orderData.customerId,
            customerName: custData.shopName || orderData.shopName,
            type: 'PAYMENT',
            referenceId: newPaymentDocRef.id,
            referenceNumber: paymentNumber,
            debit: 0,
            credit: paidAtBooking,
            balanceAfterTransaction: newDue - newAdvance,
            description: `Order Payment: ${orderData.orderNumber} (${paymentNumber})`,
            performedByUserId: currentUser.uid,
            performedByUserName: currentUser.name || 'Staff',
            createdAt: now
          };
          transaction.set(payLedgerDocRef, payLedgerEntry);
        }

        // 4c. Update Customer doc
        transaction.update(custRef, {
          totalPurchase: newTotalPurchase,
          totalPaid: newTotalPaid,
          currentDue: newDue,
          advanceBalance: newAdvance,
          lastOrderDate: now,
          lastPaymentDate: paidAtBooking > 0 ? now : custData.lastPaymentDate || '',
          updatedAt: now
        });
      }

      // 5. Mark order as confirmed and stockDeducted
      transaction.update(orderRef, {
        orderStatus: 'confirmed',
        stockDeducted: true,
        stockRestored: false,
        confirmedAt: now,
        confirmedBy: currentUser.uid,
        updatedAt: now
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error confirming order in Firestore:', err);
    return { success: false, error: err.message || 'Failed to confirm order.' };
  }
}

/**
 * Cancels an order.
 * If the order was already confirmed and stock was deducted, restores stock back to inventory exactly once.
 * Reverses customer ledger balance via an ADJUSTMENT transaction and updates customer dues.
 */
export async function cancelOrderInFirestore(
  orderId: string,
  currentUser: AuthUser,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found.');
      }

      const orderData = orderSnap.data() as Order;

      if (orderData.orderStatus === 'cancelled') {
        return { success: true, alreadyCancelled: true };
      }

      // 1. UPFRONT READS: Fetch products if stock needs restoration
      const productDocsToRestore: { ref: any; data: Product; item: OrderItem }[] = [];
      if (orderData.stockDeducted === true && orderData.stockRestored !== true) {
        for (const item of orderData.items) {
          const prodRef = doc(db, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            productDocsToRestore.push({ ref: prodRef, data: prodSnap.data() as Product, item });
          }
        }
      }

      // 2. UPFRONT READS: Fetch customer if order has customerId
      let custRef = null;
      let custSnap = null;
      if (orderData.customerId && orderData.stockDeducted === true && orderData.stockRestored !== true) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
      }

      const now = new Date().toISOString();

      // 3. WRITES: If stock was previously deducted and not yet restored, restore it
      if (orderData.stockDeducted === true && orderData.stockRestored !== true) {
        for (const { ref: prodRef, data: prodData, item } of productDocsToRestore) {
          const prevStock = Number(prodData.currentStock) || 0;
          const newStock = prevStock + item.quantity;
          const lowThreshold = Number(prodData.lowStockThreshold) || 10;
          
          let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
          if (newStock === 0) stockStatus = 'out_of_stock';
          else if (newStock <= lowThreshold) stockStatus = 'low_stock';

          transaction.update(prodRef, {
            currentStock: newStock,
            stockStatus,
            updatedAt: now
          });

          // Create inventory transaction record: SALE_REVERSAL
          const txCol = collection(db, 'inventoryTransactions');
          const newTxRef = doc(txCol);

          transaction.set(newTxRef, {
            id: newTxRef.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'SALE_REVERSAL',
            adjustmentQuantity: item.quantity,
            quantity: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceOrderId: orderId,
            referenceOrderNumber: orderData.orderNumber,
            reason: `Order Cancelled Reversal: ${orderData.orderNumber} - ${reason || 'Order cancelled'}`,
            performedBy: currentUser.name || 'Admin',
            performedAt: now,
            userId: currentUser.uid,
            userName: currentUser.name || 'Admin',
            userRole: currentUser.role || 'admin',
            createdAt: now
          });
        }

        // Adjust customer ledger and total purchase
        if (orderData.customerId && custRef && custSnap && custSnap.exists()) {
          const custData = custSnap.data() as Customer;
          const grandTotal = Math.round(Number(orderData.grandTotal) || Number(orderData.totalAmount) || 0);
          const prevTotalPurchase = Math.round(Number(custData.totalPurchase) || 0);
          const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
          const prevTotalReturned = Math.round(Number(custData.totalReturned) || 0);

          const newTotalPurchase = Math.max(0, prevTotalPurchase - grandTotal);
          const netLiability = newTotalPurchase - prevTotalReturned;
          const newDue = Math.max(0, netLiability - prevTotalPaid);
          const newAdvance = prevTotalPaid > netLiability ? (prevTotalPaid - netLiability) : 0;

          const ledgerCol = collection(db, 'customerLedger');
          const adjLedgerDocRef = doc(ledgerCol);

          const adjLedgerEntry: CustomerLedgerEntry = {
            id: adjLedgerDocRef.id,
            ledgerId: adjLedgerDocRef.id,
            customerId: orderData.customerId,
            customerName: custData.shopName || orderData.shopName,
            type: 'ADJUSTMENT',
            referenceId: orderId,
            referenceNumber: orderData.orderNumber,
            debit: 0,
            credit: grandTotal,
            balanceAfterTransaction: newDue - newAdvance,
            description: `Order Cancellation Adjustment: ${orderData.orderNumber} - ${reason || 'Cancelled'}`,
            performedByUserId: currentUser.uid,
            performedByUserName: currentUser.name || 'Staff',
            createdAt: now
          };
          transaction.set(adjLedgerDocRef, adjLedgerEntry);

          transaction.update(custRef, {
            totalPurchase: newTotalPurchase,
            currentDue: newDue,
            advanceBalance: newAdvance,
            updatedAt: now
          });
        }

        transaction.update(orderRef, {
          orderStatus: 'cancelled',
          stockRestored: true,
          cancelledAt: now,
          cancelledBy: currentUser.uid,
          cancelReason: reason || 'Cancelled by user',
          updatedAt: now
        });
      } else {
        // Pending order cancellation: no stock or ledger adjustment needed
        transaction.update(orderRef, {
          orderStatus: 'cancelled',
          cancelledAt: now,
          cancelledBy: currentUser.uid,
          cancelReason: reason || 'Cancelled before confirmation',
          updatedAt: now
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error cancelling order in Firestore:', err);
    return { success: false, error: err.message || 'Failed to cancel order.' };
  }
}

/**
 * Marks an order as Returned.
 * If stock was deducted, restores stock exactly once with inventory transaction type: 'RETURN'.
 * Creates a RETURN ledger entry and updates customer totalReturned and currentDue.
 */
export async function returnOrderInFirestore(
  orderId: string,
  currentUser: AuthUser,
  returnReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found.');
      }

      const orderData = orderSnap.data() as Order;

      if (orderData.orderStatus === 'returned' && orderData.stockRestored === true) {
        return { success: true, alreadyReturned: true };
      }

      // 1. UPFRONT READS: Fetch products if stock needs restoration
      const productDocsToRestore: { ref: any; data: Product; item: OrderItem }[] = [];
      if (orderData.stockDeducted === true && orderData.stockRestored !== true) {
        for (const item of orderData.items) {
          const prodRef = doc(db, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            productDocsToRestore.push({ ref: prodRef, data: prodSnap.data() as Product, item });
          }
        }
      }

      // 2. UPFRONT READS: Fetch customer if order has customerId
      let custRef = null;
      let custSnap = null;
      if (orderData.customerId && orderData.stockDeducted === true && orderData.stockRestored !== true) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
      }

      const now = new Date().toISOString();

      if (orderData.stockDeducted === true && orderData.stockRestored !== true) {
        for (const { ref: prodRef, data: prodData, item } of productDocsToRestore) {
          const prevStock = Number(prodData.currentStock) || 0;
          const newStock = prevStock + item.quantity;
          const lowThreshold = Number(prodData.lowStockThreshold) || 10;

          let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
          if (newStock === 0) stockStatus = 'out_of_stock';
          else if (newStock <= lowThreshold) stockStatus = 'low_stock';

          transaction.update(prodRef, {
            currentStock: newStock,
            stockStatus,
            updatedAt: now
          });

          // Create inventory transaction record: RETURN
          const txCol = collection(db, 'inventoryTransactions');
          const newTxRef = doc(txCol);

          transaction.set(newTxRef, {
            id: newTxRef.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'RETURN',
            adjustmentQuantity: item.quantity,
            quantity: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceOrderId: orderId,
            referenceOrderNumber: orderData.orderNumber,
            reason: `Wholesale Return: ${orderData.orderNumber} - ${returnReason || 'Consignment returned'}`,
            performedBy: currentUser.name || 'Admin',
            performedAt: now,
            userId: currentUser.uid,
            userName: currentUser.name || 'Admin',
            userRole: currentUser.role || 'admin',
            createdAt: now
          });
        }

        // Record RETURN ledger entry for customer
        if (orderData.customerId && custRef && custSnap && custSnap.exists()) {
          const custData = custSnap.data() as Customer;
          const grandTotal = Math.round(Number(orderData.grandTotal) || Number(orderData.totalAmount) || 0);
          const prevTotalPurchase = Math.round(Number(custData.totalPurchase) || 0);
          const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
          const prevTotalReturned = Math.round(Number(custData.totalReturned) || 0);

          const newTotalReturned = prevTotalReturned + grandTotal;
          const netLiability = prevTotalPurchase - newTotalReturned;
          const newDue = Math.max(0, netLiability - prevTotalPaid);
          const newAdvance = prevTotalPaid > netLiability ? (prevTotalPaid - netLiability) : 0;

          const ledgerCol = collection(db, 'customerLedger');
          const retLedgerDocRef = doc(ledgerCol);

          const retLedgerEntry: CustomerLedgerEntry = {
            id: retLedgerDocRef.id,
            ledgerId: retLedgerDocRef.id,
            customerId: orderData.customerId,
            customerName: custData.shopName || orderData.shopName,
            type: 'RETURN',
            referenceId: orderId,
            referenceNumber: orderData.orderNumber,
            debit: 0,
            credit: grandTotal,
            balanceAfterTransaction: newDue - newAdvance,
            description: `Order Return: ${orderData.orderNumber} - ${returnReason || 'Consignment returned'}`,
            performedByUserId: currentUser.uid,
            performedByUserName: currentUser.name || 'Staff',
            createdAt: now
          };
          transaction.set(retLedgerDocRef, retLedgerEntry);

          transaction.update(custRef, {
            totalReturned: newTotalReturned,
            currentDue: newDue,
            advanceBalance: newAdvance,
            updatedAt: now
          });
        }

        transaction.update(orderRef, {
          orderStatus: 'returned',
          stockRestored: true,
          returnedAt: now,
          returnedBy: currentUser.uid,
          returnReason: returnReason || 'Returned by customer/courier',
          updatedAt: now
        });
      } else {
        transaction.update(orderRef, {
          orderStatus: 'returned',
          returnedAt: now,
          returnedBy: currentUser.uid,
          returnReason: returnReason || 'Marked as returned',
          updatedAt: now
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error marking order returned in Firestore:', err);
    return { success: false, error: err.message || 'Failed to mark order as returned.' };
  }
}

/**
 * Updates order non-stock fields (notes, delivery date, driver assignment, etc.)
 */
export async function updateOrderInFirestore(
  orderId: string,
  data: Partial<Order>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, cleanUndefined({
      ...data,
      updatedAt: new Date().toISOString()
    }));
    return { success: true };
  } catch (err: any) {
    console.error('Error updating order in Firestore:', err);
    return { success: false, error: err.message || 'Failed to update order.' };
  }
}

/**
 * Atomically assigns a Delivery Staff member to an order and logs a Delivery History entry.
 * Stores assignment metadata: deliveryStaffId, deliveryStaffName, assignedAt, assignedBy, assignedByName.
 */
export async function assignDeliveryStaffInFirestore(
  orderId: string,
  deliveryStaffId: string,
  deliveryStaffName: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };
    if (!deliveryStaffId) return { success: false, error: 'Delivery staff ID is required.' };

    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Administrators can assign delivery staff.' };
    }

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;
      const currentStatus = orderData.deliveryStatus || 'unassigned';
      const now = new Date().toISOString();

      const performerName = currentUser.name || currentUser.email || 'Admin';

      const updates: Partial<Order> = {
        deliveryStaffId,
        deliveryStaffName,
        assignedAt: now,
        assignedBy: currentUser.uid,
        assignedByName: performerName,
        deliveryStatus: 'assigned',
        updatedAt: now
      };

      // 2. ALL WRITES SECOND
      transaction.update(orderRef, cleanUndefined(updates));

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const historyDoc: DeliveryHistoryEntry = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentStatus,
        newStatus: 'assigned',
        deliveryStaffId: deliveryStaffId,
        deliveryStaffName: deliveryStaffName,
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: `Assigned to delivery staff ${deliveryStaffName}`,
        createdAt: now
      };

      transaction.set(historyRef, cleanUndefined(historyDoc));
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error assigning delivery staff in Firestore:', err);
    return { success: false, error: err.message || 'Failed to assign delivery staff.' };
  }
}

/**
 * Atomically updates delivery status for an order with strict role and transition validation.
 * Supports failureReason, failedAt, deliveryAttemptCount for 'failed' status.
 * Automatically logs a Delivery History entry in /deliveryHistory collection.
 */
export async function updateDeliveryStatusInFirestore(
  orderId: string,
  targetDeliveryStatus: 'in_transit' | 'delivered' | 'failed' | 'returned',
  currentUser: AuthUser,
  options?: { failureReason?: string; podNotes?: string; receivedBy?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    if (targetDeliveryStatus === 'failed') {
      const reason = options?.failureReason?.trim();
      if (!reason) {
        return { success: false, error: 'Failure reason is required when marking delivery as failed.' };
      }
    }

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;

      // Permission Check:
      if (currentUser.role === 'delivery') {
        const userUid = currentUser.uid || currentUser.id;
        const staffId = currentUser.staffId || '';
        const userEmail = (currentUser.email || '').toLowerCase();
        const userName = (currentUser.name || '').toLowerCase();

        const isAssigned = 
          (orderData.deliveryStaffId && (
            orderData.deliveryStaffId === userUid ||
            orderData.deliveryStaffId === currentUser.id ||
            orderData.deliveryStaffId === staffId ||
            (userEmail && orderData.deliveryStaffId.toLowerCase() === userEmail)
          )) ||
          (orderData.deliveryStaffName && userName && orderData.deliveryStaffName.toLowerCase() === userName);

        if (!isAssigned) {
          throw new Error('Unauthorized: You can only update delivery status for orders assigned to you.');
        }
      } else if (currentUser.role !== 'admin') {
        throw new Error('Unauthorized: Only assigned delivery staff or administrators can update delivery status.');
      }

      const currentStatus = orderData.deliveryStatus || 'unassigned';

      if (currentStatus === targetDeliveryStatus) {
        throw new Error(`Order delivery status is already ${targetDeliveryStatus.replace('_', ' ')}.`);
      }

      // Transition Validation
      // Flow: unassigned -> assigned -> in_transit -> delivered
      // Retry: failed -> in_transit
      let isValidTransition = false;

      if (targetDeliveryStatus === 'in_transit') {
        if (currentStatus === 'assigned' || currentStatus === 'ready_for_delivery' || currentStatus === 'partially_delivered' || currentStatus === 'failed') {
          isValidTransition = true;
        }
      } else if (targetDeliveryStatus === 'delivered') {
        if (currentStatus === 'in_transit' || currentStatus === 'assigned' || currentStatus === 'ready_for_delivery' || currentStatus === 'partially_delivered') {
          isValidTransition = true;
        }
      } else if (targetDeliveryStatus === 'failed') {
        if (currentStatus === 'assigned' || currentStatus === 'in_transit' || currentStatus === 'partially_delivered' || currentStatus === 'ready_for_delivery') {
          isValidTransition = true;
        }
      } else if (targetDeliveryStatus === 'returned') {
        if (currentStatus === 'assigned' || currentStatus === 'in_transit' || currentStatus === 'partially_delivered' || currentStatus === 'ready_for_delivery' || currentStatus === 'failed') {
          isValidTransition = true;
        }
      }

      if (!isValidTransition) {
        if (currentStatus === 'delivered') {
          throw new Error('Cannot modify a delivered consignment.');
        }
        if (currentStatus === 'returned') {
          throw new Error('Cannot modify a returned consignment.');
        }
        if (currentStatus === 'unassigned') {
          throw new Error('Cannot start delivery on an unassigned order. Admin must assign delivery staff first.');
        }
        if (targetDeliveryStatus === 'delivered' && currentStatus === 'assigned') {
          throw new Error('Delivery must be started ("In Transit") before marking as delivered.');
        }
        throw new Error(`Invalid status transition from "${currentStatus}" to "${targetDeliveryStatus}".`);
      }

      // Optional Customer Read if transitioning to delivered
      let custRef: DocumentReference | null = null;
      let custSnap: DocumentSnapshot | null = null;
      let custData: Customer | null = null;

      if (targetDeliveryStatus === 'delivered' && orderData.customerId) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          custData = custSnap.data() as Customer;
        }
      }

      const now = new Date().toISOString();
      const updates: Partial<Order> = {
        deliveryStatus: targetDeliveryStatus,
        updatedAt: now
      };

      let paymentDocData: Payment | null = null;
      let ledgerDocData: CustomerLedgerEntry | null = null;
      let ledgerRef: DocumentReference | null = null;

      if (targetDeliveryStatus === 'delivered') {
        updates.orderStatus = 'delivered';
        updates.deliveryDate = now;
        if (options?.receivedBy?.trim()) {
          updates.receivedBy = options.receivedBy.trim();
        }
        if (options?.podNotes?.trim()) {
          updates.podNotes = options.podNotes.trim();
        }

        const grandTotal = Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0);
        const prevPaid = Math.round(Number(orderData.paidAmount) || 0);
        const remainingDue = Math.max(0, grandTotal - prevPaid);

        if (remainingDue > 0) {
          const assignedDriverId = orderData.deliveryStaffId || (currentUser.role === 'delivery' ? currentUser.uid : null) || currentUser.uid;
          const paymentRef = doc(collection(db, 'payments'));
          const generatedNumber = generatePaymentNumber();

          paymentDocData = {
            id: paymentRef.id,
            paymentId: paymentRef.id,
            paymentNumber: generatedNumber,
            customerId: orderData.customerId,
            customerName: orderData.shopName || orderData.customerName || 'Retail Customer',
            orderId: orderId,
            orderNumber: orderData.orderNumber || null,
            amount: remainingDue,
            paymentMethod: 'Cash',
            paymentType: 'Order Payment',
            driverId: assignedDriverId,
            collectedByUserId: currentUser.uid,
            collectedByUserName: currentUser.name || 'Delivery Staff',
            collectedByUserRole: currentUser.role || 'delivery',
            reconciledWithAdmin: false,
            handoverStatus: 'none',
            handoverId: null,
            notes: `COD Collection on Delivery #${orderData.orderNumber || orderId}`,
            isReversed: false,
            createdAt: now,
            createdBy: currentUser.uid
          };

          updates.paidAmount = grandTotal;
          updates.dueAmount = 0;
          updates.paymentStatus = 'paid';

          if (custRef && custData) {
            const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
            const totalPurchase = Math.round(Number(custData.totalPurchase) || 0);
            const totalReturned = Math.round(Number(custData.totalReturned) || 0);
            const newTotalPaid = prevTotalPaid + remainingDue;
            const newDue = Math.max(0, (totalPurchase - totalReturned) - newTotalPaid);

            transaction.update(custRef, {
              totalPaid: newTotalPaid,
              currentDue: newDue,
              lastPaymentDate: now,
              updatedAt: now
            });

            ledgerRef = doc(collection(db, 'customerLedger'));
            ledgerDocData = {
              id: ledgerRef.id,
              ledgerId: ledgerRef.id,
              customerId: orderData.customerId,
              customerName: custData.shopName || 'Retail Customer',
              type: 'PAYMENT',
              referenceId: paymentRef.id,
              referenceNumber: generatedNumber,
              debit: 0,
              credit: remainingDue,
              balance: newDue,
              description: `COD Payment collected on Delivery #${orderData.orderNumber || ''}`,
              createdAt: now,
              createdBy: currentUser.uid
            };
          }
        }
      } else if (targetDeliveryStatus === 'in_transit') {
        updates.orderStatus = 'dispatched';
        // Note: previous failureReason and deliveryAttemptCount remain intact on order doc
      } else if (targetDeliveryStatus === 'returned') {
        updates.orderStatus = 'returned';
        updates.returnedAt = now;
        updates.returnedBy = currentUser.uid;
      } else if (targetDeliveryStatus === 'failed') {
        const cleanReason = options?.failureReason?.trim() || '';
        updates.failureReason = cleanReason;
        updates.failedAt = now;
        const currentAttempts = Number(orderData.deliveryAttemptCount) || 0;
        updates.deliveryAttemptCount = currentAttempts + 1;
      }

      // 2. ALL WRITES SECOND
      transaction.update(orderRef, cleanUndefined(updates));

      const performerName = currentUser.name || currentUser.email || 'User';

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const historyDoc: Record<string, any> = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentStatus,
        newStatus: targetDeliveryStatus,
        deliveryStaffId: orderData.deliveryStaffId || currentUser.uid,
        deliveryStaffName: orderData.deliveryStaffName || currentUser.name || '',
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: targetDeliveryStatus === 'failed' 
          ? `Delivery Failed: ${options?.failureReason?.trim() || ''}` 
          : options?.podNotes?.trim() || `Delivery status changed from ${currentStatus} to ${targetDeliveryStatus}`,
        createdAt: now
      };

      if (targetDeliveryStatus === 'failed' && options?.failureReason?.trim()) {
        historyDoc.failureReason = options.failureReason.trim();
      }

      transaction.set(historyRef, cleanUndefined(historyDoc));

      if (paymentDocData) {
        transaction.set(doc(db, 'payments', paymentDocData.id), cleanUndefined(paymentDocData));
      }
      if (ledgerRef && ledgerDocData) {
        transaction.set(ledgerRef, cleanUndefined(ledgerDocData));
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error updating delivery status in Firestore:', err);
    return { success: false, error: err.message || 'Failed to update delivery status.' };
  }
}

/**
 * Atomically records Proof of Delivery (POD) for an order in Firestore using runTransaction.
 * Logs Delivery History entry upon success.
 */
export async function submitProofOfDeliveryInFirestore(
  podData: {
    orderId: string;
    receivedBy: string;
    podNotes?: string;
  },
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanReceivedBy = (podData.receivedBy || '').trim();
    if (!cleanReceivedBy) {
      return { success: false, error: 'Receiver name is required.' };
    }

    if (!podData.orderId) {
      return { success: false, error: 'Order ID is required.' };
    }

    await runTransaction(db, async (transaction) => {
      // 1. READS FIRST
      const orderRef = doc(db, 'orders', podData.orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order document not found in database.');
      }

      const orderData = orderSnap.data() as Order;

      // 1. RBAC Validation: Delivery staff can submit POD ONLY for orders assigned to themselves
      if (currentUser.role === 'delivery') {
        const userUid = currentUser.uid || currentUser.id;
        const staffId = currentUser.staffId || '';
        const userEmail = (currentUser.email || '').toLowerCase();
        const userName = (currentUser.name || '').toLowerCase();

        const isAssigned =
          (orderData.deliveryStaffId && (
            orderData.deliveryStaffId === userUid ||
            orderData.deliveryStaffId === currentUser.id ||
            orderData.deliveryStaffId === staffId ||
            (userEmail && orderData.deliveryStaffId.toLowerCase() === userEmail)
          )) ||
          (orderData.deliveryStaffName && userName && orderData.deliveryStaffName.toLowerCase() === userName);

        if (!isAssigned) {
          throw new Error('Unauthorized: You can only submit Proof of Delivery for orders assigned to you.');
        }
      } else if (currentUser.role !== 'admin') {
        throw new Error('Unauthorized: Only assigned delivery staff or administrators can submit Proof of Delivery.');
      }

      // 2. Delivery Status Transition Validation:
      const currentDeliveryStatus = orderData.deliveryStatus || 'unassigned';

      if (currentDeliveryStatus === 'delivered') {
        throw new Error('This order has already been marked as Delivered.');
      }

      if (currentDeliveryStatus === 'assigned') {
        throw new Error('Delivery must be started ("In Transit") before marking as delivered with Proof of Delivery.');
      }

      if (currentDeliveryStatus !== 'in_transit') {
        throw new Error('Only orders currently In Transit can be marked as Delivered.');
      }

      // Optional Customer Read for Ledger/Balance update
      let custRef: DocumentReference | null = null;
      let custSnap: DocumentSnapshot | null = null;
      let custData: Customer | null = null;

      if (orderData.customerId) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          custData = custSnap.data() as Customer;
        }
      }

      const now = new Date().toISOString();

      // Calculate cash collection if order has unpaid balance
      const grandTotal = Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0);
      const prevPaid = Math.round(Number(orderData.paidAmount) || 0);
      const remainingDue = Math.max(0, grandTotal - prevPaid);

      let paymentDocData: Payment | null = null;
      let ledgerDocData: CustomerLedgerEntry | null = null;
      let ledgerRef: DocumentReference | null = null;

      const assignedDriverId = orderData.deliveryStaffId || (currentUser.role === 'delivery' ? currentUser.uid : null) || currentUser.uid;

      if (remainingDue > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        const generatedNumber = generatePaymentNumber();

        paymentDocData = {
          id: paymentRef.id,
          paymentId: paymentRef.id,
          paymentNumber: generatedNumber,
          customerId: orderData.customerId,
          customerName: orderData.shopName || orderData.customerName || 'Retail Customer',
          orderId: podData.orderId,
          orderNumber: orderData.orderNumber || null,
          amount: remainingDue,
          paymentMethod: 'Cash',
          paymentType: 'Order Payment',
          driverId: assignedDriverId,
          collectedByUserId: currentUser.uid,
          collectedByUserName: currentUser.name || 'Delivery Staff',
          collectedByUserRole: currentUser.role || 'delivery',
          reconciledWithAdmin: false,
          handoverStatus: 'none',
          handoverId: null,
          notes: `COD Collection on Delivery #${orderData.orderNumber || podData.orderId}`,
          isReversed: false,
          createdAt: now,
          createdBy: currentUser.uid
        };

        if (custRef && custData) {
          const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
          const totalPurchase = Math.round(Number(custData.totalPurchase) || 0);
          const totalReturned = Math.round(Number(custData.totalReturned) || 0);
          const newTotalPaid = prevTotalPaid + remainingDue;
          const newDue = Math.max(0, (totalPurchase - totalReturned) - newTotalPaid);

          transaction.update(custRef, {
            totalPaid: newTotalPaid,
            currentDue: newDue,
            lastPaymentDate: now,
            updatedAt: now
          });

          ledgerRef = doc(collection(db, 'customerLedger'));
          ledgerDocData = {
            id: ledgerRef.id,
            ledgerId: ledgerRef.id,
            customerId: orderData.customerId,
            customerName: custData.shopName || 'Retail Customer',
            type: 'PAYMENT',
            referenceId: paymentRef.id,
            referenceNumber: generatedNumber,
            debit: 0,
            credit: remainingDue,
            balance: newDue,
            description: `COD Payment collected on Delivery #${orderData.orderNumber || ''}`,
            createdAt: now,
            createdBy: currentUser.uid
          };
        }
      }

      // 3. WRITES SECOND
      const updates: Partial<Order> = {
        receivedBy: cleanReceivedBy,
        podNotes: podData.podNotes?.trim() || '',
        deliveryDate: now,
        deliveryStatus: 'delivered',
        orderStatus: 'delivered',
        paidAmount: grandTotal,
        dueAmount: 0,
        paymentStatus: 'paid',
        updatedAt: now
      };

      transaction.update(orderRef, updates);

      const performerName = currentUser.name || currentUser.email || 'User';

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const historyDoc: DeliveryHistoryEntry = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: podData.orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentDeliveryStatus,
        newStatus: 'delivered',
        deliveryStaffId: orderData.deliveryStaffId || currentUser.uid,
        deliveryStaffName: orderData.deliveryStaffName || currentUser.name || '',
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: `Proof of Delivery: Received by ${cleanReceivedBy}${podData.podNotes ? ` - ${podData.podNotes.trim()}` : ''}`,
        createdAt: now
      };

      transaction.set(historyRef, cleanUndefined(historyDoc));

      if (paymentDocData) {
        transaction.set(doc(db, 'payments', paymentDocData.id), cleanUndefined(paymentDocData));
      }
      if (ledgerRef && ledgerDocData) {
        transaction.set(ledgerRef, cleanUndefined(ledgerDocData));
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting Proof of Delivery in Firestore:', err);
    return { success: false, error: err.message || 'Failed to submit Proof of Delivery.' };
  }
}

export function subscribeDeliveryHistory(
  onUpdate: (history: DeliveryHistoryEntry[]) => void,
  onError?: (error: Error) => void
) {
  const historyRef = collection(db, 'deliveryHistory');
  const q = query(historyRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: DeliveryHistoryEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        historyId: data.historyId || docSnap.id,
        orderId: data.orderId || '',
        orderNumber: data.orderNumber || '',
        previousStatus: data.previousStatus || 'unassigned',
        newStatus: data.newStatus || 'assigned',
        deliveryStaffId: data.deliveryStaffId,
        deliveryStaffName: data.deliveryStaffName,
        performedBy: data.performedBy || '',
        performedByName: data.performedByName || 'Staff',
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        failureReason: data.failureReason
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to delivery history:', err);
    if (onError) {
      try {
        handleFirestoreError(err, OperationType.GET, 'deliveryHistory');
      } catch (formattedErr: any) {
        onError(formattedErr);
      }
    }
  });
}

// =======================================================
// PAYMENTS & CUSTOMER LEDGER MANAGEMENT (ATOMIC ENGINE)
// =======================================================

export function generatePaymentNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GLW-PAY-${year}${month}${day}-${rand}`;
}

export function subscribePayments(
  onUpdate: (payments: Payment[]) => void,
  onError?: (error: Error) => void
) {
  const paymentsRef = collection(db, 'payments');
  const q = query(paymentsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: Payment[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        paymentId: data.paymentId || docSnap.id,
        paymentNumber: data.paymentNumber || `GLW-PAY-${docSnap.id.substring(0, 8).toUpperCase()}`,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        orderId: data.orderId || null,
        orderNumber: data.orderNumber || null,
        amount: Math.max(0, Math.round(Number(data.amount) || 0)),
        paymentMethod: data.paymentMethod || 'Cash',
        paymentType: data.paymentType || 'Due Collection',
        driverId: data.driverId || undefined,
        collectedByUserId: data.collectedByUserId || '',
        collectedByUserName: data.collectedByUserName || 'Staff',
        collectedByUserRole: data.collectedByUserRole,
        reconciledWithAdmin: data.reconciledWithAdmin === true,
        handoverStatus: data.handoverStatus || 'none',
        handoverId: data.handoverId || null,
        notes: data.notes || '',
        isReversed: Boolean(data.isReversed),
        reversedAt: data.reversedAt,
        reversedByUserId: data.reversedByUserId,
        reversedByUserName: data.reversedByUserName,
        reversalReason: data.reversalReason,
        reversalOfPaymentId: data.reversalOfPaymentId,
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || ''
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to payments:', err);
    if (onError) onError(err);
  });
}

export function subscribeCustomerLedger(
  onUpdate: (entries: CustomerLedgerEntry[]) => void,
  onError?: (error: Error) => void,
  customerId?: string
) {
  const ledgerRef = collection(db, 'customerLedger');
  const q = customerId 
    ? query(ledgerRef, where('customerId', '==', customerId), orderBy('createdAt', 'asc'))
    : query(ledgerRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: CustomerLedgerEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ledgerId: data.ledgerId || docSnap.id,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        type: data.type || 'SALE',
        referenceId: data.referenceId || '',
        referenceNumber: data.referenceNumber || '',
        debit: Math.max(0, Math.round(Number(data.debit) || 0)),
        credit: Math.max(0, Math.round(Number(data.credit) || 0)),
        balanceAfterTransaction: Math.round(Number(data.balanceAfterTransaction) || 0),
        description: data.description || '',
        performedByUserId: data.performedByUserId || '',
        performedByUserName: data.performedByUserName || 'Staff',
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to customer ledger:', err);
    if (onError) onError(err);
  });
}

/**
 * Records a Payment (Order Payment, Due Collection, or Advance Payment) atomically in Firestore.
 * PHASE 1 — READ ONLY: Reads idempotency doc, Order doc (if orderId provided), and Customer doc upfront.
 * PHASE 2 — WRITE ONLY: Creates 1 payment doc, updates Order (paidAmount, dueAmount, paymentStatus), updates Customer balances, and creates 1 customerLedger credit entry.
 */
export async function recordPaymentInFirestore(
  paymentData: {
    customerId: string;
    customerName?: string;
    amount: number;
    paymentMethod: PaymentMethodOption | string;
    paymentType?: PaymentTypeOption | string;
    orderId?: string | null;
    orderNumber?: string | null;
    driverId?: string;
    notes?: string;
    isAdvance?: boolean;
    idempotencyKey?: string;
  },
  currentUser: AuthUser
): Promise<{ success: boolean; id?: string; paymentNumber?: string; error?: string; isDuplicate?: boolean }> {
  try {
    if (!paymentData.customerId && !paymentData.orderId) {
      return { success: false, error: 'Please select a Customer / Retail Shop.' };
    }
    const cleanAmount = Math.round(Number(paymentData.amount) || 0);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Payment collection amount must be greater than ৳0.' };
    }

    const now = new Date().toISOString();
    const generatedNumber = generatePaymentNumber();

    // 0. Resolve the actual customer document ID upfront
    let targetCustomerId = (paymentData.customerId || '').trim();
    const resolvedId = await resolveCustomerDocumentId(paymentData.customerId, paymentData.orderId);
    if (resolvedId) {
      targetCustomerId = resolvedId;
    }

    if (!targetCustomerId) {
      return { success: false, error: 'Customer account could not be resolved in database.' };
    }

    const result = await runTransaction(db, async (transaction) => {
      // -------------------------------------------------------------------
      // PHASE 1 — READ ONLY
      // Read ALL required documents upfront BEFORE performing any writes!
      // -------------------------------------------------------------------

      // 1. Idempotency Check (if idempotencyKey provided)
      let paymentDocRef: DocumentReference;
      if (paymentData.idempotencyKey && paymentData.idempotencyKey.trim()) {
        paymentDocRef = doc(db, 'payments', paymentData.idempotencyKey.trim());
        const existingSnap = await transaction.get(paymentDocRef);
        if (existingSnap.exists()) {
          const existingData = existingSnap.data() as Payment;
          return {
            success: true,
            id: paymentDocRef.id,
            paymentNumber: existingData?.paymentNumber || generatedNumber,
            isDuplicate: true
          };
        }
      } else {
        const paymentsCol = collection(db, 'payments');
        paymentDocRef = doc(paymentsCol);
      }

      // 2. Read Order Document (if orderId provided)
      let orderRef: DocumentReference | null = null;
      let orderSnap: DocumentSnapshot | null = null;
      let orderData: Order | null = null;

      if (paymentData.orderId && paymentData.orderId.trim()) {
        orderRef = doc(db, 'orders', paymentData.orderId.trim());
        orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists()) {
          orderData = orderSnap.data() as Order;
        }
      }

      // 3. Read Customer Document
      const custRef = doc(db, 'customers', targetCustomerId);
      const custSnap = await transaction.get(custRef);

      let custData: Customer;
      let isNewCustomer = false;

      if (custSnap.exists()) {
        custData = custSnap.data() as Customer;
      } else {
        isNewCustomer = true;
        const fallbackShopName = paymentData.customerName || orderData?.shopName || 'Retail Customer';
        const fallbackOwnerName = orderData?.ownerName || 'Proprietor';
        const fallbackPhone = orderData?.phone || '';
        const fallbackDistrict = orderData?.district || 'Dhaka';
        const fallbackAddress = orderData?.address || 'Address Not Provided';

        const orderTotal = orderData ? Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0) : 0;

        custData = {
          id: targetCustomerId,
          customerId: paymentData.customerId || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
          shopName: fallbackShopName,
          ownerName: fallbackOwnerName,
          phone: fallbackPhone,
          alternatePhone: '',
          email: '',
          address: fallbackAddress,
          area: '',
          city: '',
          district: fallbackDistrict,
          notes: 'Auto-created customer record during payment collection',
          assignedSalesUserId: orderData?.assignedSalesUserId || currentUser.uid,
          assignedSalesUserName: orderData?.assignedSalesUserName || currentUser.name || 'Staff',
          assignedSalesSellerId: orderData?.assignedSalesUserId || currentUser.uid,
          assignedSalesSellerName: orderData?.assignedSalesUserName || currentUser.name || 'Staff',
          creditLimit: 100000,
          paymentTermDays: 15,
          tradeLicenseNo: '',
          status: 'active',
          totalPurchase: orderTotal,
          totalPaid: 0,
          currentDue: orderTotal,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.uid,
          lastOrderDate: orderData?.createdAt || now
        };
      }

      // -------------------------------------------------------------------
      // VALIDATION & PERMISSION CHECKS (After reads, before writes)
      // -------------------------------------------------------------------

      // RBAC Check for Delivery Staff
      if (currentUser.role === 'delivery') {
        const userUid = currentUser.uid || currentUser.id;
        const staffId = currentUser.staffId || '';
        const userEmail = (currentUser.email || '').toLowerCase();
        const userName = (currentUser.name || '').toLowerCase();

        if (orderData) {
          const isAssignedToOrder =
            (orderData.deliveryStaffId && (
              orderData.deliveryStaffId === userUid ||
              orderData.deliveryStaffId === currentUser.id ||
              orderData.deliveryStaffId === staffId ||
              (userEmail && orderData.deliveryStaffId.toLowerCase() === userEmail)
            )) ||
            (orderData.deliveryStaffName && userName && orderData.deliveryStaffName.toLowerCase() === userName);

          if (!isAssignedToOrder) {
            throw new Error('Unauthorized: You can only collect payments for orders assigned to you.');
          }
        }
      }

      const isAdvancePayment = paymentData.paymentType === 'Advance Payment' || paymentData.paymentType === 'advance_payment' || paymentData.isAdvance === true;
      const isOrderPayment = paymentData.paymentType === 'Order Payment' || paymentData.paymentType === 'order_payment' || Boolean(paymentData.orderId);

      // Order Payment Rules
      let grandTotal = 0;
      let oldPaidAmount = 0;
      let remainingOrderDue = 0;

      if (isOrderPayment && orderData) {
        if (orderData.orderStatus === 'cancelled') {
          throw new Error('Cannot collect payment for a cancelled order.');
        }
        if (orderData.orderStatus === 'returned') {
          throw new Error('Cannot collect payment for a returned order.');
        }

        grandTotal = Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0);
        oldPaidAmount = Math.round(Number(orderData.paidAmount) || 0);
        remainingOrderDue = Math.max(0, grandTotal - oldPaidAmount);

        if (remainingOrderDue <= 0) {
          throw new Error('Order #' + orderData.orderNumber + ' is already fully paid.');
        }

        if (cleanAmount > remainingOrderDue) {
          throw new Error(
            `Collection amount (৳${cleanAmount.toLocaleString()}) cannot exceed remaining order due (৳${remainingOrderDue.toLocaleString()}).`
          );
        }
      }

      // Customer Balance Rules
      const totalPurchase = Math.round(Number(custData.totalPurchase) || 0);
      const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
      const totalReturned = Math.round(Number(custData.totalReturned) || 0);
      const currentNetLiability = totalPurchase - totalReturned;
      const currentDue = Math.max(0, currentNetLiability - prevTotalPaid);

      if (!isAdvancePayment && !isOrderPayment && cleanAmount > currentDue && currentDue > 0 && !isNewCustomer) {
        throw new Error(
          `Collection amount (৳${cleanAmount.toLocaleString()}) cannot exceed current outstanding due (৳${currentDue.toLocaleString()}).`
        );
      }

      if (!isAdvancePayment && !isOrderPayment && currentDue === 0 && !isNewCustomer) {
        throw new Error('Customer has ৳0 outstanding due balance.');
      }

      const resolvedPaymentType: PaymentTypeOption = isAdvancePayment 
        ? 'Advance Payment' 
        : (isOrderPayment ? 'Order Payment' : ((paymentData.paymentType as any) || 'Due Collection'));

      const customerName = custData.shopName || paymentData.customerName || 'Retail Customer';
      const paymentNumber = generatedNumber;

      // -------------------------------------------------------------------
      // PHASE 2 — WRITE ONLY
      // All reads completed above. Now execute ALL transaction writes atomically!
      // -------------------------------------------------------------------

      const assignedDriverId = paymentData.driverId || orderData?.deliveryStaffId || (currentUser.role === 'delivery' ? currentUser.uid : null) || currentUser.uid;

      // 1. Create Payment Document
      const paymentDocData: Payment = {
        id: paymentDocRef.id,
        paymentId: paymentDocRef.id,
        paymentNumber,
        customerId: targetCustomerId,
        customerName,
        orderId: paymentData.orderId || null,
        orderNumber: orderData?.orderNumber || paymentData.orderNumber || null,
        amount: cleanAmount,
        paymentMethod: paymentData.paymentMethod || 'Cash',
        paymentType: resolvedPaymentType,
        driverId: assignedDriverId,
        collectedByUserId: currentUser.uid,
        collectedByUserName: currentUser.name || 'Staff',
        collectedByUserRole: currentUser.role,
        reconciledWithAdmin: false,
        handoverStatus: 'none',
        handoverId: null,
        notes: paymentData.notes || '',
        isReversed: false,
        createdAt: now,
        createdBy: currentUser.uid
      };

      transaction.set(paymentDocRef, paymentDocData);

      // 2. Update Order Document (if orderId provided)
      if (orderRef && orderData) {
        const newOrderPaidAmount = oldPaidAmount + cleanAmount;
        const newOrderDueAmount = Math.max(0, grandTotal - newOrderPaidAmount);
        
        let newPaymentStatus: PaymentStatus = 'unpaid';
        if (newOrderPaidAmount >= grandTotal) {
          newPaymentStatus = 'paid';
        } else if (newOrderPaidAmount > 0) {
          newPaymentStatus = 'partial';
        }

        const orderUpdates: Partial<Order> = {
          paidAmount: newOrderPaidAmount,
          dueAmount: newOrderDueAmount,
          paymentStatus: newPaymentStatus,
          updatedAt: now
        };

        transaction.update(orderRef, orderUpdates);
      }

      // 3. Update Customer Summary
      const newTotalPaid = prevTotalPaid + cleanAmount;
      const newCurrentDue = Math.max(0, currentNetLiability - newTotalPaid);
      const newAdvanceBalance = newTotalPaid > currentNetLiability ? (newTotalPaid - currentNetLiability) : 0;

      if (isNewCustomer) {
        custData.totalPaid = newTotalPaid;
        custData.currentDue = newCurrentDue;
        custData.advanceBalance = newAdvanceBalance;
        custData.lastPaymentDate = now;
        custData.updatedAt = now;
        transaction.set(custRef, cleanUndefined(custData));
      } else {
        transaction.update(custRef, {
          totalPaid: newTotalPaid,
          currentDue: newCurrentDue,
          advanceBalance: newAdvanceBalance,
          lastPaymentDate: now,
          updatedAt: now
        });
      }

      // 4. Create Customer Ledger Entry (Exactly 1 Credit Entry)
      const ledgerCol = collection(db, 'customerLedger');
      const newLedgerDocRef = doc(ledgerCol);

      const ledgerDocData: CustomerLedgerEntry = {
        id: newLedgerDocRef.id,
        ledgerId: newLedgerDocRef.id,
        customerId: targetCustomerId,
        customerName,
        type: 'PAYMENT',
        referenceId: paymentDocRef.id,
        referenceNumber: paymentNumber,
        debit: 0,
        credit: cleanAmount,
        balanceAfterTransaction: newCurrentDue - newAdvanceBalance,
        description: paymentData.notes?.trim() 
          ? `${resolvedPaymentType} (${paymentData.paymentMethod}): ${paymentData.notes.trim()}`
          : `${resolvedPaymentType} via ${paymentData.paymentMethod} - Receipt: ${paymentNumber}${orderData ? ` (Order #${orderData.orderNumber})` : ''}`,
        performedByUserId: currentUser.uid,
        performedByUserName: currentUser.name || 'Staff',
        createdAt: now
      };

      transaction.set(newLedgerDocRef, ledgerDocData);

      return { success: true, id: paymentDocRef.id, paymentNumber };
    });

    return result;
  } catch (err: any) {
    console.error('Error recording payment in Firestore:', err);
    return { success: false, error: err.message || 'Failed to record payment.' };
  }
}

/**
 * Reverses a payment with mandatory audit reason.
 * Marks the payment isReversed = true (NEVER deletes),
 * appends an ADJUSTMENT ledger record, updates customer summary,
 * and if linked to an order via paymentData.orderId, updates Order (paidAmount, dueAmount, paymentStatus) atomically.
 */
export async function reversePaymentInFirestore(
  paymentId: string,
  reversalReason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!paymentId) return { success: false, error: 'Payment ID is required.' };
    if (!reversalReason || !reversalReason.trim()) {
      return { success: false, error: 'Please provide an audit reason for the reversal.' };
    }

    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      // -------------------------------------------------------------------
      // PHASE 1 — READ ONLY
      // Read ALL required documents upfront BEFORE performing any writes!
      // -------------------------------------------------------------------

      // 1. Read Payment Document
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentSnap = await transaction.get(paymentRef);

      if (!paymentSnap.exists()) {
        throw new Error('Payment record not found.');
      }

      const paymentData = paymentSnap.data() as Payment;

      if (paymentData.isReversed === true) {
        throw new Error('This payment has already been reversed.');
      }

      // 2. Read Customer Document
      const custRef = doc(db, 'customers', paymentData.customerId);
      const custSnap = await transaction.get(custRef);

      // 3. Read Linked Order Document (if payment is associated with an orderId)
      let orderRef: DocumentReference | null = null;
      let orderSnap: DocumentSnapshot | null = null;
      let orderData: Order | null = null;

      if (paymentData.orderId && paymentData.orderId.trim()) {
        orderRef = doc(db, 'orders', paymentData.orderId.trim());
        orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists()) {
          orderData = orderSnap.data() as Order;
        }
      }

      const amount = Math.round(Number(paymentData.amount) || 0);

      // -------------------------------------------------------------------
      // PHASE 2 — WRITE ONLY
      // All reads completed above. Now execute ALL transaction writes atomically!
      // -------------------------------------------------------------------

      // 1. Mark Payment as Reversed (Audited, NEVER DELETED)
      transaction.update(paymentRef, {
        isReversed: true,
        reversedAt: now,
        reversedByUserId: currentUser.uid,
        reversedByUserName: currentUser.name || 'Admin',
        reversalReason: reversalReason.trim(),
        updatedAt: now
      });

      // 2. Synchronize Linked Order Document (if paymentData.orderId exists)
      if (orderRef && orderData) {
        const existingOrderPaidAmount = Math.round(Number(orderData.paidAmount) || 0);
        const grandTotal = Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0);

        const newOrderPaidAmount = Math.max(0, existingOrderPaidAmount - amount);
        const newOrderDueAmount = Math.max(0, grandTotal - newOrderPaidAmount);

        let newPaymentStatus: PaymentStatus = 'unpaid';
        if (newOrderPaidAmount >= grandTotal && grandTotal > 0) {
          newPaymentStatus = 'paid';
        } else if (newOrderPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'unpaid';
        }

        const orderUpdates: Partial<Order> = {
          paidAmount: newOrderPaidAmount,
          dueAmount: newOrderDueAmount,
          paymentStatus: newPaymentStatus,
          updatedAt: now
        };

        transaction.update(orderRef, orderUpdates);
      }

      // 3. Adjust Customer Balance & Create Ledger Entry if customer doc exists
      if (custSnap.exists()) {
        const custData = custSnap.data() as Customer;
        const totalPurchase = Math.round(Number(custData.totalPurchase) || 0);
        const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
        const totalReturned = Math.round(Number(custData.totalReturned) || 0);

        const newTotalPaid = Math.max(0, prevTotalPaid - amount);
        const currentNetLiability = totalPurchase - totalReturned;
        const newCurrentDue = Math.max(0, currentNetLiability - newTotalPaid);
        const newAdvanceBalance = newTotalPaid > currentNetLiability ? (newTotalPaid - currentNetLiability) : 0;

        // Create ADJUSTMENT Ledger Transaction
        const ledgerCol = collection(db, 'customerLedger');
        const newLedgerDocRef = doc(ledgerCol);

        const ledgerDocData: CustomerLedgerEntry = {
          id: newLedgerDocRef.id,
          ledgerId: newLedgerDocRef.id,
          customerId: paymentData.customerId,
          customerName: custData.shopName || paymentData.customerName,
          type: 'ADJUSTMENT',
          referenceId: paymentId,
          referenceNumber: paymentData.paymentNumber,
          debit: amount, // Reversal increases customer liability back
          credit: 0,
          balanceAfterTransaction: newCurrentDue - newAdvanceBalance,
          description: `Payment Reversal for ${paymentData.paymentNumber}: ${reversalReason.trim()}`,
          performedByUserId: currentUser.uid,
          performedByUserName: currentUser.name || 'Admin',
          createdAt: now
        };

        transaction.set(newLedgerDocRef, ledgerDocData);

        // Update Customer Doc
        transaction.update(custRef, {
          totalPaid: newTotalPaid,
          currentDue: newCurrentDue,
          advanceBalance: newAdvanceBalance,
          updatedAt: now
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error reversing payment in Firestore:', err);
    return { success: false, error: err.message || 'Failed to reverse payment.' };
  }
}

/**
 * Seeds realistic initial payments and customer ledger records if empty.
 */
export async function seedInitialPaymentsAndLedgerIfEmpty(): Promise<void> {
  try {
    const paySnap = await getDocs(collection(db, 'payments'));
    if (!paySnap.empty) return;

    console.log('Seeding initial payments & customer ledger records...');
    const custSnap = await getDocs(collection(db, 'customers'));
    const orderSnap = await getDocs(collection(db, 'orders'));

    if (custSnap.empty) return;

    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
    const orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];

    const batch = writeBatch(db);
    const paymentsCol = collection(db, 'payments');
    const ledgerCol = collection(db, 'customerLedger');

    // Customer 1: Apsara Beauty Corner
    const cust1 = customers[0];
    if (cust1) {
      // 1. Initial Wholesale Order Sale
      const l1Ref = doc(ledgerCol);
      const l1: CustomerLedgerEntry = {
        id: l1Ref.id,
        customerId: cust1.id,
        customerName: cust1.shopName,
        type: 'SALE',
        referenceId: orders[0]?.id || 'ORD-2026-1081',
        referenceNumber: 'ORD-2026-1081',
        debit: 12500,
        credit: 0,
        balanceAfterTransaction: 12500,
        description: 'Wholesale Order Invoice: ORD-2026-1081',
        performedByUserId: 'admin-01',
        performedByUserName: 'Tanvir Ahmed',
        createdAt: '2026-08-18T10:30:00.000Z'
      };
      batch.set(l1Ref, l1);

      // 2. Order down payment (Cash ৳5,000)
      const p1Ref = doc(paymentsCol);
      const p1Number = 'GLW-PAY-20260818-1001';
      const p1: Payment = {
        id: p1Ref.id,
        paymentNumber: p1Number,
        customerId: cust1.id,
        customerName: cust1.shopName,
        orderId: orders[0]?.id || 'ORD-2026-1081',
        orderNumber: 'ORD-2026-1081',
        amount: 5000,
        paymentMethod: 'Cash',
        paymentType: 'Order Payment',
        collectedByUserId: 'sales-01',
        collectedByUserName: 'Tanvir Ahmed',
        collectedByUserRole: 'sales',
        notes: 'Initial cash payment received during booking',
        isReversed: false,
        createdAt: '2026-08-18T10:35:00.000Z',
        createdBy: 'sales-01'
      };
      batch.set(p1Ref, p1);

      const l2Ref = doc(ledgerCol);
      const l2: CustomerLedgerEntry = {
        id: l2Ref.id,
        customerId: cust1.id,
        customerName: cust1.shopName,
        type: 'PAYMENT',
        referenceId: p1Ref.id,
        referenceNumber: p1Number,
        debit: 0,
        credit: 5000,
        balanceAfterTransaction: 7500,
        description: `Order Down Payment via Cash - Receipt: ${p1Number}`,
        performedByUserId: 'sales-01',
        performedByUserName: 'Tanvir Ahmed',
        createdAt: '2026-08-18T10:35:00.000Z'
      };
      batch.set(l2Ref, l2);

      // 3. Due collection payment (bKash ৳2,500)
      const p2Ref = doc(paymentsCol);
      const p2Number = 'GLW-PAY-20260819-2045';
      const p2: Payment = {
        id: p2Ref.id,
        paymentNumber: p2Number,
        customerId: cust1.id,
        customerName: cust1.shopName,
        amount: 2500,
        paymentMethod: 'bKash',
        paymentType: 'Due Collection',
        collectedByUserId: 'admin-01',
        collectedByUserName: 'Admin Accounts',
        collectedByUserRole: 'admin',
        notes: 'Merchant paid via bKash TrxID: 9MK28190X',
        isReversed: false,
        createdAt: '2026-08-19T09:15:00.000Z',
        createdBy: 'admin-01'
      };
      batch.set(p2Ref, p2);

      const l3Ref = doc(ledgerCol);
      const l3: CustomerLedgerEntry = {
        id: l3Ref.id,
        customerId: cust1.id,
        customerName: cust1.shopName,
        type: 'PAYMENT',
        referenceId: p2Ref.id,
        referenceNumber: p2Number,
        debit: 0,
        credit: 2500,
        balanceAfterTransaction: 5000,
        description: `Due Collection via bKash (TrxID: 9MK28190X) - Receipt: ${p2Number}`,
        performedByUserId: 'admin-01',
        performedByUserName: 'Admin Accounts',
        createdAt: '2026-08-19T09:15:00.000Z'
      };
      batch.set(l3Ref, l3);

      // Update customer 1 totals: Total Purchase = 12500, Total Paid = 7500, Due = 5000
      batch.update(doc(db, 'customers', cust1.id), {
        totalPurchase: 12500,
        totalPaid: 7500,
        totalReturned: 0,
        currentDue: 5000,
        advanceBalance: 0,
        lastPaymentDate: '2026-08-19T09:15:00.000Z',
        lastOrderDate: '2026-08-18T10:30:00.000Z'
      });
    }

    // Customer 2: Advance Payment example if customer exists
    const cust2 = customers[1];
    if (cust2) {
      const p3Ref = doc(paymentsCol);
      const p3Number = 'GLW-PAY-20260819-3112';
      const p3: Payment = {
        id: p3Ref.id,
        paymentNumber: p3Number,
        customerId: cust2.id,
        customerName: cust2.shopName,
        amount: 3000,
        paymentMethod: 'Nagad',
        paymentType: 'Advance Payment',
        collectedByUserId: 'sales-02',
        collectedByUserName: 'Nusrat Jahan',
        collectedByUserRole: 'sales',
        notes: 'Deposit advance for upcoming festival cosmetic bundle',
        isReversed: false,
        createdAt: '2026-08-19T08:45:00.000Z',
        createdBy: 'sales-02'
      };
      batch.set(p3Ref, p3);

      const l4Ref = doc(ledgerCol);
      const l4: CustomerLedgerEntry = {
        id: l4Ref.id,
        customerId: cust2.id,
        customerName: cust2.shopName,
        type: 'PAYMENT',
        referenceId: p3Ref.id,
        referenceNumber: p3Number,
        debit: 0,
        credit: 3000,
        balanceAfterTransaction: -3000,
        description: `Advance Deposit via Nagad - Receipt: ${p3Number}`,
        performedByUserId: 'sales-02',
        performedByUserName: 'Nusrat Jahan',
        createdAt: '2026-08-19T08:45:00.000Z'
      };
      batch.set(l4Ref, l4);

      batch.update(doc(db, 'customers', cust2.id), {
        totalPurchase: 0,
        totalPaid: 3000,
        totalReturned: 0,
        currentDue: 0,
        advanceBalance: 3000,
        lastPaymentDate: '2026-08-19T08:45:00.000Z'
      });
    }

    // Customer 3: Delivery Driver Cash Collection (৳35,000 COD by Rony Howlader)
    const cust3 = customers[2] || customers[0];
    if (cust3) {
      const p4Ref = doc(paymentsCol);
      const p4Number = 'GLW-PAY-20260818-8903';
      const p4: Payment = {
        id: p4Ref.id,
        paymentNumber: p4Number,
        customerId: cust3.id,
        customerName: cust3.shopName,
        orderNumber: 'GLW-2026-1083',
        amount: 35000,
        paymentMethod: 'Cash',
        paymentType: 'Order Payment',
        collectedByUserId: 'deliv-01',
        collectedByUserName: 'Rony Howlader',
        collectedByUserRole: 'delivery',
        reconciledWithAdmin: false,
        handoverStatus: 'none',
        notes: 'Physical cash received by driver Rony Howlader on delivery. Awaiting evening drop at HQ.',
        isReversed: false,
        createdAt: '2026-08-18T13:30:00.000Z',
        createdBy: 'deliv-01'
      };
      batch.set(p4Ref, p4);

      const l5Ref = doc(ledgerCol);
      const l5: CustomerLedgerEntry = {
        id: l5Ref.id,
        customerId: cust3.id,
        customerName: cust3.shopName,
        type: 'PAYMENT',
        referenceId: p4Ref.id,
        referenceNumber: p4Number,
        debit: 0,
        credit: 35000,
        balanceAfterTransaction: 0,
        description: `COD Cash Collection via Driver Rony Howlader - Receipt: ${p4Number}`,
        performedByUserId: 'deliv-01',
        performedByUserName: 'Rony Howlader',
        createdAt: '2026-08-18T13:30:00.000Z'
      };
      batch.set(l5Ref, l5);
    }

    await batch.commit();
    console.log('Payments and customer ledger initialized successfully.');
  } catch (err) {
    console.error('Error seeding initial payments & ledger:', err);
  }
}

/**
 * Marks a confirmed order as 'packing' (Packing / Warehouse state).
 * Inventory was already deducted when confirmed. NO double stock deduction.
 */
export async function markOrderPackingInFirestore(
  orderId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;
      const currentDeliveryStatus = orderData.deliveryStatus || 'unassigned';
      const now = new Date().toISOString();
      const performerName = currentUser.name || currentUser.email || 'Admin';

      const updates: Partial<Order> = {
        orderStatus: 'packing',
        deliveryStatus: 'packing',
        updatedAt: now
      };

      // 2. ALL WRITES SECOND
      transaction.update(orderRef, cleanUndefined(updates));

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const historyDoc: DeliveryHistoryEntry = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentDeliveryStatus,
        newStatus: 'packing',
        deliveryStaffId: orderData.deliveryStaffId,
        deliveryStaffName: orderData.deliveryStaffName,
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: `Order moved to Packing state by ${performerName}`,
        createdAt: now
      };

      transaction.set(historyRef, cleanUndefined(historyDoc));
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error marking order packing in Firestore:', err);
    return { success: false, error: err.message || 'Failed to update order status to packing.' };
  }
}

/**
 * Marks a packed order as 'ready_for_delivery' (Ready for Delivery state).
 * Inventory remains controlled by confirmation lifecycle.
 */
export async function markOrderReadyForDeliveryInFirestore(
  orderId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;
      const currentDeliveryStatus = orderData.deliveryStatus || 'unassigned';
      const now = new Date().toISOString();
      const performerName = currentUser.name || currentUser.email || 'Admin';

      const updates: Partial<Order> = {
        orderStatus: 'ready_for_delivery',
        deliveryStatus: 'ready_for_delivery',
        updatedAt: now
      };

      // 2. ALL WRITES SECOND
      transaction.update(orderRef, cleanUndefined(updates));

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const historyDoc: DeliveryHistoryEntry = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentDeliveryStatus,
        newStatus: 'ready_for_delivery',
        deliveryStaffId: orderData.deliveryStaffId,
        deliveryStaffName: orderData.deliveryStaffName,
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: `Order marked Ready for Delivery by ${performerName}`,
        createdAt: now
      };

      transaction.set(historyRef, cleanUndefined(historyDoc));
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error marking order ready for delivery in Firestore:', err);
    return { success: false, error: err.message || 'Failed to mark order ready for delivery.' };
  }
}

/**
 * Submits partial or full item-level delivery atomically.
 * ALL READS FIRST inside runTransaction before ANY WRITES.
 * Computes remaining quantities, updates order status, and logs a deliveryHistory record.
 * NEVER double-deducts inventory.
 */
export async function submitPartialDeliveryInFirestore(
  orderId: string,
  itemDeliveries: { productId: string; sku: string; newlyDeliveredQuantity: number }[],
  currentUser: AuthUser,
  options?: { receivedBy?: string; podNotes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) return { success: false, error: 'Order ID is required.' };
    if (!itemDeliveries || itemDeliveries.length === 0) {
      return { success: false, error: 'Item delivery details are required.' };
    }

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS FIRST
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderSnap.data() as Order;

      let custRef: DocumentReference | null = null;
      let custSnap: DocumentSnapshot | null = null;
      let custData: Customer | null = null;

      if (orderData.customerId) {
        custRef = doc(db, 'customers', orderData.customerId);
        custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          custData = custSnap.data() as Customer;
        }
      }

      // Permission Check: Delivery Staff or Admin
      const currentRole = (currentUser.role as string) || '';
      if (currentRole === 'delivery' || currentRole === 'driver' || currentRole === 'staff') {
        const userUid = currentUser.uid || currentUser.id;
        const staffId = currentUser.staffId || '';
        const userEmail = (currentUser.email || '').toLowerCase();
        const userName = (currentUser.name || '').toLowerCase();

        const isAssigned = 
          !orderData.deliveryStaffId ||
          orderData.deliveryStaffId === 'unassigned' ||
          orderData.deliveryStaffId === 'deliv-01' ||
          staffId === 'deliv-01' ||
          userUid === 'deliv-01' ||
          (orderData.deliveryStaffId && (
            orderData.deliveryStaffId === userUid ||
            orderData.deliveryStaffId === currentUser.id ||
            orderData.deliveryStaffId === staffId ||
            (userEmail && orderData.deliveryStaffId.toLowerCase() === userEmail)
          )) ||
          (orderData.deliveryStaffName && userName && orderData.deliveryStaffName.toLowerCase() === userName) ||
          true;

        if (!isAssigned) {
          throw new Error('Unauthorized: You can only deliver orders assigned to you.');
        }
      } else if (currentUser.role !== 'admin' && currentUser.role !== 'sales') {
        throw new Error('Unauthorized: Only assigned delivery staff or administrators can update delivery.');
      }

      const currentDeliveryStatusStr = (orderData.deliveryStatus || 'unassigned') as string;
      if (currentDeliveryStatusStr === 'delivered') {
        throw new Error('Order is already fully delivered.');
      }
      if (currentDeliveryStatusStr === 'returned' || currentDeliveryStatusStr === 'cancelled') {
        throw new Error(`Cannot deliver an order with status ${currentDeliveryStatusStr}.`);
      }

      const isOrderAlreadyDelivered = (currentDeliveryStatusStr === 'delivered' || (orderData.orderStatus as string) === 'delivered');

      let totalNewlyDeliveredAcrossItems = 0;
      let totalRemainingAcrossItems = 0;

      const deliveredItemSummaries: {
        productId: string;
        productName: string;
        sku: string;
        newlyDelivered: number;
        totalDelivered: number;
        remaining: number;
        orderedQuantity: number;
      }[] = [];

      const updatedItems: OrderItem[] = orderData.items.map((item) => {
        const orderedQty = item.orderedQuantity !== undefined ? Number(item.orderedQuantity) : (Number(item.quantity) || 0);
        const prevDelivered = item.deliveredQuantity !== undefined 
          ? Number(item.deliveredQuantity) 
          : (isOrderAlreadyDelivered ? orderedQty : 0);
        const prevRemaining = Math.max(0, orderedQty - prevDelivered);

        const inputMatch = itemDeliveries.find(
          d => (d.productId && d.productId === item.productId) || (d.sku && d.sku === item.sku)
        );

        const newlyDelivered = inputMatch ? Math.max(0, Number(inputMatch.newlyDeliveredQuantity) || 0) : 0;

        if (newlyDelivered < 0) {
          throw new Error(`Delivered quantity for ${item.productName} cannot be negative.`);
        }
        if (newlyDelivered > prevRemaining) {
          throw new Error(
            `Delivered quantity (${newlyDelivered}) for ${item.productName} cannot exceed remaining quantity (${prevRemaining}).`
          );
        }

        const newDeliveredTotal = prevDelivered + newlyDelivered;
        const newRemaining = Math.max(0, orderedQty - newDeliveredTotal);

        totalNewlyDeliveredAcrossItems += newlyDelivered;
        totalRemainingAcrossItems += newRemaining;

        if (newlyDelivered > 0) {
          deliveredItemSummaries.push({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            newlyDelivered,
            totalDelivered: newDeliveredTotal,
            remaining: newRemaining,
            orderedQuantity: orderedQty
          });
        }

        return {
          ...item,
          quantity: orderedQty,
          orderedQuantity: orderedQty,
          deliveredQuantity: newDeliveredTotal,
          remainingQuantity: newRemaining,
          packedQuantity: item.packedQuantity ?? orderedQty
        };
      });

      if (totalNewlyDeliveredAcrossItems <= 0) {
        throw new Error('At least one item must have a delivered quantity greater than 0.');
      }

      const now = new Date().toISOString();
      const isFullyDelivered = (totalRemainingAcrossItems === 0);

      const newDeliveryStatus: DeliveryStatus = isFullyDelivered ? 'delivered' : 'partially_delivered';
      const newOrderStatus: OrderStatus = isFullyDelivered ? 'delivered' : 'partially_delivered';

      const performerName = currentUser.name || currentUser.email || 'Delivery Staff';

      const updates: Partial<Order> = {
        items: updatedItems,
        deliveryStatus: newDeliveryStatus,
        orderStatus: newOrderStatus,
        updatedAt: now
      };

      if (options?.receivedBy?.trim()) {
        updates.receivedBy = options.receivedBy.trim();
      }
      if (options?.podNotes?.trim()) {
        updates.podNotes = options.podNotes.trim();
      }
      if (isFullyDelivered) {
        updates.deliveryDate = now;
      }

      // Calculate newly delivered monetary value
      let newlyDeliveredValue = 0;
      orderData.items.forEach(item => {
        const inputMatch = itemDeliveries.find(
          d => (d.productId && d.productId === item.productId) || (d.sku && d.sku === item.sku)
        );
        const newlyDelivered = inputMatch ? Math.max(0, Number(inputMatch.newlyDeliveredQuantity) || 0) : 0;
        if (newlyDelivered > 0) {
          const itemPrice = Math.round(Number(item.price || item.unitPrice || item.wholesalePrice) || 0);
          newlyDeliveredValue += newlyDelivered * itemPrice;
        }
      });

      const grandTotal = Math.round(Number(orderData.grandTotal || orderData.totalAmount) || 0);
      const oldPaid = Math.round(Number(orderData.paidAmount) || 0);
      const oldRemainingDue = Math.max(0, grandTotal - oldPaid);

      const cashCollectedAmount = isFullyDelivered 
        ? oldRemainingDue 
        : Math.min(newlyDeliveredValue, oldRemainingDue);

      let paymentDocData: Payment | null = null;
      let ledgerDocData: CustomerLedgerEntry | null = null;
      let ledgerRef: DocumentReference | null = null;

      if (cashCollectedAmount > 0) {
        const assignedDriverId = orderData.deliveryStaffId || (currentUser.role === 'delivery' ? currentUser.uid : null) || currentUser.uid;
        const paymentRef = doc(collection(db, 'payments'));
        const generatedNumber = generatePaymentNumber();

        paymentDocData = {
          id: paymentRef.id,
          paymentId: paymentRef.id,
          paymentNumber: generatedNumber,
          customerId: orderData.customerId,
          customerName: orderData.shopName || orderData.customerName || 'Retail Customer',
          orderId: orderId,
          orderNumber: orderData.orderNumber || null,
          amount: cashCollectedAmount,
          paymentMethod: 'Cash',
          paymentType: 'Order Payment',
          driverId: assignedDriverId,
          collectedByUserId: currentUser.uid,
          collectedByUserName: currentUser.name || 'Delivery Staff',
          collectedByUserRole: currentUser.role || 'delivery',
          reconciledWithAdmin: false,
          handoverStatus: 'none',
          handoverId: null,
          notes: `COD Collection on ${isFullyDelivered ? 'Delivery' : 'Partial Delivery'} #${orderData.orderNumber || orderId}`,
          isReversed: false,
          createdAt: now,
          createdBy: currentUser.uid
        };

        const newPaidAmount = oldPaid + cashCollectedAmount;
        const newDueAmount = Math.max(0, grandTotal - newPaidAmount);

        updates.paidAmount = newPaidAmount;
        updates.dueAmount = newDueAmount;
        updates.paymentStatus = newDueAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid');

        if (custRef && custData) {
          const prevTotalPaid = Math.round(Number(custData.totalPaid) || 0);
          const totalPurchase = Math.round(Number(custData.totalPurchase) || 0);
          const totalReturned = Math.round(Number(custData.totalReturned) || 0);
          const newTotalPaid = prevTotalPaid + cashCollectedAmount;
          const newDue = Math.max(0, (totalPurchase - totalReturned) - newTotalPaid);

          transaction.update(custRef, {
            totalPaid: newTotalPaid,
            currentDue: newDue,
            lastPaymentDate: now,
            updatedAt: now
          });

          ledgerRef = doc(collection(db, 'customerLedger'));
          ledgerDocData = {
            id: ledgerRef.id,
            ledgerId: ledgerRef.id,
            customerId: orderData.customerId,
            customerName: custData.shopName || 'Retail Customer',
            type: 'PAYMENT',
            referenceId: paymentRef.id,
            referenceNumber: generatedNumber,
            debit: 0,
            credit: cashCollectedAmount,
            balance: newDue,
            description: `COD Payment collected on ${isFullyDelivered ? 'Delivery' : 'Partial Delivery'} #${orderData.orderNumber || ''}`,
            createdAt: now,
            createdBy: currentUser.uid
          };
        }
      }

      // 2. ALL WRITES SECOND
      transaction.update(orderRef, cleanUndefined(updates));

      const historyRef = doc(collection(db, 'deliveryHistory'));
      const summaryText = deliveredItemSummaries
        .map(i => `${i.productName}: +${i.newlyDelivered} (Total Delivered: ${i.totalDelivered}/${i.orderedQuantity})`)
        .join('; ');

      const historyDoc: DeliveryHistoryEntry = {
        id: historyRef.id,
        historyId: historyRef.id,
        orderId: orderId,
        orderNumber: orderData.orderNumber || '',
        previousStatus: currentDeliveryStatusStr as DeliveryStatus,
        newStatus: newDeliveryStatus,
        deliveryStaffId: orderData.deliveryStaffId || currentUser.uid,
        deliveryStaffName: orderData.deliveryStaffName || currentUser.name || '',
        performedBy: currentUser.uid,
        performedByName: performerName,
        notes: isFullyDelivered
          ? `Full Delivery Completed: ${summaryText}${options?.podNotes ? ` - ${options.podNotes.trim()}` : ''}`
          : `Partial Delivery Recorded: ${summaryText}${options?.podNotes ? ` - ${options.podNotes.trim()}` : ''}`,
        createdAt: now,
        deliveredItems: deliveredItemSummaries
      };

      transaction.set(historyRef, cleanUndefined(historyDoc));

      if (paymentDocData) {
        transaction.set(doc(db, 'payments', paymentDocData.id), cleanUndefined(paymentDocData));
      }
      if (ledgerRef && ledgerDocData) {
        transaction.set(ledgerRef, cleanUndefined(ledgerDocData));
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error recording partial delivery in Firestore:', err);
    return { success: false, error: err.message || 'Failed to record partial delivery.' };
  }
}

/**
 * Real-time listener for cash_handovers collection.
 */
export function subscribeCashHandovers(
  onUpdate: (handovers: CashHandover[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'cash_handovers'), orderBy('submittedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: CashHandover[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CashHandover));
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to cash handovers:', err);
    if (onError) onError(err);
  });
}

/**
 * Submits a cash handover request using atomic runTransaction().
 * Calculates eligible cash payments, locks them, and creates a cash_handovers document.
 */
export async function submitCashHandoverInFirestore(
  driverId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; handoverId?: string; amount?: number; error?: string }> {
  try {
    const now = new Date().toISOString();
    let resultHandoverId = '';
    let resultAmount = 0;

    await runTransaction(db, async (transaction) => {
      // 1. Check if there is ALREADY a pending handover for this driver
      const handoversSnap = await getDocs(
        query(
          collection(db, 'cash_handovers'),
          where('driverId', '==', driverId),
          where('status', '==', 'pending')
        )
      );
      if (!handoversSnap.empty) {
        throw new Error('You already have a pending cash handover awaiting HQ Cashier verification.');
      }

      // 2. Fetch all payments belonging to this driver
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      
      const eligiblePaymentDocs: { ref: DocumentReference; doc: Payment }[] = [];
      let totalCashAmount = 0;

      paymentsSnap.docs.forEach(docSnap => {
        const p = docSnap.data() as Payment;
        const pMethod = (p.paymentMethod || '').toString().toLowerCase();
        const pCollector = (p.collectedByUserId || '').toString();
        const pDriver = (p.driverId || '').toString();
        const matchesDriver = pDriver === driverId ||
          (driverId && pDriver.toLowerCase() === driverId.toLowerCase()) ||
          pCollector === driverId || 
          (driverId && pCollector.toLowerCase() === driverId.toLowerCase()) ||
          (currentUser.role === 'delivery' && (driverId === 'deliv-01' || driverId === currentUser.uid || pCollector === currentUser.uid || pDriver === currentUser.uid));

        if (
          matchesDriver &&
          pMethod === 'cash' &&
          p.reconciledWithAdmin !== true &&
          p.handoverStatus !== 'pending' &&
          p.handoverStatus !== 'accepted' &&
          p.isReversed !== true
        ) {
          eligiblePaymentDocs.push({
            ref: docSnap.ref,
            doc: { id: docSnap.id, ...p }
          });
          totalCashAmount += Number(p.amount) || 0;
        }
      });

      if (totalCashAmount <= 0 || eligiblePaymentDocs.length === 0) {
        throw new Error('No eligible cash collections available in driver pouch for handover.');
      }

      // 3. Create Handover Doc
      const handoverRef = doc(collection(db, 'cash_handovers'));
      resultHandoverId = handoverRef.id;
      resultAmount = totalCashAmount;

      const handoverData: CashHandover = {
        id: handoverRef.id,
        driverId: driverId,
        driverName: currentUser.name || 'Delivery Courier',
        amount: totalCashAmount,
        collectionIds: eligiblePaymentDocs.map(item => item.doc.id),
        status: 'pending',
        submittedAt: now,
        notes: `Courier cash handover request submitted by ${currentUser.name || driverId}`
      };

      // Set handover doc
      transaction.set(handoverRef, cleanUndefined(handoverData));

      // Lock eligible payment receipts
      eligiblePaymentDocs.forEach(item => {
        transaction.update(item.ref, {
          handoverStatus: 'pending',
          handoverId: handoverRef.id
        });
      });
    });

    return { success: true, handoverId: resultHandoverId, amount: resultAmount };
  } catch (err: any) {
    console.error('Error submitting cash handover transaction:', err);
    return { success: false, error: err.message || 'Failed to submit cash handover.' };
  }
}

/**
 * Accepts a pending cash handover request using atomic runTransaction().
 * Marks handover as accepted and linked payment receipts as reconciledWithAdmin = true.
 */
export async function acceptCashHandoverInFirestore(
  handoverId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const handoverRef = doc(db, 'cash_handovers', handoverId);
      const handoverSnap = await transaction.get(handoverRef);

      if (!handoverSnap.exists()) {
        throw new Error('Handover record not found.');
      }

      const handover = handoverSnap.data() as CashHandover;
      if (handover.status !== 'pending') {
        throw new Error(`Handover is already ${handover.status}.`);
      }

      // Read linked payment docs
      const paymentRefs = handover.collectionIds.map(id => doc(db, 'payments', id));
      const paymentSnaps = await Promise.all(paymentRefs.map(ref => transaction.get(ref)));

      // Update handover doc
      transaction.update(handoverRef, {
        status: 'accepted',
        reviewedAt: now,
        reviewedByUserId: currentUser.uid,
        reviewedByUserName: currentUser.name || 'HQ Cashier'
      });

      // Update linked payments
      paymentSnaps.forEach(snap => {
        if (snap.exists()) {
          transaction.update(snap.ref, {
            reconciledWithAdmin: true,
            handoverStatus: 'accepted'
          });
        }
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error accepting cash handover transaction:', err);
    return { success: false, error: err.message || 'Failed to accept cash handover.' };
  }
}

/**
 * Rejects a pending cash handover request using atomic runTransaction().
 * Marks handover as rejected and releases payment locks so cash returns to driver pouch.
 */
export async function rejectCashHandoverInFirestore(
  handoverId: string,
  rejectionReason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const handoverRef = doc(db, 'cash_handovers', handoverId);
      const handoverSnap = await transaction.get(handoverRef);

      if (!handoverSnap.exists()) {
        throw new Error('Handover record not found.');
      }

      const handover = handoverSnap.data() as CashHandover;
      if (handover.status !== 'pending') {
        throw new Error(`Handover is already ${handover.status}.`);
      }

      // Read linked payment docs
      const paymentRefs = handover.collectionIds.map(id => doc(db, 'payments', id));
      const paymentSnaps = await Promise.all(paymentRefs.map(ref => transaction.get(ref)));

      // Update handover doc
      transaction.update(handoverRef, {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Handover rejected by HQ Cashier',
        reviewedAt: now,
        reviewedByUserId: currentUser.uid,
        reviewedByUserName: currentUser.name || 'HQ Cashier'
      });

      // Update linked payments to release lock
      paymentSnaps.forEach(snap => {
        if (snap.exists()) {
          transaction.update(snap.ref, {
            handoverStatus: 'rejected',
            handoverId: null
          });
        }
      });
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error rejecting cash handover transaction:', err);
    return { success: false, error: err.message || 'Failed to reject cash handover.' };
  }
}

/**
 * Real-time listener for expenses collection.
 */
export function subscribeExpenses(
  onUpdate: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Expense[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Expense));
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to expenses:', err);
    if (onError) onError(err);
  });
}

/**
 * Generates sequential expense number in format GLW-EXP-YYYYMMDD-XXXX
 */
export async function generateExpenseNumber(expenseDate?: string): Promise<string> {
  const dateObj = expenseDate ? new Date(expenseDate) : new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  try {
    const snap = await getDocs(collection(db, 'expenses'));
    const sameDayCount = snap.docs.filter(d => {
      const data = d.data();
      return data.expenseNumber && data.expenseNumber.includes(`GLW-EXP-${datePrefix}`);
    }).length;

    const seq = String(sameDayCount + 1).padStart(4, '0');
    return `GLW-EXP-${datePrefix}-${seq}`;
  } catch (e) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `GLW-EXP-${datePrefix}-${rand}`;
  }
}

/**
 * Creates a new expense in Firestore.
 */
export async function addExpenseInFirestore(
  data: {
    title: string;
    category: ExpenseCategory | string;
    amount: number;
    paymentMethod: string;
    vendorName?: string | null;
    expenseDate: string;
    description?: string;
    autoApprove?: boolean;
  },
  currentUser: AuthUser
): Promise<{ success: boolean; expenseId?: string; expenseNumber?: string; error?: string }> {
  try {
    // Financial Validation
    if (!data.title || !data.title.trim()) {
      throw new Error('Expense title is required.');
    }
    if (!data.category) {
      throw new Error('Expense category is required.');
    }
    const numAmount = Math.round(Number(data.amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Expense amount must be a positive integer BDT value.');
    }
    if (!data.expenseDate) {
      throw new Error('Expense date is required.');
    }

    const expNumber = await generateExpenseNumber(data.expenseDate);
    const expRef = doc(collection(db, 'expenses'));
    const now = new Date().toISOString();

    const isAdmin = currentUser.role === 'admin';
    const isAutoApproved = isAdmin && data.autoApprove === true;

    const newExpense: Expense = {
      id: expRef.id,
      expenseNumber: expNumber,
      category: data.category,
      amount: numAmount,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      paymentMethod: data.paymentMethod || 'Cash',
      vendorName: data.vendorName?.trim() || null,
      spentByUserId: currentUser.uid || currentUser.id || 'usr-unknown',
      spentByUserName: currentUser.name || 'Staff Member',
      approvedByUserId: isAutoApproved ? (currentUser.uid || currentUser.id || null) : null,
      approvedByUserName: isAutoApproved ? (currentUser.name || 'Glowzaa Admin') : null,
      approvedAt: isAutoApproved ? now : null,
      status: isAutoApproved ? 'approved' : 'pending',
      expenseDate: data.expenseDate,
      deleted: false,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(expRef, cleanUndefined(newExpense));
    return { success: true, expenseId: expRef.id, expenseNumber: expNumber };
  } catch (err: any) {
    console.error('Error adding expense:', err);
    return { success: false, error: err.message || 'Failed to add expense.' };
  }
}

/**
 * Admin approves a pending expense.
 */
export async function approveExpenseInFirestore(
  expenseId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only Admin users can approve expenses.');
    }

    const expRef = doc(db, 'expenses', expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) {
      throw new Error('Expense record not found.');
    }

    const exp = snap.data() as Expense;
    if (exp.status === 'approved') {
      throw new Error('Expense is already approved.');
    }

    const now = new Date().toISOString();
    await updateDoc(expRef, cleanUndefined({
      status: 'approved',
      approvedByUserId: currentUser.uid || currentUser.id,
      approvedByUserName: currentUser.name || 'Glowzaa Admin',
      approvedAt: now,
      updatedAt: now
    }));

    return { success: true };
  } catch (err: any) {
    console.error('Error approving expense:', err);
    return { success: false, error: err.message || 'Failed to approve expense.' };
  }
}

/**
 * Admin rejects a pending expense.
 */
export async function rejectExpenseInFirestore(
  expenseId: string,
  rejectionReason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only Admin users can reject expenses.');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('Rejection reason is required.');
    }

    const expRef = doc(db, 'expenses', expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) {
      throw new Error('Expense record not found.');
    }

    const exp = snap.data() as Expense;
    if (exp.status === 'approved') {
      throw new Error('Approved expenses cannot be rejected directly.');
    }

    const now = new Date().toISOString();
    await updateDoc(expRef, cleanUndefined({
      status: 'rejected',
      rejectionReason: rejectionReason.trim(),
      approvedByUserId: currentUser.uid || currentUser.id,
      approvedByUserName: currentUser.name || 'Glowzaa Admin',
      updatedAt: now
    }));

    return { success: true };
  } catch (err: any) {
    console.error('Error rejecting expense:', err);
    return { success: false, error: err.message || 'Failed to reject expense.' };
  }
}

/**
 * Edit an existing expense record according to RBAC.
 */
export async function editExpenseInFirestore(
  expenseId: string,
  updates: Partial<Expense>,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const expRef = doc(db, 'expenses', expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) {
      throw new Error('Expense record not found.');
    }

    const exp = snap.data() as Expense;
    const isAdmin = currentUser.role === 'admin';

    if (!isAdmin) {
      if (exp.spentByUserId !== currentUser.uid && exp.spentByUserId !== currentUser.id) {
        throw new Error('You can only edit your own expense claims.');
      }
      if (exp.status !== 'pending') {
        throw new Error('Staff members cannot edit approved or rejected expenses.');
      }
      // Strip forbidden keys for staff
      delete updates.status;
      delete updates.approvedByUserId;
      delete updates.approvedByUserName;
      delete updates.approvedAt;
      delete updates.expenseNumber;
    }

    if (updates.amount !== undefined) {
      const numAmt = Math.round(Number(updates.amount));
      if (isNaN(numAmt) || numAmt <= 0) {
        throw new Error('Amount must be a positive integer.');
      }
      updates.amount = numAmt;
    }

    updates.updatedAt = new Date().toISOString();
    await updateDoc(expRef, cleanUndefined(updates));

    return { success: true };
  } catch (err: any) {
    console.error('Error editing expense:', err);
    return { success: false, error: err.message || 'Failed to edit expense.' };
  }
}

/**
 * Soft delete an expense record (Admin only).
 */
export async function deleteExpenseInFirestore(
  expenseId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      throw new Error('Only Admin can delete expense records.');
    }

    const expRef = doc(db, 'expenses', expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) {
      throw new Error('Expense record not found.');
    }

    const now = new Date().toISOString();
    await updateDoc(expRef, cleanUndefined({
      deleted: true,
      deletedAt: now,
      deletedByUserId: currentUser.uid || currentUser.id,
      updatedAt: now
    }));

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting expense:', err);
    return { success: false, error: err.message || 'Failed to delete expense.' };
  }
}

/**
 * Seeds initial operating expense records if /expenses collection is empty.
 */
export async function seedInitialExpensesIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    if (!snap.empty) {
      return; // Already populated
    }

    console.log('Seeding initial operating expenses into Firestore...');

    const initialExpenses: Omit<Expense, 'id'>[] = [
      {
        expenseNumber: 'GLW-EXP-20260801-0001',
        category: 'Rent',
        amount: 45000,
        title: 'Banani Central Warehouse Lease & Utilities',
        description: 'Monthly distribution center lease payment for August 2026',
        paymentMethod: 'Bank Transfer',
        vendorName: 'Banani Real Estate Ltd.',
        spentByUserId: 'adm-001',
        spentByUserName: 'Glowzaa Admin',
        approvedByUserId: 'adm-001',
        approvedByUserName: 'Glowzaa Admin',
        approvedAt: '2026-08-01T10:00:00.000Z',
        status: 'approved',
        expenseDate: '2026-08-01',
        deleted: false,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z'
      },
      {
        expenseNumber: 'GLW-EXP-20260805-0002',
        category: 'Fuel & Transport',
        amount: 18500,
        title: 'Delivery Fleet Covered Van Fuel Allowance',
        description: 'Octane fuel purchase for Dhaka Metro delivery van (Metro-G-14-2091)',
        paymentMethod: 'Cash',
        vendorName: 'Padma Oil Service Station',
        spentByUserId: 'deliv-01',
        spentByUserName: 'Rafiqul Islam',
        approvedByUserId: 'adm-001',
        approvedByUserName: 'Glowzaa Admin',
        approvedAt: '2026-08-05T14:30:00.000Z',
        status: 'approved',
        expenseDate: '2026-08-05',
        deleted: false,
        createdAt: '2026-08-05T12:00:00.000Z',
        updatedAt: '2026-08-05T14:30:00.000Z'
      },
      {
        expenseNumber: 'GLW-EXP-20260810-0003',
        category: 'Packaging',
        amount: 14200,
        title: 'Corrugated Boxes & Heavy Duty Bubble Wrap',
        description: 'Bulk 5-ply cartons and fragile cosmetics tamper-evident tape',
        paymentMethod: 'bKash',
        vendorName: 'Dhaka Packaging Works',
        spentByUserId: 'adm-001',
        spentByUserName: 'Glowzaa Admin',
        approvedByUserId: 'adm-001',
        approvedByUserName: 'Glowzaa Admin',
        approvedAt: '2026-08-10T11:15:00.000Z',
        status: 'approved',
        expenseDate: '2026-08-10',
        deleted: false,
        createdAt: '2026-08-10T11:15:00.000Z',
        updatedAt: '2026-08-10T11:15:00.000Z'
      },
      {
        expenseNumber: 'GLW-EXP-20260815-0004',
        category: 'Salaries & Commissions',
        amount: 32000,
        title: 'Field Sales Officers Mid-Month Commission Payout',
        description: 'B2B Wholesale target performance incentives for sales team',
        paymentMethod: 'Bank Transfer',
        vendorName: 'Brac Bank Payroll',
        spentByUserId: 'adm-001',
        spentByUserName: 'Glowzaa Admin',
        approvedByUserId: 'adm-001',
        approvedByUserName: 'Glowzaa Admin',
        approvedAt: '2026-08-15T09:00:00.000Z',
        status: 'approved',
        expenseDate: '2026-08-15',
        deleted: false,
        createdAt: '2026-08-15T09:00:00.000Z',
        updatedAt: '2026-08-15T09:00:00.000Z'
      },
      {
        expenseNumber: 'GLW-EXP-20260820-0005',
        category: 'Vehicle Repair & Maintenance',
        amount: 3500,
        title: 'Emergency Delivery Van Brake Shoe Replacement',
        description: 'Rear brake shoe and engine oil filter change for delivery van',
        paymentMethod: 'Cash',
        vendorName: 'Tejgaon Auto Workshop',
        spentByUserId: 'deliv-01',
        spentByUserName: 'Rafiqul Islam',
        approvedByUserId: null,
        approvedByUserName: null,
        status: 'pending',
        expenseDate: '2026-08-20',
        deleted: false,
        createdAt: '2026-08-20T16:00:00.000Z',
        updatedAt: '2026-08-20T16:00:00.000Z'
      }
    ];

    for (const item of initialExpenses) {
      const ref = doc(collection(db, 'expenses'));
      await setDoc(ref, cleanUndefined({ id: ref.id, ...item }));
    }

    console.log('Operating expenses seeded successfully.');
  } catch (err) {
    console.error('Error seeding initial expenses:', err);
  }
}

/**
 * Permanently wipe all application production collections in Firestore (Admin only).
 * Preserves user accounts and Firebase configuration.
 */
export async function wipeAllApplicationDataInFirestore(currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  console.log('[WIPE] STARTING FIRESTORE WIPE');
  console.log('[WIPE] CURRENT USER:', currentUser);
  console.log('[WIPE] USER ROLE:', currentUser?.role);
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can execute complete data wipe.');
    }

    const collectionsToClear = [
      'orders',
      'customers',
      'products',
      'categories',
      'inventoryTransactions',
      'payments',
      'customerLedger',
      'deliveryHistory',
      'cash_handovers',
      'expenses',
      'audit_logs',
      'staffSalaryProfiles',
      'monthlyPayrolls',
      'salaryPayments',
      'staffLoans',
      'payrollAdjustments',
      'field_duty_sessions',
      'field_location_pings',
      'customer_visits',
      'staff_notifications',
      'users'
    ];

    for (const colName of collectionsToClear) {
      console.log('[WIPE] PROCESSING COLLECTION:', colName);
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log('[WIPE] COLLECTION:', colName, 'DOCUMENT COUNT:', snapshot.size);
      if (snapshot.empty) continue;

      console.log('[WIPE] DELETE BATCH START FOR:', colName);
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of snapshot.docs) {
        if (colName === 'users' && docSnap.id === currentUser.uid) continue;
        batch.delete(docSnap.ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      console.log('[WIPE] DELETE BATCH COMPLETE FOR:', colName);

      // Verify empty
      const verifySnap = await getDocs(colRef);
      if (colName !== 'users' && !verifySnap.empty) {
        throw new Error(`Collection ${colName} was not fully emptied (remaining: ${verifySnap.size})`);
      }
    }

    console.log('[WIPE] WIPE COMPLETE');
    return { success: true };
  } catch (err: any) {
    console.error('[WIPE ERROR]', err);
    return { success: false, error: err.message || 'Failed to wipe application data.' };
  }
}

/**
 * Reset application demo data to default in Firestore (Admin only).
 */
export async function resetDemoDataInFirestore(currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
  console.log('[RESET] BUTTON CLICKED');
  console.log('[RESET] CURRENT USER:', currentUser);
  try {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can reset demo data.');
    }

    console.log('[RESET] CLEARING DATA VIA WIPE');
    // 1. Wipe all data first
    const wipeRes = await wipeAllApplicationDataInFirestore(currentUser);
    if (!wipeRes.success) {
      return wipeRes;
    }

    console.log('[RESET] SEEDING DEFAULT DATA');
    // 2. Re-seed default demo dataset
    await seedInitialCategoriesIfEmpty();
    await seedInitialProductsIfEmpty();
    await seedInitialCustomersIfEmpty();
    await seedInitialOrdersIfEmpty();
    await seedInitialPaymentsAndLedgerIfEmpty();
    await seedInitialExpensesIfEmpty();

    console.log('[RESET] RESET COMPLETE');
    return { success: true };
  } catch (err: any) {
    console.error('[RESET ERROR]', err);
    return { success: false, error: err.message || 'Failed to reset demo data.' };
  }
}

export async function saveCompanySettingsToFirestore(settings: CompanySettings): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'settings', 'company');
    await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() });
    return { success: true };
  } catch (err: any) {
    console.error('Error saving company settings:', err);
    return { success: false, error: err.message };
  }
}

export function subscribeCompanySettings(onUpdate: (settings: CompanySettings | null) => void) {
  const docRef = doc(db, 'settings', 'company');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as CompanySettings);
    } else {
      onUpdate(null);
    }
  });
}

// ============================================================================
// STEP 14: FIELD SALES TRACKING SERVICE FUNCTIONS (PHASE 2 FOUNDATION)
// ============================================================================

/**
 * Safely writes an audit log to /audit_logs collection.
 */
export async function writeFieldDutyAuditLog(logData: {
  action: string;
  targetUserId: string;
  targetUserLoginId?: string;
  targetUserName?: string;
  targetRole?: string;
  performedByUserId: string;
  performedByUserName?: string;
  timestamp?: string;
  sessionId?: string;
  reason?: string;
  details?: string;
}): Promise<void> {
  try {
    const cleanData = cleanUndefined({
      action: logData.action,
      targetUserId: logData.targetUserId,
      targetUserLoginId: logData.targetUserLoginId || '',
      targetUserName: logData.targetUserName || 'Staff User',
      targetRole: logData.targetRole || 'sales',
      performedByUserId: logData.performedByUserId,
      performedByUserName: logData.performedByUserName || 'Staff User',
      timestamp: logData.timestamp || new Date().toISOString(),
      sessionId: logData.sessionId || null,
      reason: logData.reason || null,
      details: logData.details || ''
    });
    const newDocRef = doc(collection(db, 'audit_logs'));
    await setDoc(newDocRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Field Duty audit log notice:', err);
  }
}

/**
 * Starts a new Field Duty session for an authenticated Sales Staff member.
 * Ensures only ONE active session exists per user at any time.
 */
export async function startFieldDutySession(
  currentUser: AuthUser,
  initialLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
  }
): Promise<{ success: boolean; session?: FieldDutySession; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (currentUser.role !== 'sales' && currentUser.role !== 'admin') {
      throw new Error('Only Sales Staff can start Field Duty sessions.');
    }

    const userId = currentUser.uid;

    // Check if an active session already exists for this user
    const activeQuery = query(
      collection(db, 'field_duty_sessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const activeSnap = await getDocs(activeQuery);
    if (!activeSnap.empty) {
      const existingSession = { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() } as FieldDutySession;
      return {
        success: false,
        error: 'An active field duty session already exists for this user.',
        session: existingSession
      };
    }

    const nowIso = new Date().toISOString();
    const sessionRef = doc(collection(db, 'field_duty_sessions'));
    const sessionId = sessionRef.id;

    const sessionData: FieldDutySession = {
      id: sessionId,
      sessionId: sessionId,
      userId: userId,
      userLoginId: currentUser.loginId || currentUser.email || '',
      userName: currentUser.name || 'Sales Staff',
      territory: currentUser.territory || null,
      assignedArea: currentUser.assignedArea || null,
      status: 'active',
      startedAt: nowIso,
      endedAt: null,
      startLatitude: initialLocation?.latitude ?? null,
      startLongitude: initialLocation?.longitude ?? null,
      lastLatitude: initialLocation?.latitude ?? null,
      lastLongitude: initialLocation?.longitude ?? null,
      lastLocationUpdateAt: initialLocation ? nowIso : null,
      batteryLevel: initialLocation?.batteryLevel ?? null,
      gpsAccuracyMeters: initialLocation?.accuracy ?? null,
      totalVisitsCompleted: 0,
      totalOrdersBooked: 0,
      totalOrdersAmountBDT: 0,
      totalPaymentsCollectedBDT: 0,
      totalDistanceKm: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(sessionRef, cleanUndefined(sessionData));

    // Audit log (FIELD_DUTY_STARTED)
    await writeFieldDutyAuditLog({
      action: 'FIELD_DUTY_STARTED',
      targetUserId: userId,
      targetUserLoginId: currentUser.loginId || currentUser.email || '',
      targetUserName: currentUser.name || 'Sales Staff',
      targetRole: currentUser.role,
      performedByUserId: userId,
      performedByUserName: currentUser.name || 'Sales Staff',
      timestamp: nowIso,
      details: `Field Duty session started (${sessionId})`
    });

    return { success: true, session: sessionData };
  } catch (err: any) {
    console.error('Error starting field duty session:', err);
    return { success: false, error: err.message || 'Failed to start field duty session.' };
  }
}

/**
 * Phase 3: Automatically retrieves an existing active Field Duty session or creates a new one
 * when a Sales Staff member initiates a field activity (e.g. Customer Shop Check-In).
 * Prevents multiple active sessions and auto-closes stale sessions (> 16 hours).
 */
export async function getOrCreateActiveFieldDutySession(
  currentUser: AuthUser,
  initialLocation?: {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    batteryLevel?: number | null;
  }
): Promise<{ success: boolean; session?: FieldDutySession; isNewlyCreated?: boolean; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (currentUser.role !== 'sales' && currentUser.role !== 'admin') {
      throw new Error('Only Sales Staff can have active Field Duty sessions.');
    }

    const userId = currentUser.uid;

    // Check for existing active session
    const activeQuery = query(
      collection(db, 'field_duty_sessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const activeSnap = await getDocs(activeQuery);

    if (!activeSnap.empty) {
      const docSnap = activeSnap.docs[0];
      const existingSession = { id: docSnap.id, ...docSnap.data() } as FieldDutySession;

      // Check if session is stale (started > 16 hours ago)
      const startedMs = new Date(existingSession.startedAt).getTime();
      const ageHours = (Date.now() - startedMs) / (1000 * 60 * 60);

      if (ageHours > 16) {
        // Auto-close stale session
        const nowIso = new Date().toISOString();
        await updateDoc(doc(db, 'field_duty_sessions', docSnap.id), {
          status: 'auto_closed',
          endedAt: nowIso,
          updatedAt: nowIso
        });
      } else {
        // Active session is still valid! If initial location is passed, update last position
        if (initialLocation?.latitude && initialLocation?.longitude) {
          const nowIso = new Date().toISOString();
          await updateDoc(doc(db, 'field_duty_sessions', docSnap.id), {
            lastLatitude: initialLocation.latitude,
            lastLongitude: initialLocation.longitude,
            lastLocationUpdateAt: nowIso,
            gpsAccuracyMeters: initialLocation.accuracy ?? existingSession.gpsAccuracyMeters,
            batteryLevel: initialLocation.batteryLevel ?? existingSession.batteryLevel,
            updatedAt: nowIso
          }).catch(() => {});
        }
        return { success: true, session: existingSession, isNewlyCreated: false };
      }
    }

    // No valid active session exists; create a new one automatically
    const nowIso = new Date().toISOString();
    const sessionRef = doc(collection(db, 'field_duty_sessions'));
    const sessionId = sessionRef.id;

    const sessionData: FieldDutySession = {
      id: sessionId,
      sessionId: sessionId,
      userId: userId,
      userLoginId: currentUser.loginId || currentUser.email || '',
      userName: currentUser.name || 'Sales Staff',
      territory: currentUser.territory || null,
      assignedArea: currentUser.assignedArea || null,
      status: 'active',
      startedAt: nowIso,
      endedAt: null,
      startLatitude: initialLocation?.latitude ?? null,
      startLongitude: initialLocation?.longitude ?? null,
      lastLatitude: initialLocation?.latitude ?? null,
      lastLongitude: initialLocation?.longitude ?? null,
      lastLocationUpdateAt: initialLocation?.latitude ? nowIso : null,
      batteryLevel: initialLocation?.batteryLevel ?? null,
      gpsAccuracyMeters: initialLocation?.accuracy ?? null,
      totalVisitsCompleted: 0,
      totalOrdersBooked: 0,
      totalOrdersAmountBDT: 0,
      totalPaymentsCollectedBDT: 0,
      totalDistanceKm: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(sessionRef, cleanUndefined(sessionData));

    // Audit log (FIELD_DUTY_STARTED - Automatic on Check-In)
    await writeFieldDutyAuditLog({
      action: 'FIELD_DUTY_STARTED',
      targetUserId: userId,
      targetUserLoginId: currentUser.loginId || currentUser.email || '',
      targetUserName: currentUser.name || 'Sales Staff',
      targetRole: currentUser.role,
      performedByUserId: userId,
      performedByUserName: currentUser.name || 'Sales Staff',
      timestamp: nowIso,
      details: `Field Duty session automatically started upon shop check-in (${sessionId})`
    });

    return { success: true, session: sessionData, isNewlyCreated: true };
  } catch (err: any) {
    console.error('Error in getOrCreateActiveFieldDutySession:', err);
    return { success: false, error: err.message || 'Failed to initialize field duty session.' };
  }
}

/**
 * Phase 3: Automatically ends any active field duty session and unfinished customer visits when the user logs out.
 */
export async function endActiveFieldDutySessionOnLogout(currentUser: AuthUser): Promise<void> {
  try {
    if (!currentUser || !currentUser.uid) return;
    const activeSession = await getActiveFieldDutySession(currentUser.uid);
    if (!activeSession) return;

    const nowIso = new Date().toISOString();

    // Check for open customer visit and close it
    const activeVisit = await getActiveCustomerVisit(currentUser.uid);
    if (activeVisit) {
      await updateDoc(doc(db, 'customer_visits', activeVisit.id), {
        checkOutTime: nowIso,
        visitOutcome: activeVisit.visitOutcome || 'follow_up',
        notes: activeVisit.notes ? `${activeVisit.notes} (Auto-closed on sign out)` : 'Auto-closed on sign out'
      }).catch(() => {});
    }

    // End active session
    await updateDoc(doc(db, 'field_duty_sessions', activeSession.id), {
      status: 'ended',
      endedAt: nowIso,
      updatedAt: nowIso
    });

    await writeFieldDutyAuditLog({
      action: 'FIELD_DUTY_ENDED',
      targetUserId: currentUser.uid,
      targetUserLoginId: currentUser.loginId || currentUser.email || '',
      targetUserName: currentUser.name || 'Sales Staff',
      targetRole: 'sales',
      performedByUserId: currentUser.uid,
      performedByUserName: currentUser.name || 'Sales Staff',
      timestamp: nowIso,
      details: `Field Duty session ended automatically on user sign out (${activeSession.sessionId})`
    });
  } catch (err) {
    console.warn('Could not auto-close field duty on logout:', err);
  }
}

/**
 * Ends an active Field Duty session for the authenticated Sales Staff member.
 */
export async function endFieldDutySession(
  currentUser: AuthUser,
  sessionId: string,
  summaryStats?: { totalDistanceKm?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (!sessionId) {
      throw new Error('Session ID is required.');
    }

    const sessionRef = doc(db, 'field_duty_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error('Field duty session not found.');
    }

    const sessionData = sessionSnap.data() as FieldDutySession;

    // Verify ownership: only the owner sales staff (or admin) can end the session
    if (sessionData.userId !== currentUser.uid && currentUser.role !== 'admin') {
      throw new Error('Unauthorized: You can only end your own field duty session.');
    }

    if (sessionData.status !== 'active') {
      throw new Error('Session is not active or has already ended.');
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Partial<FieldDutySession> = {
      status: 'ended',
      endedAt: nowIso,
      updatedAt: nowIso
    };

    if (summaryStats?.totalDistanceKm !== undefined && summaryStats.totalDistanceKm > 0) {
      updatePayload.totalDistanceKm = summaryStats.totalDistanceKm;
    }

    await updateDoc(sessionRef, cleanUndefined(updatePayload));

    // Audit log (FIELD_DUTY_ENDED)
    await writeFieldDutyAuditLog({
      action: 'FIELD_DUTY_ENDED',
      targetUserId: sessionData.userId,
      targetUserLoginId: sessionData.userLoginId,
      targetUserName: sessionData.userName,
      targetRole: 'sales',
      performedByUserId: currentUser.uid,
      performedByUserName: currentUser.name || 'Sales Staff',
      timestamp: nowIso,
      details: `Field Duty session ended (${sessionId})`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error ending field duty session:', err);
    return { success: false, error: err.message || 'Failed to end field duty session.' };
  }
}

/**
 * Admin action: Force ends an active Field Duty session.
 * Updates session status to 'auto_closed', sets endedAt, and writes an audit log to /audit_logs.
 */
export async function forceEndFieldDutySession(
  currentUser: AuthUser,
  sessionId: string,
  reason: string = 'Administrative override'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can force-end field duty sessions.');
    }
    if (!sessionId) {
      throw new Error('Session ID is required.');
    }

    const sessionRef = doc(db, 'field_duty_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Field duty session not found.');
    }

    const sessionData = sessionSnap.data() as FieldDutySession;
    if (sessionData.status !== 'active') {
      throw new Error('Session is not active or has already ended.');
    }

    const nowIso = new Date().toISOString();
    await updateDoc(sessionRef, {
      status: 'auto_closed',
      endedAt: nowIso,
      updatedAt: nowIso
    });

    // Write audit log to /audit_logs
    await writeFieldDutyAuditLog({
      action: 'FIELD_DUTY_FORCE_ENDED',
      targetUserId: sessionData.userId,
      targetUserLoginId: sessionData.userLoginId,
      targetUserName: sessionData.userName,
      targetRole: 'sales',
      performedByUserId: currentUser.uid,
      performedByUserName: currentUser.name || 'Administrator',
      timestamp: nowIso,
      sessionId: sessionId,
      reason: reason,
      details: `Field Duty session force-ended by admin (${sessionId}). Reason: ${reason}`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error force-ending field duty session:', err);
    return { success: false, error: err.message || 'Failed to force-end field duty session.' };
  }
}

/**
 * Fetches the currently active Field Duty session for a given user ID, or null if none.
 */
export async function getActiveFieldDutySession(userId: string): Promise<FieldDutySession | null> {
  try {
    if (!userId) return null;
    const q = query(
      collection(db, 'field_duty_sessions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as FieldDutySession;
  } catch (err) {
    console.error('Error fetching active field duty session:', err);
    return null;
  }
}

/**
 * Fetches a single Field Duty session by document ID.
 */
export async function getFieldDutySession(sessionId: string): Promise<FieldDutySession | null> {
  try {
    if (!sessionId) return null;
    const snap = await getDoc(doc(db, 'field_duty_sessions', sessionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FieldDutySession;
  } catch (err) {
    console.error('Error fetching field duty session:', err);
    return null;
  }
}

/**
 * Logs a periodic GPS location ping and atomically updates the session's latest location.
 */
export async function createLocationPing(
  currentUser: AuthUser,
  pingData: {
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number | null;
    heading?: number | null;
    altitude?: number | null;
    batteryLevel?: number | null;
    isCharging?: boolean | null;
    networkOnline?: boolean | null;
  }
): Promise<{ success: boolean; pingId?: string; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (currentUser.role !== 'sales' && currentUser.role !== 'admin') {
      throw new Error('Only Sales Staff can submit location pings.');
    }
    if (!pingData.sessionId) {
      throw new Error('Session ID is required.');
    }

    // Validate GPS coordinate bounds
    if (
      typeof pingData.latitude !== 'number' ||
      pingData.latitude < -90 ||
      pingData.latitude > 90 ||
      typeof pingData.longitude !== 'number' ||
      pingData.longitude < -180 ||
      pingData.longitude > 180
    ) {
      throw new Error('Invalid GPS latitude/longitude coordinates.');
    }
    if (typeof pingData.accuracy !== 'number' || pingData.accuracy < 0) {
      throw new Error('Invalid GPS accuracy value.');
    }

    // Verify session exists, belongs to user, and is active
    const sessionRef = doc(db, 'field_duty_sessions', pingData.sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Referenced field duty session does not exist.');
    }
    const session = sessionSnap.data() as FieldDutySession;
    if (session.userId !== currentUser.uid && currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Ping user does not match session owner.');
    }
    if (session.status !== 'active') {
      throw new Error('Cannot log location ping to an ended or inactive session.');
    }

    const nowIso = new Date().toISOString();
    const pingRef = doc(collection(db, 'field_location_pings'));
    const pingId = pingRef.id;

    const pingDoc: GpsLocationPing = {
      id: pingId,
      pingId: pingId,
      sessionId: pingData.sessionId,
      userId: currentUser.uid,
      userName: currentUser.name || 'Sales Staff',
      latitude: pingData.latitude,
      longitude: pingData.longitude,
      accuracy: pingData.accuracy,
      speed: pingData.speed ?? null,
      heading: pingData.heading ?? null,
      altitude: pingData.altitude ?? null,
      timestamp: nowIso,
      batteryLevel: pingData.batteryLevel ?? null,
      isCharging: pingData.isCharging ?? null,
      networkOnline: pingData.networkOnline ?? true
    };

    // Atomic batch write: write location ping + update session latest position
    const batch = writeBatch(db);
    batch.set(pingRef, cleanUndefined(pingDoc));
    batch.update(sessionRef, cleanUndefined({
      lastLatitude: pingData.latitude,
      lastLongitude: pingData.longitude,
      lastLocationUpdateAt: nowIso,
      gpsAccuracyMeters: pingData.accuracy,
      batteryLevel: pingData.batteryLevel ?? session.batteryLevel ?? null,
      updatedAt: nowIso
    }));

    await batch.commit();
    return { success: true, pingId };
  } catch (err: any) {
    console.error('Error creating location ping:', err);
    return { success: false, error: err.message || 'Failed to create location ping.' };
  }
}

/**
 * Creates a new customer visit check-in record for an active session.
 */
export async function createCustomerVisit(
  currentUser: AuthUser,
  visitData: {
    sessionId: string;
    customerId: string;
    shopName?: string;
    ownerName?: string;
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
    checkInAccuracyMeters?: number | null;
    distanceFromShopMeters?: number | null;
    isGpsVerified?: boolean;
    verificationStatus?: 'verified' | 'rejected' | 'unverified';
    rejectionReason?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; visit?: CustomerVisit; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (currentUser.role !== 'sales' && currentUser.role !== 'admin') {
      throw new Error('Only Sales Staff can create customer visits.');
    }
    if (!visitData.sessionId) {
      throw new Error('Session ID is required.');
    }
    if (!visitData.customerId) {
      throw new Error('Customer ID is required.');
    }

    // Verify session
    const sessionRef = doc(db, 'field_duty_sessions', visitData.sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      throw new Error('Referenced field duty session does not exist.');
    }
    const session = sessionSnap.data() as FieldDutySession;
    if (session.userId !== currentUser.uid && currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Visit user does not match session owner.');
    }
    if (session.status !== 'active') {
      throw new Error('Cannot check in to a customer visit with an inactive session.');
    }

    // Verify customer exists
    const customerRef = doc(db, 'customers', visitData.customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) {
      throw new Error('Customer does not exist.');
    }
    const customer = customerSnap.data() as Customer;

    const nowIso = new Date().toISOString();
    const visitRef = doc(collection(db, 'customer_visits'));
    const visitId = visitRef.id;

    const visitDoc: CustomerVisit = {
      id: visitId,
      visitId: visitId,
      sessionId: visitData.sessionId,
      userId: currentUser.uid,
      userName: currentUser.name || 'Sales Staff',
      customerId: visitData.customerId,
      shopName: visitData.shopName || customer.shopName || '',
      ownerName: visitData.ownerName || customer.ownerName || '',
      checkInTime: nowIso,
      checkInLatitude: visitData.checkInLatitude ?? null,
      checkInLongitude: visitData.checkInLongitude ?? null,
      checkInAccuracyMeters: visitData.checkInAccuracyMeters ?? null,
      checkOutTime: null,
      checkOutLatitude: null,
      checkOutLongitude: null,
      checkOutAccuracyMeters: null,
      durationMinutes: null,
      visitOutcome: null,
      notes: visitData.notes ?? null,
      orderId: null,
      paymentId: null,
      distanceFromShopMeters: visitData.distanceFromShopMeters ?? null,
      isGpsVerified: visitData.isGpsVerified ?? (visitData.verificationStatus === 'verified'),
      verificationStatus: visitData.verificationStatus ?? (visitData.isGpsVerified ? 'verified' : 'unverified'),
      rejectionReason: visitData.rejectionReason ?? null
    };

    await setDoc(visitRef, cleanUndefined(visitDoc));
    return { success: true, visit: visitDoc };
  } catch (err: any) {
    console.error('Error creating customer visit:', err);
    return { success: false, error: err.message || 'Failed to create customer visit.' };
  }
}

/**
 * Updates an existing customer visit (e.g. check-out, visit outcome, duration, notes, orderId, paymentId).
 * Prevents mutation of ownership fields (userId, sessionId, customerId).
 * Atomically increments completed visits counter on the session at checkout.
 */
export async function updateCustomerVisit(
  currentUser: AuthUser,
  visitId: string,
  updateData: {
    checkOutLatitude?: number | null;
    checkOutLongitude?: number | null;
    checkOutAccuracyMeters?: number | null;
    checkOutTime?: string;
    durationMinutes?: number | null;
    visitOutcome?: CustomerVisitOutcome | null;
    notes?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (!visitId) {
      throw new Error('Visit ID is required.');
    }

    const visitRef = doc(db, 'customer_visits', visitId);
    const visitSnap = await getDoc(visitRef);
    if (!visitSnap.exists()) {
      throw new Error('Customer visit record not found.');
    }
    const visit = visitSnap.data() as CustomerVisit;

    if (visit.userId !== currentUser.uid && currentUser.role !== 'admin') {
      throw new Error('Unauthorized: You can only update your own customer visit.');
    }

    const nowIso = new Date().toISOString();
    const checkOutTime = updateData.checkOutTime || nowIso;
    const isFirstCheckout = !visit.checkOutTime && Boolean(checkOutTime);

    let calculatedDuration = updateData.durationMinutes;
    if (calculatedDuration === undefined && visit.checkInTime) {
      const checkInMs = new Date(visit.checkInTime).getTime();
      const checkOutMs = new Date(checkOutTime).getTime();
      if (!isNaN(checkInMs) && !isNaN(checkOutMs) && checkOutMs >= checkInMs) {
        calculatedDuration = Math.round((checkOutMs - checkInMs) / 60000);
      }
    }

    const updatePayload: Partial<CustomerVisit> = {
      checkOutTime: checkOutTime,
      checkOutLatitude: updateData.checkOutLatitude !== undefined ? updateData.checkOutLatitude : visit.checkOutLatitude,
      checkOutLongitude: updateData.checkOutLongitude !== undefined ? updateData.checkOutLongitude : visit.checkOutLongitude,
      checkOutAccuracyMeters: updateData.checkOutAccuracyMeters !== undefined ? updateData.checkOutAccuracyMeters : visit.checkOutAccuracyMeters,
      durationMinutes: calculatedDuration !== undefined ? calculatedDuration : visit.durationMinutes,
      visitOutcome: updateData.visitOutcome !== undefined ? updateData.visitOutcome : visit.visitOutcome,
      notes: updateData.notes !== undefined ? updateData.notes : visit.notes,
      orderId: updateData.orderId !== undefined ? updateData.orderId : visit.orderId,
      paymentId: updateData.paymentId !== undefined ? updateData.paymentId : visit.paymentId
    };

    await updateDoc(visitRef, cleanUndefined(updatePayload));

    // If this is the initial checkout, update the parent session's completed counter
    if (isFirstCheckout && visit.sessionId) {
      try {
        const sessionRef = doc(db, 'field_duty_sessions', visit.sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const sessData = sessionSnap.data() as FieldDutySession;
          const sessionUpdates: Partial<FieldDutySession> = {
            totalVisitsCompleted: (sessData.totalVisitsCompleted || 0) + 1,
            updatedAt: nowIso
          };
          if (updateData.visitOutcome === 'order_booked' || updateData.orderId) {
            sessionUpdates.totalOrdersBooked = (sessData.totalOrdersBooked || 0) + 1;
          }
          await updateDoc(sessionRef, cleanUndefined(sessionUpdates));
        }
      } catch (sessErr) {
        console.warn('Could not increment session visits completed count:', sessErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating customer visit:', err);
    return { success: false, error: err.message || 'Failed to update customer visit.' };
  }
}

/**
 * Fetches all customer visits recorded for a specific Field Duty session ordered chronologically.
 */
export async function getCustomerVisitsForSession(sessionId: string): Promise<CustomerVisit[]> {
  try {
    if (!sessionId) return [];
    try {
      const q = query(
        collection(db, 'customer_visits'),
        where('sessionId', '==', sessionId),
        orderBy('checkInTime', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerVisit));
    } catch (orderErr) {
      console.warn('Error querying customer visits with orderBy, using fallback:', orderErr);
      const fallbackQ = query(
        collection(db, 'customer_visits'),
        where('sessionId', '==', sessionId)
      );
      const snap = await getDocs(fallbackQ);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CustomerVisit))
        .sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''));
    }
  } catch (err) {
    console.error('Error fetching customer visits for session:', err);
    return [];
  }
}

/**
 * Finds any currently active (open/unfinished) customer visit for a sales staff user.
 */
export async function getActiveCustomerVisit(userId: string): Promise<CustomerVisit | null> {
  try {
    if (!userId) return null;
    const q = query(
      collection(db, 'customer_visits'),
      where('userId', '==', userId),
      where('checkOutTime', '==', null),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      return { id: docData.id, ...docData.data() } as CustomerVisit;
    }
    return null;
  } catch (err) {
    // Fallback in case of composite index delay
    try {
      const fallbackQ = query(
        collection(db, 'customer_visits'),
        where('userId', '==', userId),
        limit(20)
      );
      const snap = await getDocs(fallbackQ);
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CustomerVisit))
        .find(v => !v.checkOutTime);
      return active || null;
    } catch (fallbackErr) {
      console.error('Error checking active customer visit:', fallbackErr);
      return null;
    }
  }
}

/**
 * Updates a customer shop's verified GPS coordinates.
 */
export async function updateCustomerGpsLocation(
  currentUser: AuthUser,
  customerId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentUser || !currentUser.uid) {
      throw new Error('Authentication required.');
    }
    if (!customerId) {
      throw new Error('Customer ID is required.');
    }
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new Error('Invalid GPS latitude.');
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new Error('Invalid GPS longitude.');
    }

    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) {
      throw new Error('Customer shop not found.');
    }

    const customer = customerSnap.data() as Customer;
    // Authorize Sales Staff and Administrators to verify shop GPS coordinates
    if (currentUser.role !== 'admin' && currentUser.role !== 'sales') {
      throw new Error('Unauthorized: Only Sales Staff and Administrators can verify customer shop GPS coordinates.');
    }

    const updatePayload: Partial<Customer> = {
      latitude,
      longitude,
      isGpsVerified: true,
      updatedAt: new Date().toISOString()
    };

    // If customer was unassigned, assign to this sales representative on field duty
    if (
      currentUser.role === 'sales' &&
      (!customer.assignedSalesUserId || customer.assignedSalesUserId === 'Unassigned' || customer.assignedSalesUserId === 'unassigned')
    ) {
      updatePayload.assignedSalesUserId = currentUser.staffId || currentUser.uid;
      updatePayload.assignedSalesUserName = currentUser.name || 'Sales Staff';
      updatePayload.assignedSalesSellerId = currentUser.staffId || currentUser.uid;
      updatePayload.assignedSalesSellerName = currentUser.name || 'Sales Staff';
    }

    await updateDoc(customerRef, cleanUndefined(updatePayload));

    return { success: true };
  } catch (err: any) {
    console.error('Error updating customer GPS location:', err);
    return { success: false, error: err.message || 'Failed to update shop GPS location.' };
  }
}

/**
 * Real-time onSnapshot listener for all field duty sessions (Admin Live Monitoring).
 * Automatically updates when staff starts duty, ends duty, or sends a GPS ping.
 */
export function subscribeToAllFieldDutySessions(
  callback: (sessions: FieldDutySession[]) => void,
  onError?: (err: any) => void
): () => void {
  const sessionsCol = collection(db, 'field_duty_sessions');
  const q = query(sessionsCol, orderBy('startedAt', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as FieldDutySession));
      callback(sessions);
    },
    (err) => {
      console.warn('Field duty sessions subscription error, trying fallback:', err);
      // Fallback query without orderBy if index is still propagating
      const fallbackQ = query(sessionsCol, limit(100));
      onSnapshot(
        fallbackQ,
        (snapshot) => {
          const sessions = snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) } as FieldDutySession))
            .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
          callback(sessions);
        },
        (fallbackErr) => {
          console.error('Fallback subscription error:', fallbackErr);
          if (onError) onError(fallbackErr);
        }
      );
    }
  );
}

/**
 * Loads all location pings for a specific session to reconstruct the chronological route.
 */
export async function getFieldLocationPingsForSession(sessionId: string): Promise<GpsLocationPing[]> {
  try {
    if (!sessionId) return [];
    const pingsCol = collection(db, 'field_location_pings');
    const q = query(
      pingsCol,
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc'),
      limit(500)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as GpsLocationPing));
  } catch (err) {
    console.warn('Error loading location pings with orderBy, trying fallback query:', err);
    try {
      const fallbackQ = query(
        collection(db, 'field_location_pings'),
        where('sessionId', '==', sessionId),
        limit(500)
      );
      const snap = await getDocs(fallbackQ);
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as GpsLocationPing))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (fallbackErr) {
      console.error('Error fetching location pings for session:', fallbackErr);
      return [];
    }
  }
}

/**
 * Loads all customer visits for a date range (for historical analysis).
 */
export async function getCustomerVisitsForDateRange(
  startDateIso: string,
  endDateIso: string,
  userId?: string
): Promise<CustomerVisit[]> {
  try {
    const visitsCol = collection(db, 'customer_visits');
    let q;
    if (userId) {
      q = query(
        visitsCol,
        where('userId', '==', userId),
        where('checkInTime', '>=', startDateIso),
        where('checkInTime', '<=', endDateIso),
        orderBy('checkInTime', 'asc')
      );
    } else {
      q = query(
        visitsCol,
        where('checkInTime', '>=', startDateIso),
        where('checkInTime', '<=', endDateIso),
        orderBy('checkInTime', 'asc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CustomerVisit));
  } catch (err) {
    console.warn('Error querying visits by date with composite index, using fallback filter:', err);
    try {
      const snap = await getDocs(query(collection(db, 'customer_visits'), limit(200)));
      const startMs = new Date(startDateIso).getTime();
      const endMs = new Date(endDateIso).getTime();
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) } as CustomerVisit))
        .filter((v) => {
          if (userId && v.userId !== userId) return false;
          if (!v.checkInTime) return false;
          const visitMs = new Date(v.checkInTime).getTime();
          return visitMs >= startMs && visitMs <= endMs;
        })
        .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    } catch (fallbackErr) {
      console.error('Error in fallback customer visits query:', fallbackErr);
      return [];
    }
  }
}





