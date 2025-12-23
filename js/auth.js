// ====================================
// User Authentication & Recommendation System
// Farm Phoomjai & Jiaranai Garden
// ====================================

// Supabase Configuration
const SUPABASE_URL = 'https://itznnbmvbgqvotidygdo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0em5uYm12Ymdxdm90aWR5Z2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjIwMzksImV4cCI6MjA2NTAzODAzOX0.76S9x8glQQWuFDnJvxnO5c2qBLHVpfGEMcUL8A36JDo';

// ====================================
// User Storage (localStorage-based with Supabase backup)
// ====================================

// Get all users from localStorage
function getUsers() {
  return JSON.parse(localStorage.getItem('farmUsers')) || [];
}

// Save users to localStorage
function saveUsers(users) {
  localStorage.setItem('farmUsers', JSON.stringify(users));
}

// Get current logged-in user
function getCurrentUser() {
  const userId = localStorage.getItem('currentUserId');
  if (!userId) return null;
  
  const users = getUsers();
  return users.find(u => u.id === userId) || null;
}

// Check if user is logged in
function isLoggedIn() {
  return getCurrentUser() !== null;
}

// ====================================
// Authentication Functions
// ====================================

// User Signup
async function userSignup(userData) {
  const { name, email, phone, password, interests } = userData;
  
  // Validate email format
  if (!validateEmail(email)) {
    return { success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  
  // Check if email already exists
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
  }
  
  // Create new user
  const newUser = {
    id: generateUserId(),
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: simpleHash(password),
    interests: interests || [],
    viewHistory: [],
    purchaseHistory: [],
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  // Save user
  users.push(newUser);
  saveUsers(users);
  
  // Set as current user
  localStorage.setItem('currentUserId', newUser.id);
  
  // Sync to Supabase (async, don't wait)
  syncUserToSupabase(newUser);
  
  return { success: true, user: newUser };
}

// User Login
async function userLogin(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' };
  }
  
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  }
  
  // Update last login
  user.lastLogin = new Date().toISOString();
  saveUsers(users);
  
  // Set as current user
  localStorage.setItem('currentUserId', user.id);
  
  return { success: true, user };
}

// User Logout
function userLogout() {
  localStorage.removeItem('currentUserId');
  // Don't remove rememberUser for convenience
}

// ====================================
// Product View Tracking
// ====================================

// Track product view
function trackProductView(productId, categoryId) {
  const user = getCurrentUser();
  if (!user) return; // Only track for logged-in users
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  
  if (userIndex === -1) return;
  
  // Initialize viewHistory if not exists
  if (!users[userIndex].viewHistory) {
    users[userIndex].viewHistory = [];
  }
  
  // Add or update view record
  const existingView = users[userIndex].viewHistory.find(v => v.productId === productId);
  
  if (existingView) {
    existingView.viewCount++;
    existingView.lastViewed = new Date().toISOString();
  } else {
    users[userIndex].viewHistory.push({
      productId,
      categoryId,
      viewCount: 1,
      firstViewed: new Date().toISOString(),
      lastViewed: new Date().toISOString()
    });
  }
  
  // Update category preferences
  updateCategoryPreference(users[userIndex], categoryId);
  
  saveUsers(users);
  
  // Sync to Supabase
  syncViewToSupabase(user.id, productId, categoryId);
}

// Update category preference score
function updateCategoryPreference(user, categoryId) {
  if (!user.categoryPreferences) {
    user.categoryPreferences = {};
  }
  
  if (user.categoryPreferences[categoryId]) {
    user.categoryPreferences[categoryId]++;
  } else {
    user.categoryPreferences[categoryId] = 1;
  }
}

// ====================================
// Recommendation System
// ====================================

// Get recommended products for current user
async function getRecommendedProducts(limit = 6) {
  const user = getCurrentUser();
  const allProducts = await getProductsAsync();
  
  if (!user || !allProducts || allProducts.length === 0) {
    // Return random products if not logged in
    return shuffleArray(allProducts).slice(0, limit);
  }
  
  // Calculate scores for each product
  const scoredProducts = allProducts.map(product => {
    let score = 0;
    
    // 1. Category preference score (highest weight)
    if (user.categoryPreferences && user.categoryPreferences[product.category]) {
      score += user.categoryPreferences[product.category] * 10;
    }
    
    // 2. Initial interest match
    if (user.interests && user.interests.includes(product.category)) {
      score += 25;
    }
    
    // 3. View history (don't recommend recently viewed)
    const viewRecord = user.viewHistory?.find(v => v.productId === product.id);
    if (viewRecord) {
      // Slightly reduce score for already viewed items
      score -= 5;
    }
    
    // 4. Newness bonus (products added recently)
    if (product.created_at) {
      const daysSinceCreated = (Date.now() - new Date(product.created_at)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        score += 15; // Bonus for new products
      }
    }
    
    // 5. Badge bonus (popular, organic, etc.)
    if (product.badges && product.badges.length > 0) {
      score += product.badges.length * 5;
    }
    
    return { ...product, recommendationScore: score };
  });
  
  // Sort by score and return top products
  scoredProducts.sort((a, b) => b.recommendationScore - a.recommendationScore);
  
  return scoredProducts.slice(0, limit);
}

// Get products from same category as viewed
async function getSimilarProducts(productId, limit = 4) {
  const allProducts = await getProductsAsync();
  const currentProduct = allProducts.find(p => p.id === productId);
  
  if (!currentProduct) return [];
  
  return allProducts
    .filter(p => p.category === currentProduct.category && p.id !== productId)
    .slice(0, limit);
}

// Get trending products (most viewed globally)
async function getTrendingProducts(limit = 6) {
  const users = getUsers();
  const allProducts = await getProductsAsync();
  
  // Count total views per product
  const viewCounts = {};
  users.forEach(user => {
    (user.viewHistory || []).forEach(view => {
      viewCounts[view.productId] = (viewCounts[view.productId] || 0) + view.viewCount;
    });
  });
  
  // Sort products by view count
  return allProducts
    .map(p => ({ ...p, totalViews: viewCounts[p.id] || 0 }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, limit);
}

// ====================================
// Supabase Sync Functions
// ====================================

// Sync user data to Supabase
async function syncUserToSupabase(user) {
  try {
    // Try to create/update user in Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/farm_users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        interests: user.interests,
        created_at: user.createdAt
      })
    });
    
    if (!response.ok) {
      console.log('Supabase sync skipped (table may not exist yet)');
    }
  } catch (error) {
    console.log('Supabase sync failed (offline mode):', error.message);
  }
}

// Sync view data to Supabase
async function syncViewToSupabase(userId, productId, categoryId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/product_views`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        product_id: productId,
        category_id: categoryId,
        viewed_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.log('View sync failed (offline mode)');
  }
}

// ====================================
// Helper Functions
// ====================================

// Generate unique user ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Simple hash function (for demo - use bcrypt in production)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Validate email format
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ====================================
// UI Helper Functions
// ====================================

// Update UI based on login state
function updateAuthUI() {
  const user = getCurrentUser();
  const authLinks = document.querySelectorAll('.auth-link');
  const userMenus = document.querySelectorAll('.user-menu');
  const userNames = document.querySelectorAll('.user-name');
  
  if (user) {
    // Hide login links, show user menu
    authLinks.forEach(el => el.style.display = 'none');
    userMenus.forEach(el => el.style.display = 'flex');
    userNames.forEach(el => el.textContent = user.name);
  } else {
    // Show login links, hide user menu
    authLinks.forEach(el => el.style.display = 'flex');
    userMenus.forEach(el => el.style.display = 'none');
  }
}

// Create recommendation section HTML
async function renderRecommendations(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const user = getCurrentUser();
  const products = await getRecommendedProducts(6);
  
  if (!products || products.length === 0) {
    container.innerHTML = '<p class="no-recommendations">ยังไม่มีสินค้าแนะนำ</p>';
    return;
  }
  
  const title = user 
    ? `<h3><i class="fas fa-heart"></i> แนะนำสำหรับคุณ, ${user.name}</h3>`
    : '<h3><i class="fas fa-star"></i> สินค้าแนะนำ</h3>';
  
  const productsHTML = products.map(product => `
    <div class="product-card" onclick="trackAndViewProduct('${product.id}', '${product.category}')">
      <div class="product-image">
        <img src="${product.image || 'images/placeholder.jpg'}" alt="${product.name}">
        ${product.badges && product.badges.length > 0 ? 
          `<div class="product-badges">${product.badges.map(b => 
            `<span class="badge" style="background:${b.color || '#4a7c59'}">${b.name}</span>`
          ).join('')}</div>` : ''}
      </div>
      <div class="product-info">
        <h4>${product.name}</h4>
        <p class="product-price">${formatPrice(product.price)} บาท</p>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = `
    <div class="recommendations-section">
      ${title}
      <div class="recommendations-grid">
        ${productsHTML}
      </div>
    </div>
  `;
}

// Track view and navigate to product
function trackAndViewProduct(productId, categoryId) {
  trackProductView(productId, categoryId);
  // Navigate to product detail or open modal
  window.location.href = `product.html?id=${productId}`;
}

// Format price
function formatPrice(price) {
  return new Intl.NumberFormat('th-TH').format(price);
}

// ====================================
// Initialize on page load
// ====================================

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
});

// Export for use in other files
if (typeof window !== 'undefined') {
  window.getCurrentUser = getCurrentUser;
  window.isLoggedIn = isLoggedIn;
  window.userLogin = userLogin;
  window.userSignup = userSignup;
  window.userLogout = userLogout;
  window.trackProductView = trackProductView;
  window.getRecommendedProducts = getRecommendedProducts;
  window.getSimilarProducts = getSimilarProducts;
  window.getTrendingProducts = getTrendingProducts;
  window.renderRecommendations = renderRecommendations;
  window.updateAuthUI = updateAuthUI;
}
