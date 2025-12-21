# Farm Phoomjai & Jiaranai Garden Website

A modern, responsive website for Farm Phoomjai and Jiaranai Garden with an admin panel for product management.

## 🚀 Deployment to Netlify

### Option 1: Deploy via Netlify Dashboard (Easiest)

1. Go to [Netlify](https://app.netlify.com)
2. Sign up or log in
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository (or drag & drop this folder)
5. Build settings will be auto-detected from `netlify.toml`
6. Click "Deploy site"

### Option 2: Deploy via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy (from project folder)
netlify deploy --prod
```

## 🔐 Admin Panel

### Access
- URL: `https://your-site.netlify.app/admin.html`
- Default credentials:
  - **Email:** admin@farmphoomjai.com
  - **Password:** farm2024

### Setting Custom Admin Credentials (Recommended)

1. Go to your Netlify Dashboard
2. Select your site → Site settings → Environment variables
3. Add these variables:
   - `ADMIN_EMAIL` = your-email@example.com
   - `ADMIN_PASSWORD` = your-secure-password
4. Redeploy the site

## 📁 Project Structure

```
farm/
├── index.html              # Home page
├── product.html            # Products page
├── admin.html              # Admin login
├── admin-dashboard.html    # Admin dashboard
├── css/
│   └── style.css          # All styles
├── js/
│   └── admin.js           # Admin functionality
├── images/                 # All images
├── data/
│   └── products.json      # Default products data
├── netlify/
│   └── functions/         # Serverless functions
│       ├── products.js    # Products API
│       └── auth.js        # Authentication API
├── netlify.toml           # Netlify configuration
└── package.json           # Project dependencies
```

## ⚠️ Important Notes

### About Product Storage

Products added via admin panel are stored in **localStorage** (browser storage). This means:
- Each visitor sees default products + their own additions
- Products persist in the same browser
- Different devices won't share the same data

**For persistent storage across all users**, connect to a database like:
- MongoDB Atlas (free tier available)
- Supabase
- Firebase

## 🛠️ Local Development

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Run locally with Netlify Dev
netlify dev
```

Server runs at `http://localhost:8888`

## 📱 Features

- ✅ Responsive design (mobile-friendly)
- ✅ Dark theme with green accents
- ✅ Hero section with image slider
- ✅ Product catalog with category filter
- ✅ Admin panel with login
- ✅ Add/Edit/Delete products
- ✅ Social media links (Instagram, LINE)

---

Made with ❤️ for Farm Phoomjai & Jiaranai Garden
