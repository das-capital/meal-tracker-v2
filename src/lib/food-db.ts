import Fuse from 'fuse.js';

export interface FoodItem {
    name: string;
    aliases: string[];
    per100: number;   // calories per 100g or 100ml
    protein: number;  // g per 100
    fat: number;      // g per 100
    carbs: number;    // g per 100
    fiber: number;    // g per 100
    unit: 'g' | 'ml';
    defaultServing?: number; // weight per single piece (g/ml) — enables "2 roti" style queries
}

export const FOOD_DB: FoodItem[] = [
    // --- Indian breads ---
    { name: 'Chapati', aliases: ['roti', 'phulka', 'fulka', 'wheat roti', 'chapathi', 'chappati', 'chappathi', 'rotee', 'chapati'], per100: 240, protein: 7, fat: 4, carbs: 47, fiber: 4, unit: 'g', defaultServing: 30 },
    { name: 'Paratha', aliases: ['plain paratha', 'aloo paratha', 'stuffed paratha', 'parata', 'paraatha', 'parantha', 'paranthe'], per100: 310, protein: 7, fat: 12, carbs: 44, fiber: 3, unit: 'g', defaultServing: 60 },
    { name: 'Puri', aliases: ['poori', 'poorie', 'puri bread', 'pooori'], per100: 350, protein: 6, fat: 18, carbs: 43, fiber: 2, unit: 'g', defaultServing: 40 },
    { name: 'Naan', aliases: ['tandoori naan', 'garlic naan', 'nan', 'naan bread'], per100: 310, protein: 9, fat: 6, carbs: 56, fiber: 2, unit: 'g', defaultServing: 80 },
    { name: 'Bhatura', aliases: ['bhatoora', 'bhatora', 'bhature', 'bhaatura'], per100: 360, protein: 8, fat: 17, carbs: 45, fiber: 2, unit: 'g', defaultServing: 90 },

    // --- Indian rice dishes ---
    { name: 'Cooked White Rice', aliases: ['rice', 'chawal', 'white rice', 'steamed rice', 'plain rice', 'boiled rice'], per100: 130, protein: 3, fat: 0, carbs: 28, fiber: 0, unit: 'g' },
    { name: 'Cooked Brown Rice', aliases: ['brown rice'], per100: 112, protein: 3, fat: 1, carbs: 23, fiber: 2, unit: 'g' },
    { name: 'Biryani', aliases: ['chicken biryani', 'veg biryani', 'mutton biryani', 'veg biryani'], per100: 180, protein: 8, fat: 7, carbs: 23, fiber: 1, unit: 'g' },
    { name: 'Pulao', aliases: ['vegetable pulao', 'veg pulao', 'jeera rice'], per100: 150, protein: 4, fat: 4, carbs: 26, fiber: 1, unit: 'g' },
    { name: 'Khichdi', aliases: ['dal khichdi', 'moong khichdi'], per100: 130, protein: 6, fat: 3, carbs: 22, fiber: 2, unit: 'g' },

    // --- Indian lentils & legumes ---
    { name: 'Dal', aliases: ['cooked dal', 'toor dal', 'arhar dal', 'yellow dal', 'lentil soup', 'dal tadka', 'dal fry', 'daal', 'dhal', 'lentil curry', 'tuvar dal', 'tur dal'], per100: 116, protein: 9, fat: 4, carbs: 14, fiber: 4, unit: 'g' },
    { name: 'Rajma', aliases: ['kidney beans', 'red kidney beans', 'rajma masala', 'rajmah', 'raajma', 'kidney bean curry'], per100: 127, protein: 9, fat: 1, carbs: 22, fiber: 6, unit: 'g' },
    { name: 'Chole', aliases: ['chana masala', 'chickpeas', 'chhole', 'garbanzo beans', 'chana', 'choley', 'chholey', 'chole masala', 'kabuli chana', 'white chana'], per100: 164, protein: 9, fat: 3, carbs: 27, fiber: 8, unit: 'g' },
    { name: 'Dal Makhani', aliases: ['makhani dal', 'black dal', 'dal makhni', 'daal makhani', 'daal makhni', 'black lentil dal', 'maa ki dal'], per100: 140, protein: 7, fat: 7, carbs: 13, fiber: 4, unit: 'g' },
    { name: 'Moong Dal', aliases: ['moong dal cooked', 'green lentils', 'mung dal', 'moong daal', 'mung dhal', 'yellow moong'], per100: 105, protein: 7, fat: 1, carbs: 18, fiber: 3, unit: 'g' },
    { name: 'Masoor Dal', aliases: ['red lentils', 'red dal', 'masoor cooked', 'masoor daal', 'pink lentils'], per100: 116, protein: 9, fat: 0, carbs: 20, fiber: 4, unit: 'g' },
    { name: 'Chana Dal', aliases: ['split chickpeas', 'bengal gram', 'chana daal', 'split chana'], per100: 164, protein: 9, fat: 3, carbs: 27, fiber: 8, unit: 'g' },
    { name: 'Urad Dal', aliases: ['black gram dal', 'split urad', 'urad daal', 'white lentils'], per100: 118, protein: 8, fat: 1, carbs: 21, fiber: 4, unit: 'g' },

    // --- Indian breakfast ---
    { name: 'Idli', aliases: ['idly', 'steamed idli', 'idlee', 'rice cake', 'idlies'], per100: 58, protein: 2, fat: 0, carbs: 12, fiber: 1, unit: 'g', defaultServing: 40 },
    { name: 'Dosa', aliases: ['plain dosa', 'masala dosa', 'crispy dosa', 'dhosa', 'dosai', 'dosha', 'dose'], per100: 168, protein: 4, fat: 6, carbs: 25, fiber: 1, unit: 'g', defaultServing: 90 },
    { name: 'Upma', aliases: ['rava upma', 'semolina upma', 'uppma', 'upuma', 'rawa upma'], per100: 140, protein: 4, fat: 4, carbs: 22, fiber: 2, unit: 'g' },
    { name: 'Poha', aliases: ['flattened rice', 'beaten rice', 'aloo poha', 'pohe', 'pauha', 'chivda', 'pawa'], per100: 180, protein: 4, fat: 5, carbs: 30, fiber: 2, unit: 'g' },
    { name: 'Sambar', aliases: ['sambhar', 'vegetable sambar', 'saambhar', 'sambar curry', 'lentil stew'], per100: 55, protein: 3, fat: 2, carbs: 8, fiber: 2, unit: 'g' },

    // --- Indian curries & sabzi ---
    { name: 'Chicken Curry', aliases: ['chicken masala', 'murgh masala', 'chicken gravy', 'murgi', 'chicken sabzi', 'chicken shorba', 'murghi curry'], per100: 150, protein: 14, fat: 9, carbs: 4, fiber: 1, unit: 'g' },
    { name: 'Mutton Curry', aliases: ['lamb curry', 'gosht', 'mutton masala', 'goat curry', 'mutton shorba', 'keema curry'], per100: 200, protein: 15, fat: 14, carbs: 3, fiber: 0, unit: 'g' },
    { name: 'Egg Curry', aliases: ['anda curry', 'egg masala', 'anda masala', 'egg gravy', 'ande ki sabzi'], per100: 130, protein: 10, fat: 9, carbs: 3, fiber: 0, unit: 'g' },
    { name: 'Fish Curry', aliases: ['machli curry', 'fish masala', 'machhi curry', 'fish gravy', 'fish sabzi'], per100: 120, protein: 13, fat: 6, carbs: 4, fiber: 0, unit: 'g' },
    { name: 'Palak Paneer', aliases: ['spinach paneer', 'saag paneer', 'palaak paneer', 'spinach cottage cheese', 'saag'], per100: 150, protein: 7, fat: 10, carbs: 8, fiber: 2, unit: 'g' },
    { name: 'Paneer Butter Masala', aliases: ['paneer tikka masala', 'paneer makhani', 'butter paneer', 'shahi paneer', 'paneer lababdar'], per100: 200, protein: 8, fat: 14, carbs: 10, fiber: 1, unit: 'g' },
    { name: 'Aloo Gobi', aliases: ['potato cauliflower', 'aloo gobhi', 'aaloo gobhi', 'alu gobhi', 'alu gobi', 'aaloo gobi', 'gobhi aloo', 'phool gobhi sabzi', 'cauliflower potato'], per100: 100, protein: 3, fat: 5, carbs: 12, fiber: 3, unit: 'g' },
    { name: 'Bhindi Masala', aliases: ['okra masala', 'bhindi sabzi', 'ladies finger', 'bhindee', 'bendee', 'bendi', 'bhende', 'okra sabzi', 'lady finger'], per100: 80, protein: 2, fat: 5, carbs: 9, fiber: 3, unit: 'g' },
    { name: 'Sabzi', aliases: ['mixed vegetable sabzi', 'veg sabzi', 'mixed veg', 'subzi', 'sabji', 'tarkari', 'vegetable curry'], per100: 80, protein: 3, fat: 4, carbs: 10, fiber: 3, unit: 'g' },

    // --- Indian dairy & paneer ---
    { name: 'Paneer', aliases: ['cottage cheese', 'fresh paneer', 'panir', 'chenna', 'chhena', 'Indian cottage cheese'], per100: 265, protein: 18, fat: 21, carbs: 2, fiber: 0, unit: 'g' },
    { name: 'Curd', aliases: ['dahi', 'yogurt', 'plain yogurt', 'set curd', 'dahee', 'doi', 'thick curd'], per100: 60, protein: 3, fat: 3, carbs: 5, fiber: 0, unit: 'g' },
    { name: 'Lassi', aliases: ['sweet lassi', 'mango lassi', 'punjabi lassi', 'lasee', 'lassee'], per100: 70, protein: 3, fat: 2, carbs: 10, fiber: 0, unit: 'ml' },
    { name: 'Buttermilk', aliases: ['chaas', 'masala chaas', 'salted buttermilk', 'chach', 'chaach', 'mattha'], per100: 15, protein: 1, fat: 0, carbs: 2, fiber: 0, unit: 'ml' },
    { name: 'Milk', aliases: ['full fat milk', 'whole milk', 'cow milk', 'toned milk', 'dudh', 'doodh', 'buffalo milk'], per100: 61, protein: 3, fat: 3, carbs: 5, fiber: 0, unit: 'ml' },
    { name: 'Ghee', aliases: ['clarified butter', 'desi ghee', 'ghee oil', 'pure ghee'], per100: 900, protein: 0, fat: 100, carbs: 0, fiber: 0, unit: 'g' },

    // --- Indian snacks & sweets ---
    { name: 'Samosa', aliases: ['aloo samosa', 'fried samosa', 'samoosa', 'samose', 'samosas'], per100: 262, protein: 5, fat: 14, carbs: 30, fiber: 2, unit: 'g', defaultServing: 100 },
    { name: 'Pakora', aliases: ['pakoda', 'onion pakora', 'veg pakora', 'bhajiya', 'pakore', 'pakoray', 'bhaji', 'fritters'], per100: 288, protein: 7, fat: 15, carbs: 33, fiber: 3, unit: 'g', defaultServing: 20 },
    { name: 'Gulab Jamun', aliases: ['gulab jamun sweet', 'gulab jaman', 'jamun'], per100: 387, protein: 5, fat: 15, carbs: 58, fiber: 0, unit: 'g', defaultServing: 50 },
    { name: 'Kheer', aliases: ['rice kheer', 'rice pudding', 'payasam', 'khir', 'phirni', 'firni'], per100: 120, protein: 4, fat: 4, carbs: 18, fiber: 0, unit: 'g' },
    { name: 'Halwa', aliases: ['sooji halwa', 'semolina halwa', 'gajar halwa', 'atta halwa', 'sheera', 'carrot halwa'], per100: 300, protein: 4, fat: 12, carbs: 44, fiber: 2, unit: 'g' },
    { name: 'Chai', aliases: ['tea', 'masala chai', 'milk tea', 'cutting chai', 'indian tea', 'cha', 'chai tea', 'ginger tea', 'adrak chai'], per100: 40, protein: 1, fat: 1, carbs: 6, fiber: 0, unit: 'ml' },

    // --- Protein & eggs ---
    { name: 'Boiled Egg', aliases: ['egg', 'hard boiled egg', 'anda', 'cooked egg', 'ande', 'ubla anda', 'boiled anda', 'scrambled egg', 'fried egg'], per100: 155, protein: 13, fat: 11, carbs: 1, fiber: 0, unit: 'g', defaultServing: 50 },
    { name: 'Egg White', aliases: ['boiled egg white', 'egg whites'], per100: 52, protein: 11, fat: 0, carbs: 1, fiber: 0, unit: 'g' },
    { name: 'Chicken Breast', aliases: ['boiled chicken', 'grilled chicken', 'chicken breast cooked', 'skinless chicken'], per100: 165, protein: 31, fat: 4, carbs: 0, fiber: 0, unit: 'g' },
    { name: 'Cooked Salmon', aliases: ['salmon fillet', 'grilled salmon', 'baked salmon'], per100: 208, protein: 20, fat: 13, carbs: 0, fiber: 0, unit: 'g' },
    { name: 'Tuna', aliases: ['canned tuna', 'tuna in water'], per100: 116, protein: 26, fat: 1, carbs: 0, fiber: 0, unit: 'g' },
    { name: 'Soya Chunks', aliases: ['soy chunks', 'soya granules', 'textured vegetable protein', 'TVP cooked'], per100: 149, protein: 17, fat: 1, carbs: 16, fiber: 3, unit: 'g' },
    { name: 'Tofu', aliases: ['firm tofu', 'silken tofu', 'bean curd'], per100: 76, protein: 8, fat: 4, carbs: 2, fiber: 0, unit: 'g' },

    // --- Fruits ---
    { name: 'Banana', aliases: ['kela', 'ripe banana', 'raw banana'], per100: 89, protein: 1, fat: 0, carbs: 23, fiber: 3, unit: 'g', defaultServing: 120 },
    { name: 'Apple', aliases: ['green apple', 'red apple', 'seb'], per100: 52, protein: 0, fat: 0, carbs: 14, fiber: 2, unit: 'g', defaultServing: 180 },
    { name: 'Mango', aliases: ['aam', 'alphonso mango', 'dasheri mango'], per100: 60, protein: 1, fat: 0, carbs: 15, fiber: 2, unit: 'g', defaultServing: 200 },
    { name: 'Orange', aliases: ['santra', 'mosambi', 'sweet lime'], per100: 47, protein: 1, fat: 0, carbs: 12, fiber: 2, unit: 'g', defaultServing: 150 },
    { name: 'Watermelon', aliases: ['tarbooz', 'water melon'], per100: 30, protein: 1, fat: 0, carbs: 8, fiber: 0, unit: 'g', defaultServing: 300 },
    { name: 'Grapes', aliases: ['angoor', 'green grapes', 'black grapes'], per100: 67, protein: 1, fat: 0, carbs: 17, fiber: 1, unit: 'g' },
    { name: 'Papaya', aliases: ['papita', 'raw papaya'], per100: 39, protein: 1, fat: 0, carbs: 10, fiber: 2, unit: 'g' },
    { name: 'Pomegranate', aliases: ['anar', 'pomegranate seeds'], per100: 83, protein: 2, fat: 1, carbs: 19, fiber: 4, unit: 'g' },
    { name: 'Strawberries', aliases: ['strawberry', 'fresh strawberries'], per100: 32, protein: 1, fat: 0, carbs: 8, fiber: 2, unit: 'g' },
    { name: 'Kiwi', aliases: ['kiwifruit', 'kiwi fruit'], per100: 61, protein: 1, fat: 1, carbs: 15, fiber: 3, unit: 'g', defaultServing: 75 },

    // --- Vegetables ---
    { name: 'Boiled Potato', aliases: ['potato', 'aloo', 'cooked potato', 'steamed potato'], per100: 87, protein: 2, fat: 0, carbs: 20, fiber: 2, unit: 'g' },
    { name: 'Sweet Potato', aliases: ['shakarkand', 'yam', 'cooked sweet potato'], per100: 86, protein: 2, fat: 0, carbs: 20, fiber: 3, unit: 'g' },
    { name: 'Spinach', aliases: ['palak', 'cooked spinach', 'baby spinach'], per100: 23, protein: 3, fat: 0, carbs: 4, fiber: 2, unit: 'g' },
    { name: 'Tomato', aliases: ['tamatar', 'fresh tomato'], per100: 18, protein: 1, fat: 0, carbs: 4, fiber: 1, unit: 'g' },
    { name: 'Cucumber', aliases: ['kheera', 'kakdi', 'sliced cucumber'], per100: 15, protein: 1, fat: 0, carbs: 4, fiber: 1, unit: 'g' },
    { name: 'Carrot', aliases: ['gajar', 'raw carrot'], per100: 41, protein: 1, fat: 0, carbs: 10, fiber: 3, unit: 'g' },
    { name: 'Peas', aliases: ['matar', 'green peas', 'cooked peas'], per100: 84, protein: 5, fat: 0, carbs: 15, fiber: 5, unit: 'g' },

    // --- Nuts & seeds ---
    { name: 'Almonds', aliases: ['badam', 'raw almonds', 'soaked almonds'], per100: 579, protein: 21, fat: 50, carbs: 22, fiber: 13, unit: 'g' },
    { name: 'Cashews', aliases: ['kaju', 'raw cashews'], per100: 553, protein: 18, fat: 44, carbs: 30, fiber: 3, unit: 'g' },
    { name: 'Walnuts', aliases: ['akhrot', 'walnut halves'], per100: 654, protein: 15, fat: 65, carbs: 14, fiber: 7, unit: 'g' },
    { name: 'Peanuts', aliases: ['moongfali', 'groundnuts', 'roasted peanuts'], per100: 567, protein: 26, fat: 49, carbs: 16, fiber: 9, unit: 'g' },
    { name: 'Peanut Butter', aliases: ['groundnut butter', 'pb'], per100: 588, protein: 25, fat: 50, carbs: 20, fiber: 6, unit: 'g' },

    // --- Bread & cereals ---
    { name: 'White Bread', aliases: ['bread slice', 'white bread slice', 'sandwich bread'], per100: 265, protein: 9, fat: 3, carbs: 49, fiber: 3, unit: 'g' },
    { name: 'Brown Bread', aliases: ['whole wheat bread', 'multigrain bread', 'brown bread slice'], per100: 243, protein: 9, fat: 3, carbs: 44, fiber: 6, unit: 'g' },
    { name: 'Oats', aliases: ['cooked oats', 'oatmeal', 'porridge', 'rolled oats cooked'], per100: 68, protein: 2, fat: 1, carbs: 12, fiber: 2, unit: 'g' },
    { name: 'Maggi Noodles', aliases: ['maggi', 'instant noodles', '2 minute noodles'], per100: 138, protein: 4, fat: 5, carbs: 20, fiber: 1, unit: 'g' },

    // --- Fats & oils ---
    { name: 'Butter', aliases: ['salted butter', 'unsalted butter', 'amul butter'], per100: 717, protein: 1, fat: 81, carbs: 1, fiber: 0, unit: 'g' },
    { name: 'Cooking Oil', aliases: ['oil', 'sunflower oil', 'vegetable oil', 'refined oil', 'olive oil'], per100: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, unit: 'ml' },

    // --- Beverages ---
    { name: 'Coffee', aliases: ['black coffee', 'filter coffee', 'espresso', 'americano'], per100: 2, protein: 0, fat: 0, carbs: 0, fiber: 0, unit: 'ml' },
    { name: 'Orange Juice', aliases: ['OJ', 'fresh orange juice', 'fruit juice'], per100: 45, protein: 1, fat: 0, carbs: 10, fiber: 0, unit: 'ml' },
    { name: 'Coconut Water', aliases: ['nariyal pani', 'tender coconut', 'coconut juice'], per100: 19, protein: 1, fat: 0, carbs: 4, fiber: 0, unit: 'ml' },
    { name: 'Coconut Milk', aliases: ['thick coconut milk', 'thin coconut milk'], per100: 197, protein: 2, fat: 21, carbs: 3, fiber: 0, unit: 'ml' },

    // --- Other ---
    { name: 'Greek Yogurt', aliases: ['hung curd', 'thick yogurt', 'strained yogurt'], per100: 59, protein: 10, fat: 0, carbs: 4, fiber: 0, unit: 'g' },
    { name: 'Quinoa', aliases: ['cooked quinoa', 'quinoa salad'], per100: 120, protein: 4, fat: 2, carbs: 22, fiber: 3, unit: 'g' },
    { name: 'Sugar', aliases: ['table sugar', 'white sugar', 'chini'], per100: 387, protein: 0, fat: 0, carbs: 100, fiber: 0, unit: 'g' },
    { name: 'Honey', aliases: ['shehad', 'raw honey', 'natural honey'], per100: 304, protein: 0, fat: 0, carbs: 82, fiber: 0, unit: 'g' },
    { name: 'Dark Chocolate', aliases: ['70% dark chocolate', '85% dark chocolate', 'bitter chocolate'], per100: 598, protein: 8, fat: 43, carbs: 46, fiber: 11, unit: 'g' },
    { name: 'Whey Protein', aliases: ['protein powder', 'protein shake', 'whey powder'], per100: 370, protein: 74, fat: 4, carbs: 8, fiber: 0, unit: 'g' },
];

const fuse = new Fuse(FOOD_DB, {
    keys: ['name', 'aliases'],
    threshold: 0.25,
    includeScore: true,
});

/**
 * Strips quantity/verb prefixes so Fuse only sees the food name.
 *   "150gm of aaloo gobhi"  →  "aaloo gobhi"
 *   "had 2 roti"            →  "roti"
 *   "100g rice"             →  "rice"
 */
function extractFoodName(input: string): string {
    return input.toLowerCase()
        .replace(/^\d+\.?\d*\s*(?:gms?|g(?:ram)?s?|ml|kg|l(?:itre|iter)?s?|tbsp|tsp|tablespoons?|teaspoons?|bowls?|cups?|pieces?|pcs)\s*(?:of\s+)?/i, '')
        .replace(/^(?:had|ate|consumed|eating|having|some|a|an|the)\s+/i, '')
        .trim();
}

/**
 * Normalises common Indian food romanisation variants before fuzzy search:
 *   aaloo → aloo  (double-a)
 *   gobhee → gobhi  (word-ending ee → i)
 *   channa → chana  (double consonants → single)
 */
function normalizeQuery(s: string): string {
    return s.toLowerCase()
        .replace(/aa/g, 'a')                               // aaloo → aloo
        .replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1')     // channa → chana, gobhhi → gobhi
        .replace(/ee\b/g, 'i')                             // gobhee → gobhi, rotee → roti
        .trim();
}

export function findFood(query: string): FoodItem | null {
    const cleaned    = extractFoodName(query);
    const normalized = normalizeQuery(cleaned);

    // Build a de-duped set of variants to search, from most-processed to least
    const variants = [...new Set([normalized, cleaned, query.toLowerCase()])];
    const candidates = variants.flatMap(v => fuse.search(v));

    if (candidates.length === 0) return null;

    const best = candidates
        .filter(r => (r.score ?? 1) < 0.25)
        .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

    return best.length > 0 ? best[0].item : null;
}
