const SERVER_API = process.env.NEXT_PUBLIC_API_URL || 'https://rym-shoes.onrender.com';
const CLIENT_API = '/api';
function getApiBase() {
  if (typeof window === 'undefined') {
    return SERVER_API;
  }
  return CLIENT_API;
}

// 🔥 Products
export async function getProducts(category = 'all') {
  const base = getApiBase();

  const url =
    category && category !== 'all'
      ? `${base}/products?category=${category}`
      : `${base}/products`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) throw new Error('Failed to fetch products');

  return res.json();
}

// 🔥 Single product
export async function getProduct(id) {
  const base = getApiBase();

  const res = await fetch(`${base}/products/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Product not found');

  return res.json();
}

// 🔥 Images (مهم جدًا)
export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('http')) return imageUrl;

  const base = typeof window !== 'undefined'
    ? ''
    : SERVER_API;

  return `${base}${imageUrl}`;
}

// 🔥 Admin requests
export function adminFetch(endpoint, options = {}) {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('adminToken')
      : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const base =
    typeof window !== 'undefined'
      ? CLIENT_API
      : SERVER_API;

  return fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  });
}
