const BASE_URL = process.env.MENU_API_URL || 'http://127.0.0.1:3002/api/menu';

const demoItems = [
  {
    name: 'Classic Veg Burger',
    description: 'A golden veggie patty with crisp lettuce, tomato, and house sauce.',
    category: 'Burgers',
    price: 149,
    available: true
  },
  {
    name: 'Margherita Pizza',
    description: 'A thin, crispy base with tomato, mozzarella, and fragrant basil.',
    category: 'Pizza',
    price: 229,
    available: true
  },
  {
    name: 'Creamy Alfredo Pasta',
    description: 'Comforting penne tossed in a creamy garlic and herb sauce.',
    category: 'Pasta',
    price: 199,
    available: true
  },
  {
    name: 'Garden Fresh Salad',
    description: 'Crunchy greens, cucumber, tomatoes, and a bright lemon dressing.',
    category: 'Healthy',
    price: 129,
    available: true
  },
  {
    name: 'Homestyle Veg Biryani',
    description: 'Fragrant basmati rice with warming spices and fresh herbs.',
    category: 'Rice Bowls',
    price: 189,
    available: true
  },
  {
    name: 'Chocolate Fudge Brownie',
    description: 'A rich, fudgy chocolate brownie for a little sweet moment.',
    category: 'Desserts',
    price: 99,
    available: true
  },
  {
    name: 'Mango Smoothie',
    description: 'A chilled, creamy mango drink with sunny tropical flavour.',
    category: 'Drinks',
    price: 89,
    available: true
  },
  {
    name: 'Grilled Paneer Sandwich',
    description: 'Toasted bread filled with spiced paneer, peppers, and cheese.',
    category: 'Sandwiches',
    price: 159,
    available: true
  }
];

async function request(path = '', options = {}) {
  const response = await fetch(BASE_URL + path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Menu API returned HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  const current = await request();
  const existing = new Map((current.items || []).map((item) => [item.name, item]));

  // Rename the temporary burger used during API checks into a real demo menu item.
  const temporaryBurger = (current.items || []).find((item) => item.id === '984bd95a-c723-463d-93be-68404fc93c91');
  if (temporaryBurger && temporaryBurger.name === 'Test Veg Burger') {
    const updated = await request('/' + temporaryBurger.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Classic Veg Burger',
        description: 'A golden veggie patty with crisp lettuce, tomato, and house sauce.',
        category: 'Burgers',
        price: 149,
        available: true
      })
    });
    existing.set(updated.name, updated);
    console.log('Updated temporary test burger to Classic Veg Burger.');
  }

  for (const item of demoItems) {
    if (existing.has(item.name)) {
      console.log('Skipped existing item: ' + item.name);
      continue;
    }
    const created = await request('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    existing.set(created.name, created);
    console.log('Added: ' + created.name + ' (' + created.category + ') — ₹' + created.price);
  }

  const finalMenu = await request();
  const available = (finalMenu.items || []).filter((item) => item.available !== false);
  console.log(`\nDone. ${available.length} available menu items are now in DynamoDB.`);
}

main().catch((error) => {
  console.error('Could not seed demo menu:', error.message);
  process.exitCode = 1;
});
