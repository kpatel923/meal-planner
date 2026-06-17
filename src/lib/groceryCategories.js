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
export function estimateQuantity(ingredient, mealCount) {
  const lower = ingredient.toLowerCase()

  // Eggs
  if (lower.includes('egg') && !lower.includes('eggplant')) {
    return mealCount <= 2 ? '4 eggs' : mealCount <= 4 ? '6–8 eggs' : '12 eggs (1 dozen)'
  }
  // Bread / tortillas
  if (lower.includes('bread')) return mealCount <= 2 ? '½ loaf' : '1 loaf'
  if (lower.includes('tortilla')) return mealCount <= 2 ? '4–6 tortillas' : '8–10 tortillas'
  // Milk / almond milk
  if (lower.includes('milk')) return mealCount <= 2 ? '1 cup' : '1 quart'
  // Oats
  if (lower.includes('oat')) return mealCount <= 2 ? '1 cup' : '2–3 cups'
  // Rice
  if (lower === 'rice' || lower.includes('rice')) return mealCount <= 2 ? '1 cup dry' : '2 cups dry'
  // Pasta
  if (lower.includes('pasta')) return mealCount <= 2 ? '8 oz' : '1 lb'
  // Chicken
  if (lower.includes('chicken') && !lower.includes('sausage')) return mealCount <= 2 ? '1 lb' : '2 lbs'
  // Salmon / fish
  if (lower.includes('salmon') || lower.includes('fish')) return mealCount <= 2 ? '2 fillets' : '4 fillets'
  // Butter
  if (lower === 'butter' || lower.includes('butter')) return '1 stick (½ cup)'
  // Olive oil
  if (lower.includes('olive oil') || lower.includes('oil')) return 'as needed'
  // Garlic
  if (lower === 'garlic') return mealCount <= 2 ? '1 bulb' : '2 bulbs'
  // Onion
  if (lower === 'onion') return mealCount <= 2 ? '1 onion' : '2–3 onions'
  // Avocado
  if (lower.includes('avocado')) return mealCount <= 2 ? '1 avocado' : `${mealCount} avocados`
  // Banana
  if (lower.includes('banana')) return mealCount <= 2 ? '2 bananas' : '1 bunch'
  // Berries
  if (lower.includes('berries') || lower.includes('blueberries') || lower.includes('strawberries')) {
    return mealCount <= 2 ? '1 cup' : '1 pint'
  }
  // Yogurt
  if (lower.includes('yogurt')) return mealCount <= 2 ? '1 cup' : '32 oz container'
  // Cheese
  if (lower.includes('cheese')) return mealCount <= 2 ? '4 oz' : '8 oz block'
  // Spinach
  if (lower.includes('spinach')) return mealCount <= 2 ? '2 cups' : '5 oz bag'
  // Tomato
  if (lower === 'tomato' || lower.includes('tomato')) return mealCount <= 2 ? '2 tomatoes' : '4 tomatoes'
  // Lemon / lime
  if (lower.includes('lemon') || lower.includes('lime')) return `${Math.min(mealCount, 4)} ${lower.includes('lemon') ? 'lemons' : 'limes'}`
  // Salt, pepper, spices
  if (['salt','pepper','cumin','turmeric','cinnamon','paprika','oregano'].some(s => lower.includes(s))) {
    return 'pantry staple'
  }
  // Honey / maple syrup
  if (lower.includes('honey') || lower.includes('maple syrup')) return 'to taste'
  // Beans / chickpeas
  if (lower.includes('bean') || lower.includes('chickpea') || lower.includes('lentil')) {
    return mealCount <= 2 ? '1 can (15 oz)' : '2 cans'
  }

  // Default: just show count
  if (mealCount > 1) return `×${mealCount} uses`
  return null
}
