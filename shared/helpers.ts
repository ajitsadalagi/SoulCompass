export function getCategoryEmoji(category: string): string {
  switch (category.toLowerCase()) {
    case 'fruits':
      return '🍎';
    case 'vegetables':
      return '🥕';
    case 'dairy':
      return '🥛';
    default:
      return '📦';
  }
}

export function getProductEmoji(name: string, category: string): string {
  const productMap: Record<string, string> = {
    // Fruits
    'apple': '🍎',
    'banana': '🍌',
    'orange': '🍊',
    'mango': '🥭',
    'grapes': '🍇',
    'watermelon': '🍉',
    'pear': '🍐',
    'peach': '🍑',
    'strawberry': '🍓',
    'pineapple': '🍍',
    'coconut': '🥥',
    'kiwi': '🥝',
    'lemon': '🍋',
    'cherries': '🍒',
    'blueberries': '🫐',
    'pomegranate': '🥭',
    'guava': '🥭',
    'plum': '🍑',
    'fig': '🥭',
    'apricot': '🍊',
    'blackberry': '🫐',
    'raspberry': '🍓',
    'dragonfruit': '🥭',
    'passionfruit': '🥭',
    'lychee': '🥭',

    // Vegetables
    'tomato': '🍅',
    'carrot': '🥕',
    'potato': '🥔',
    'broccoli': '🥦',
    'cucumber': '🥒',
    'eggplant': '🍆',
    'corn': '🌽',
    'lettuce': '🥬',
    'bellpepper': '🫑',
    'onion': '🧅',
    'garlic': '🧄',
    'mushroom': '🍄',
    'sweetpotato': '🥔',
    'cauliflower': '🥦',
    'cabbage': '🥬',
    'spinach': '🌿',
    'peas': '🫛',
    'asparagus': '🌿',
    'celery': '🌿',
    'radish': '🥕',
    'beetroot': '🥕',
    'zucchini': '🥒',
    'pumpkin': '🎃',
    'greenbeans': '🫘',
    'artichoke': '🌿',

    // Dairy
    'milk': '🥛',
    'cheese': '🧀',
    'butter': '🧈',
    'yogurt': '🥛',
    'cream': '🥛',
    'skimmedmilk': '🥛',
    'wholemilk': '🥛',
    'cheddarcheese': '🧀',
    'mozzarella': '🧀',
    'cottagecheese': '🧀',
    'sourcream': '🥛',
    'heavycream': '🥛',
    'buttermilk': '🥛',
    'condensedmilk': '🥛',
    'evaporatedmilk': '🥛',
    'parmesancheese': '🧀',
    'ricottacheese': '🧀',
    'bluecheese': '🧀',
    'goudacheese': '🧀',
    'fetacheese': '🧀',
    'creamcheese': '🧀',
    'mascarpone': '🧀',
    'provolone': '🧀',
    'brie': '🧀',
    'camembert': '🧀',

    // Other
    'rice': '🍚',
    'wheat': '🌾',
    'bread': '🍞',
    'eggs': '🥚',
    'honey': '🍯',
    'flour': '🌾',
    'sugar': '🧂',
    'salt': '🧂',
    'pepper': '🌶️',
    'pasta': '🍝',
    'oats': '🌾',
    'nuts': '🥜',
    'seeds': '🌱',
    'coffee': '☕',
    'tea': '🫖',
    'spices': '🌶️',
    'oil': '🫗',
    'vinegar': '🫗',
    'soy_sauce': '🫗',
    'ketchup': '🥫',
    'mayonnaise': '🫗',
    'mustard': '🫗',
    'jam': '🍯',
    'peanut_butter': '🥜',
    'chocolate': '🍫'
  };

  const lowercaseName = name.toLowerCase().replace(/[^a-z]/g, '');
  return productMap[lowercaseName] || getCategoryEmoji(category);
}
