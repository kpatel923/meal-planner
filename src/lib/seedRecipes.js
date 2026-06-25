// A small, balanced set of starter recipes new users can one-tap import so the
// app isn't empty on day one. Common ingredients so nutrition/cost estimate well.
// Spread across categories and diet types.

export const SEED_RECIPES = [
  // ── Breakfast ──
  { item_name: 'Veggie Scramble', category: 'Breakfast', diet_type: 'veg', ingredients: 'eggs, spinach, tomato, onion, cheese, olive oil', prep_time: 15, calories: 320 },
  { item_name: 'Overnight Oats', category: 'Breakfast', diet_type: 'vegan', ingredients: 'oats, almond milk, banana, chia seeds, peanut butter', prep_time: 5, calories: 380 },
  { item_name: 'Greek Yogurt Bowl', category: 'Breakfast', diet_type: 'veg', ingredients: 'greek yogurt, berries, honey, granola, almonds', prep_time: 5, calories: 290 },
  { item_name: 'Avocado Toast', category: 'Breakfast', diet_type: 'vegan', ingredients: 'bread, avocado, lemon, chili flakes, salt, olive oil', prep_time: 8, calories: 340 },
  { item_name: 'Breakfast Burrito', category: 'Breakfast', diet_type: 'nonveg', ingredients: 'tortilla, eggs, bacon, cheese, salsa, bell pepper', prep_time: 20, calories: 480 },

  // ── Lunch ──
  { item_name: 'Chicken Caesar Wrap', category: 'Lunch', diet_type: 'nonveg', ingredients: 'tortilla, chicken, romaine lettuce, parmesan, caesar dressing', prep_time: 15, calories: 450 },
  { item_name: 'Quinoa Power Bowl', category: 'Lunch', diet_type: 'vegan', ingredients: 'quinoa, chickpeas, cucumber, tomato, avocado, lemon, olive oil', prep_time: 20, calories: 410 },
  { item_name: 'Caprese Sandwich', category: 'Lunch', diet_type: 'veg', ingredients: 'bread, mozzarella, tomato, basil, balsamic, olive oil', prep_time: 10, calories: 390 },
  { item_name: 'Turkey & Hummus Plate', category: 'Lunch', diet_type: 'nonveg', ingredients: 'turkey, hummus, pita, carrot, cucumber, olives', prep_time: 10, calories: 360 },
  { item_name: 'Lentil Soup', category: 'Lunch', diet_type: 'vegan', ingredients: 'lentils, carrot, celery, onion, garlic, vegetable broth, cumin', prep_time: 40, calories: 300 },

  // ── Dinner ──
  { item_name: 'Lemon Herb Salmon', category: 'Dinner', diet_type: 'nonveg', ingredients: 'salmon, lemon, garlic, dill, olive oil, asparagus', prep_time: 25, calories: 520 },
  { item_name: 'Veggie Stir Fry', category: 'Dinner', diet_type: 'vegan', ingredients: 'tofu, broccoli, bell pepper, carrot, soy sauce, ginger, rice', prep_time: 25, calories: 430 },
  { item_name: 'Spaghetti Marinara', category: 'Dinner', diet_type: 'veg', ingredients: 'pasta, tomato, garlic, onion, basil, olive oil, parmesan', prep_time: 30, calories: 480 },
  { item_name: 'Chicken Fajitas', category: 'Dinner', diet_type: 'nonveg', ingredients: 'chicken, bell pepper, onion, tortilla, lime, cumin, paprika', prep_time: 30, calories: 540 },
  { item_name: 'Black Bean Tacos', category: 'Dinner', diet_type: 'vegan', ingredients: 'black beans, tortilla, avocado, tomato, onion, lime, cilantro', prep_time: 20, calories: 420 },
  { item_name: 'Beef & Broccoli', category: 'Dinner', diet_type: 'nonveg', ingredients: 'beef, broccoli, garlic, ginger, soy sauce, rice', prep_time: 30, calories: 560 },

  // ── Snack ──
  { item_name: 'Hummus & Veggies', category: 'Snack', diet_type: 'vegan', ingredients: 'hummus, carrot, cucumber, bell pepper', prep_time: 5, calories: 180 },
  { item_name: 'Apple & Peanut Butter', category: 'Snack', diet_type: 'vegan', ingredients: 'apple, peanut butter', prep_time: 3, calories: 220 },
  { item_name: 'Trail Mix', category: 'Snack', diet_type: 'vegan', ingredients: 'almonds, cashews, raisins, dark chocolate', prep_time: 2, calories: 240 },
  { item_name: 'Cheese & Crackers', category: 'Snack', diet_type: 'veg', ingredients: 'cheese, crackers, grapes', prep_time: 3, calories: 260 },
]
