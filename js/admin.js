/**
 * Admin Panel JavaScript
 * Farm Phoomjai & Jiaranai Garden
 * 
 * เชื่อมต่อกับ Supabase Database
 */

// ========================================
// Supabase Configuration
// ========================================
const SUPABASE_URL = 'https://itznnbmvbgqvotidygdo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0em5uYm12Ymdxdm90aWR5Z2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTc5MTEsImV4cCI6MjA4MTg3MzkxMX0.cUATTqVpfC6tyMdUVPpYRjJ80wASkuXMsJ2zdPZZST8';

const CONFIG = {
  tokenKey: 'farmAdminToken'
};

// Admin credentials
const ADMIN_EMAIL = 'phoomjaiwork@gmail.com';
const ADMIN_PASSWORD = 'radar2551';

// ========================================
// Supabase Helper Functions
// ========================================

/**
 * เรียก Supabase REST API
 */
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation'
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  // Check if response has content
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ========================================
// Authentication Functions
// ========================================

/**
 * ตรวจสอบว่า admin login อยู่หรือไม่
 */
function isAdminLoggedIn() {
  const token = localStorage.getItem(CONFIG.tokenKey);
  return token && token.length > 0;
}

/**
 * Admin login
 */
function adminLogin(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem(CONFIG.tokenKey, 'authenticated');
    return true;
  }
  return false;
}

/**
 * Admin login (async version)
 */
async function adminLoginAPI(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem(CONFIG.tokenKey, 'authenticated');
    return { success: true };
  }
  return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
}

/**
 * Admin logout
 */
function adminLogout() {
  localStorage.removeItem(CONFIG.tokenKey);
}

// ========================================
// Product Functions (Supabase)
// ========================================

/**
 * ดึงสินค้าทั้งหมดจาก Supabase
 */
async function getProductsFromDB() {
  try {
    const products = await supabaseRequest('products?select=*&order=id.asc');
    return products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * ดึงสินค้าแบบ sync (ใช้ cache)
 */
function getProducts() {
  const cached = sessionStorage.getItem('productsCache');
  if (cached) {
    return JSON.parse(cached);
  }
  return [];
}

/**
 * ดึงสินค้าแบบ async และ cache
 */
async function getProductsAsync() {
  try {
    const products = await getProductsFromDB();
    sessionStorage.setItem('productsCache', JSON.stringify(products));
    return products;
  } catch (error) {
    console.error('Error:', error);
    return getProducts(); // Return cached
  }
}

/**
 * เพิ่มสินค้าใหม่
 */
async function addProductToDB(product) {
  try {
    const newProduct = {
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price || 'Seasonal',
      badge: product.badge || '',
      image: product.image || 'images/phoomjai.svg'
    };

    const result = await supabaseRequest('products', {
      method: 'POST',
      body: JSON.stringify(newProduct)
    });

    // Clear cache
    sessionStorage.removeItem('productsCache');
    
    return result[0];
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * เพิ่มสินค้า (wrapper function)
 */
function addProduct(product) {
  // This is now async, but we keep the sync interface for compatibility
  addProductToDB(product).then(() => {
    console.log('Product added to database');
  }).catch(err => {
    console.error('Failed to add product:', err);
  });
  return product;
}

/**
 * อัพเดทสินค้า
 */
async function updateProductInDB(productId, updatedProduct) {
  try {
    const result = await supabaseRequest(`products?id=eq.${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: updatedProduct.name,
        category: updatedProduct.category,
        description: updatedProduct.description,
        price: updatedProduct.price,
        badge: updatedProduct.badge,
        image: updatedProduct.image
      })
    });

    // Clear cache
    sessionStorage.removeItem('productsCache');
    
    return result ? result[0] : null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * อัพเดทสินค้า (wrapper)
 */
function updateProduct(productId, updatedProduct) {
  updateProductInDB(productId, updatedProduct).then(() => {
    console.log('Product updated in database');
  }).catch(err => {
    console.error('Failed to update product:', err);
  });
  return updatedProduct;
}

/**
 * ลบสินค้า
 */
async function deleteProductFromDB(productId) {
  try {
    await supabaseRequest(`products?id=eq.${productId}`, {
      method: 'DELETE'
    });

    // Clear cache
    sessionStorage.removeItem('productsCache');
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * ลบสินค้า (wrapper)
 */
function deleteProduct(productId) {
  deleteProductFromDB(productId).then(() => {
    console.log('Product deleted from database');
  }).catch(err => {
    console.error('Failed to delete product:', err);
  });
  return true;
}

/**
 * ดึงสินค้าตามหมวดหมู่
 */
async function getProductsByCategory(category) {
  if (category === 'all') {
    return await getProductsAsync();
  }
  
  try {
    const products = await supabaseRequest(`products?category=eq.${category}&order=id.asc`);
    return products || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// ========================================
// Utility Functions
// ========================================

function generateId() {
  return Date.now();
}

function getCategoryIcon(category) {
  const icons = {
    vegetables: 'fas fa-seedling',
    flowers: 'fas fa-spa',
    herbs: 'fas fa-leaf'
  };
  return icons[category] || 'fas fa-box';
}

function formatCategory(category) {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// ========================================
// Initialize
// ========================================
(async function() {
  // Pre-load products into cache
  await getProductsAsync();
  console.log('Products loaded from Supabase');
})();
