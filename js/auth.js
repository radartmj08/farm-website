// ====================================
// User Authentication & Recommendation System
// Farm Phoomjai & Jiaranai Garden
// ====================================

// ====================================
// User Database Functions
// ====================================

function getUsers() {
  return JSON.parse(localStorage.getItem('farmUsers')) || [];
}

function saveUsers(users) {
  localStorage.setItem('farmUsers', JSON.stringify(users));
}

function getCurrentUser() {
  const userId = localStorage.getItem('currentUserId');
  if (!userId) return null;
  const users = getUsers();
  return users.find(u => u.id === userId) || null;
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function userLogout() {
  localStorage.removeItem('currentUserId');
}

// ====================================
// Helper Functions
// ====================================

function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

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
// Authentication Functions
// ====================================

async function userSignup(userData) {
  const { name, email, phone, password, interests } = userData;
  
  if (!validateEmail(email)) {
    return { success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
  }
  
  const newUser = {
    id: generateUserId(),
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: simpleHash(password),
    interests: interests || [],
    viewHistory: [],
    purchaseHistory: [],
    categoryPreferences: {},
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  localStorage.setItem('currentUserId', newUser.id);
  
  return { success: true, user: newUser };
}

async function userLogin(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { success: false, message: 'ไม่พบบัญชีผู้ใช้นี้' };
  }
  
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  }
  
  user.lastLogin = new Date().toISOString();
  saveUsers(users);
  localStorage.setItem('currentUserId', user.id);
  
  return { success: true, user };
}

// ====================================
// Product View Tracking
// ====================================

function trackProductView(productId, categoryId) {
  const user = getCurrentUser();
  if (!user) return;
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex === -1) return;
  
  if (!users[userIndex].viewHistory) {
    users[userIndex].viewHistory = [];
  }
  
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
  if (!users[userIndex].categoryPreferences) {
    users[userIndex].categoryPreferences = {};
  }
  if (users[userIndex].categoryPreferences[categoryId]) {
    users[userIndex].categoryPreferences[categoryId]++;
  } else {
    users[userIndex].categoryPreferences[categoryId] = 1;
  }
  
  saveUsers(users);
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
    
    // Category preference score
    if (user.categoryPreferences && user.categoryPreferences[product.category]) {
      score += user.categoryPreferences[product.category] * 10;
    }
    
    // Initial interest match
    if (user.interests && user.interests.includes(product.category)) {
      score += 25;
    }
    
    // View history penalty (don't recommend too recently viewed)
    const viewRecord = user.viewHistory?.find(v => v.productId === product.id);
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
  const users = getUsers();
  let allProducts = [];
  
  if (typeof getProductsAsync === 'function') {
    try {
      allProducts = await getProductsAsync();
    } catch (e) {
      return [];
    }
  }
  
  const viewCounts = {};
  users.forEach(user => {
    (user.viewHistory || []).forEach(view => {
      viewCounts[view.productId] = (viewCounts[view.productId] || 0) + view.viewCount;
    });
  });
  
  return allProducts
    .map(p => ({ ...p, totalViews: viewCounts[p.id] || 0 }))
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, limit);
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
    userNames.forEach(el => el.textContent = user.name.split(' ')[0]);
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
  window.getUsers = getUsers;
  window.saveUsers = saveUsers;
}
