// Maps ingredients to grocery store sections
// Used to group the grocery list by aisle

const CATEGORY_MAP = {
  // ── Produce ────────────────────────────────────────────────
  Produce: [
    'apple','banana','berries','blueberries','strawberries','raspberry','mango',
    'pineapple','watermelon','kiwi','grapes','peach','pear','plum','cherry',
    'orange','lemon','lime','grapefruit','avocado','tomato','cucumber',
    'lettuce','spinach','arugula','kale','cabbage','broccoli','cauliflower',
    'carrot','celery','onion','garlic','ginger','potato','sweet potato',
    'bell pepper','zucchini','eggplant','mushroom','corn','peas','green beans',
    'asparagus','beet','radish','cilantro','parsley','basil','mint','dill',
    'thyme','rosemary','chive','spring onion','scallion','leek','shallot',
    'jalapeño','chili','green chili','mixed berries','mixed vegetables',
    'fresh fruit','fruit','mixed fruit','cherry tomatoes','baby spinach',
  ],

  // ── Meat & Seafood ──────────────────────────────────────────
  'Meat & Seafood': [
    'chicken','beef','turkey','pork','bacon','ham','sausage','chicken sausage',
    'ground beef','ground turkey','steak','lamb','shrimp','salmon','tuna',
    'tilapia','cod','fish','smoked salmon','canned tuna','deli turkey',
    'deli ham','pepperoni','prosciutto','salami','rotisserie chicken',
    'chicken breast','chicken thigh','chicken wing',
  ],

  // ── Dairy & Eggs ────────────────────────────────────────────
  'Dairy & Eggs': [
    'eggs','egg','egg whites','butter','milk','cream','heavy cream',
    'sour cream','cream cheese','cheese','cheddar','mozzarella','feta',
    'parmesan','swiss','gouda','brie','ricotta','cottage cheese',
    'greek yogurt','yogurt','whipped cream','ghee','paneer',
    'almond milk','oat milk','coconut milk','soy milk','plant milk',
  ],

  // ── Bread & Bakery ──────────────────────────────────────────
  'Bread & Bakery': [
    'bread','bagel','tortilla','pita','bun','roll','croissant','muffin',
    'english muffin','sourdough','wrap','flatbread','naan','roti',
    'corn tortilla','flour tortilla','waffle','pancake mix',
  ],

  // ── Pantry & Dry Goods ──────────────────────────────────────
  'Pantry & Dry Goods': [
    'oats','rice','pasta','quinoa','flour','sugar','brown sugar',
    'granola','cereal','breadcrumbs','crackers','pretzels','chips',
    'popcorn','rice cakes','protein bar','granola bar','lentils','beans',
    'black beans','chickpeas','kidney beans','canned tomatoes','tomato sauce',
    'tomato paste','vegetable broth','chicken broth','coconut milk',
    'canned tuna','sardines','vermicelli','semolina','sabudana',
    'tapioca','flaxseed','chia seeds','hemp seeds','sunflower seeds',
    'pumpkin seeds','oat milk','poha','moong dal','besan','chickpea flour',
    'protein powder','whey protein','cocoa','chocolate','dark chocolate',
  ],

  // ── Nuts, Seeds & Oils ──────────────────────────────────────
  'Nuts, Seeds & Oils': [
    'olive oil','coconut oil','vegetable oil','sesame oil','avocado oil',
    'peanut butter','almond butter','tahini','peanuts','almonds','cashews',
    'walnuts','pecans','hazelnuts','pistachios','mixed nuts','roasted nuts',
    'trail mix','pine nuts','sunflower seeds','pumpkin seeds','chia seeds',
    'hemp seeds','flaxseed','sesame seeds','almond milk',
  ],

  // ── Condiments & Sauces ─────────────────────────────────────
  'Condiments & Sauces': [
    'salt','pepper','soy sauce','hot sauce','salsa','mayo','mustard',
    'ketchup','ranch','hummus','pesto','olive oil','vinegar','honey',
    'maple syrup','jam','jelly','sriracha','worcestershire','fish sauce',
    'oyster sauce','hoisin','teriyaki','bbq sauce','buffalo sauce',
    'green chutney','tamarind','chaat masala','everything bagel seasoning',
    'capers','pickles','relish','nutritional yeast',
  ],

  // ── Spices & Herbs ──────────────────────────────────────────
  'Spices & Herbs': [
    'cinnamon','turmeric','cumin','paprika','chili powder','cayenne',
    'oregano','thyme','basil','rosemary','bay leaf','cardamom','cloves',
    'nutmeg','allspice','curry powder','garam masala','za\'atar','sumac',
    'red pepper flakes','black pepper','white pepper','vanilla','baking soda',
    'baking powder','yeast','cornstarch','cream of tartar','mustard seeds',
    'curry leaves','coriander','fennel seeds',
  ],

  // ── Frozen ──────────────────────────────────────────────────
  Frozen: [
    'frozen banana','frozen berries','frozen mango','frozen peas',
    'frozen corn','frozen vegetables','frozen fruit','acai puree',
    'frozen waffle','frozen pizza','ice cream','edamame',
  ],

  // ── Beverages ───────────────────────────────────────────────
  Beverages: [
    'coffee','tea','orange juice','apple juice','coconut water',
    'sparkling water','water','green tea','matcha',
  ],
}

// Build a reverse lookup: ingredient keyword → category
const REVERSE_MAP = {}
for (const [cat, items] of Object.entries(CATEGORY_MAP)) {
  for (const item of items) {
    REVERSE_MAP[item.toLowerCase()] = cat
  }
}

export const GROCERY_CATEGORY_ORDER = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bread & Bakery',
  'Pantry & Dry Goods',
  'Nuts, Seeds & Oils',
  'Condiments & Sauces',
  'Spices & Herbs',
  'Frozen',
  'Beverages',
  'Other',
]

export function categorizeIngredient(ingredient) {
  const lower = ingredient.toLowerCase().trim()

  // Exact match first
  if (REVERSE_MAP[lower]) return REVERSE_MAP[lower]

  // Partial match — check if ingredient contains any known keyword
  for (const [keyword, cat] of Object.entries(REVERSE_MAP)) {
    if (lower.includes(keyword) || keyword.includes(lower)) return cat
  }

  return 'Other'
}

export function groupGroceryByCategory(groceryMap) {
  const grouped = {}

  for (const [ingredient, meals] of Object.entries(groceryMap)) {
    const cat = categorizeIngredient(ingredient)
    if (!grouped[cat]) grouped[cat] = {}
    grouped[cat][ingredient] = meals
  }

  // Sort categories in aisle order
  const sorted = {}
  for (const cat of GROCERY_CATEGORY_ORDER) {
    if (grouped[cat]) sorted[cat] = grouped[cat]
  }
  // Add any uncategorized leftovers
  for (const cat of Object.keys(grouped)) {
    if (!sorted[cat]) sorted[cat] = grouped[cat]
  }

  return sorted
}

// Rough quantity estimates based on how many meals use an ingredient
// Recipes are written assuming a base of 2 servings. `servings` lets the
// grocery list scale up or down — we fold it into an "effective" meal count
// so all the existing tier thresholds below scale proportionally.
export function estimateQuantity(ingredient, mealCount, servings = 2) {
  const lower = ingredient.toLowerCase()
  const scale = Math.max(servings, 1) / 2
  const effective = mealCount * scale

  // Eggs
  if (lower.includes('egg') && !lower.includes('eggplant')) {
    const count = Math.ceil(effective * 2)
    return `${count} egg${count !== 1 ? 's' : ''}`
  }
  // Bread / tortillas
  if (lower.includes('bread')) return effective <= 2 ? '½ loaf' : effective <= 5 ? '1 loaf' : '2 loaves'
  if (lower.includes('tortilla')) {
    const count = Math.ceil(effective * 3)
    return `${count} tortillas`
  }
  // Milk / almond milk
  if (lower.includes('milk')) return effective <= 2 ? '1 cup' : effective <= 5 ? '1 quart' : '½ gallon'
  // Oats
  if (lower.includes('oat')) return `${Math.ceil(effective)} cup${effective > 1 ? 's' : ''}`
  // Rice
  if (lower === 'rice' || lower.includes('rice')) return `${Math.ceil(effective)} cup${effective > 1 ? 's' : ''} dry`
  // Pasta
  if (lower.includes('pasta')) return effective <= 2 ? '8 oz' : effective <= 5 ? '1 lb' : '2 lbs'
  // Chicken
  if (lower.includes('chicken') && !lower.includes('sausage')) {
    const lbs = Math.max(1, Math.ceil(effective))
    return `${lbs} lb${lbs > 1 ? 's' : ''}`
  }
  // Salmon / fish
  if (lower.includes('salmon') || lower.includes('fish')) {
    const fillets = Math.max(servings, mealCount)
    return `${fillets} fillet${fillets > 1 ? 's' : ''}`
  }
  // Butter
  if (lower === 'butter' || lower.includes('butter')) return effective <= 4 ? '1 stick (½ cup)' : '2 sticks (1 cup)'
  // Olive oil
  if (lower.includes('olive oil') || lower.includes('oil')) return 'as needed'
  // Garlic
  if (lower === 'garlic') return effective <= 3 ? '1 bulb' : '2 bulbs'
  // Onion
  if (lower === 'onion') {
    const count = Math.max(1, Math.ceil(effective))
    return `${count} onion${count > 1 ? 's' : ''}`
  }
  // Avocado
  if (lower.includes('avocado')) {
    const count = Math.max(1, Math.ceil(effective))
    return `${count} avocado${count > 1 ? 's' : ''}`
  }
  // Banana
  if (lower.includes('banana')) return effective <= 3 ? `${Math.max(2, Math.ceil(effective))} bananas` : '1 bunch'
  // Berries
  if (lower.includes('berries') || lower.includes('blueberries') || lower.includes('strawberries')) {
    return effective <= 2 ? '1 cup' : effective <= 5 ? '1 pint' : '1 quart'
  }
  // Yogurt
  if (lower.includes('yogurt')) return effective <= 2 ? '1 cup' : '32 oz container'
  // Cheese
  if (lower.includes('cheese')) return effective <= 2 ? '4 oz' : effective <= 5 ? '8 oz block' : '1 lb block'
  // Spinach
  if (lower.includes('spinach')) return effective <= 2 ? '2 cups' : '5 oz bag'
  // Tomato
  if (lower === 'tomato' || lower.includes('tomato')) {
    const count = Math.max(1, Math.ceil(effective))
    return `${count} tomato${count > 1 ? 'es' : ''}`
  }
  // Lemon / lime
  if (lower.includes('lemon') || lower.includes('lime')) {
    const count = Math.max(1, Math.ceil(effective))
    return `${count} ${lower.includes('lemon') ? 'lemons' : 'limes'}`
  }
  // Salt, pepper, spices
  if (['salt','pepper','cumin','turmeric','cinnamon','paprika','oregano'].some(s => lower.includes(s))) {
    return 'pantry staple'
  }
  // Honey / maple syrup
  if (lower.includes('honey') || lower.includes('maple syrup')) return 'to taste'
  // Beans / chickpeas
  if (lower.includes('bean') || lower.includes('chickpea') || lower.includes('lentil')) {
    const cans = Math.max(1, Math.ceil(effective))
    return `${cans} can${cans > 1 ? 's' : ''} (15 oz)`
  }

  // Default: just show count
  if (mealCount > 1) return `×${mealCount} uses`
  return null
}
