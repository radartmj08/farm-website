// ====================================
// User Authentication & Recommendation System
// Farm Phoomjai & Jiaranai Garden
// Using Supabase as Database
// ====================================

// Supabase Config
const SUPABASE_URL = 'https://itznnbmvbgqvotidygdo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0em5uYm12Ymdxdm90aWR5Z2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTc5MTEsImV4cCI6MjA4MTg3MzkxMX0.cUATTqVpfC6tyMdUVPpYRjJ80wASkuXMsJ2zdPZZST8';

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ====================================
// User Database Functions - Supabase
// ====================================

function getCurrentUser() {
  const userData = localStorage.getItem('currentUserData');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function userLogout() {
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserData');
}

// ====================================
// Helper Functions
// ====================================

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ====================================
// Supabase API Functions
// ====================================

async function getUserByEmail(email) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/farm_users?email=eq.' + encodeURIComponent(email.toLowerCase()) + '&select=*',
      { headers: supabaseHeaders }
    );
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

async function createUserInDB(userData) {
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/farm_users', {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUserInDB(id, updates) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/farm_users?id=eq.' + id,
      {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(updates)
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

// ====================================
// Authentication Functions
// ====================================

async function userSignup(userData) {
  const { name, email, phone, password, interests } = userData;
  
  if (!validateEmail(email)) {
    return { success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  
  // Check if email exists in Supabase
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
  }
  
  try {
    const newUser = await createUserInDB({
      name,
      email: email.toLowerCase(),
      phone,
      password_hash: simpleHash(password),
      interests: interests || [],
      social_provider: null,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    });
    
    localStorage.setItem('currentUserId', newUser.id);
    localStorage.setItem('currentUserData', JSON.stringify(newUser));
    
    return { success: true, user: newUser };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function userLogin(email, password) {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' };
  }
  
  if (user.password_hash !== simpleHash(password)) {
    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  }
  
  // Update last login
  await updateUserInDB(user.id, { last_login: new Date().toISOString() });
  
  localStorage.setItem('currentUserId', user.id);
  localStorage.setItem('currentUserData', JSON.stringify(user));
  
  return { success: true, user };
}

// ====================================
// Product View Tracking
// ====================================

async function trackProductView(productId, categoryId) {
  const user = getCurrentUser();
  if (!user) return;
  
  // Update local user data
  let viewHistory = user.viewHistory || user.view_history || [];
  let categoryPreferences = user.categoryPreferences || user.category_preferences || {};
  
  const existingView = viewHistory.find(v => v.productId === productId);
  
  if (existingView) {
    existingView.viewCount++;
    existingView.lastViewed = new Date().toISOString();
  } else {
    viewHistory.push({
      productId,
      categoryId,
      viewCount: 1,
      firstViewed: new Date().toISOString(),
      lastViewed: new Date().toISOString()
    });
  }
  
  // Update category preferences
  if (categoryPreferences[categoryId]) {
    categoryPreferences[categoryId]++;
  } else {
    categoryPreferences[categoryId] = 1;
  }
  
  // Update in Supabase
  await updateUserInDB(user.id, {
    view_history: viewHistory,
    category_preferences: categoryPreferences
  });
  
  // Update local storage
  user.viewHistory = viewHistory;
  user.view_history = viewHistory;
  user.categoryPreferences = categoryPreferences;
  user.category_preferences = categoryPreferences;
  localStorage.setItem('currentUserData', JSON.stringify(user));
}

// ====================================
// Recommendation System
// ====================================

async function getRecommendedProducts(limit = 6) {
  const user = getCurrentUser();
  let allProducts = [];
  
  // Try to get products
  if (typeof getProductsAsync === 'function') {
    try {
      allProducts = await getProductsAsync();
    } catch (e) {
      allProducts = [];
    }
  }
  
  if (!allProducts || allProducts.length === 0) {
    return [];
  }
  
  if (!user) {
    return shuffleArray(allProducts).slice(0, limit);
  }
  
  const scoredProducts = allProducts.map(product => {
    let score = 0;
    
    const catPrefs = user.categoryPreferences || user.category_preferences || {};
    const interests = user.interests || [];
    const viewHistory = user.viewHistory || user.view_history || [];
    
    // Category preference score
    if (catPrefs[product.category]) {
      score += catPrefs[product.category] * 10;
    }
    
    // Initial interest match
    if (interests.includes(product.category)) {
      score += 25;
    }
    
    // View history penalty
    const viewRecord = viewHistory.find(v => v.productId === product.id);
    if (viewRecord) {
      score -= 5;
    }
    
    // Newness bonus
    if (product.created_at) {
      const daysSince = (Date.now() - new Date(product.created_at)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 15;
    }
    
    // Badge bonus
    if (product.badges && product.badges.length > 0) {
      score += product.badges.length * 5;
    }
    
    return { ...product, recommendationScore: score };
  });
  
  scoredProducts.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return scoredProducts.slice(0, limit);
}

async function getSimilarProducts(productId, limit = 4) {
  let allProducts = [];
  if (typeof getProductsAsync === 'function') {
    try {
      allProducts = await getProductsAsync();
    } catch (e) {
      return [];
    }
  }
  
  const currentProduct = allProducts.find(p => p.id === productId);
  if (!currentProduct) return [];
  
  return allProducts
    .filter(p => p.category === currentProduct.category && p.id !== productId)
    .slice(0, limit);
}

async function getTrendingProducts(limit = 6) {
  let allProducts = [];
  if (typeof getProductsAsync === 'function') {
    try {
      allProducts = await getProductsAsync();
    } catch (e) {
      return [];
    }
  }
  return shuffleArray(allProducts).slice(0, limit);
}

// ====================================
// UI Helper Functions
// ====================================

function updateAuthUI() {
  const user = getCurrentUser();
  const authLinks = document.querySelectorAll('.auth-link');
  const userMenus = document.querySelectorAll('.user-menu');
  const userNames = document.querySelectorAll('.user-name');
  
  if (user) {
    authLinks.forEach(el => el.style.display = 'none');
    userMenus.forEach(el => el.style.display = 'flex');
    userNames.forEach(el => el.textContent = user.name ? user.name.split(' ')[0] : 'User');
  } else {
    authLinks.forEach(el => el.style.display = 'flex');
    userMenus.forEach(el => el.style.display = 'none');
  }
}

// Format price
function formatPrice(price) {
  return new Intl.NumberFormat('th-TH').format(price);
}

// ====================================
// Export for global use
// ====================================
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
  window.updateAuthUI = updateAuthUI;
  window.getUserByEmail = getUserByEmail;
}
