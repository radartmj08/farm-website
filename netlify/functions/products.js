// Netlify Function: Get all products
const products = require('../../data/products.json');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET: Return all products
  if (event.httpMethod === 'GET') {
    // Check for category filter
    const category = event.queryStringParameters?.category;
    
    let filteredProducts = products.products;
    if (category && category !== 'all') {
      filteredProducts = products.products.filter(p => p.category === category);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: filteredProducts
      })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
