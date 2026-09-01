import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

dotenv.config();

const sampleProducts = [
  {
    name: 'AeroGlide Ultra Marathon Running Shoes',
    description: 'Engineered with responsive carbon-infused foam and breathable engineered mesh for elite marathon distance comfort.',
    price: 189.99,
    category: 'Running',
    stock: 45,
    sku: 'SHOE-RUN-001',
  },
  {
    name: 'PulseTrail Waterproof All-Terrain Shoes',
    description: 'Rugged Vibram outsole with Gore-Tex waterproof membrane designed for wet, rocky trail navigation.',
    price: 165.0,
    category: 'Trail & Outdoor',
    stock: 30,
    sku: 'SHOE-TRL-002',
  },
  {
    name: 'CloudStrider Daily Trainer',
    description: 'Plush daily running shoe featuring dual-density cushioning and a supportive heel counter for everyday miles.',
    price: 139.5,
    category: 'Running',
    stock: 60,
    sku: 'SHOE-RUN-003',
  },
  {
    name: 'MetroClassic Leather Low-Top Sneakers',
    description: 'Minimalist full-grain Italian leather sneakers with hand-stitched cupsole for versatile smart-casual styling.',
    price: 149.0,
    category: 'Lifestyle',
    stock: 40,
    sku: 'SHOE-LFS-004',
  },
  {
    name: 'ApexCourt Pro Basketball Shoes',
    description: 'High-top silhouette with multidirectional herringbone traction and lateral outrigger for explosive court cuts.',
    price: 175.0,
    category: 'Basketball',
    stock: 25,
    sku: 'SHOE-BB-005',
  },
  {
    name: 'Zenith Knit Slip-On Walkers',
    description: 'Ultra-lightweight stretch-knit upper with memory foam insole for effortless all-day commuting comfort.',
    price: 89.99,
    category: 'Lifestyle',
    stock: 75,
    sku: 'SHOE-LFS-006',
  },
  {
    name: 'TitanCross HIIT & Gym Training Shoes',
    description: 'Flat, stable heel with wide toe box and reinforced sidewall rope wraps for heavy lifting and plyometrics.',
    price: 129.99,
    category: 'Training',
    stock: 50,
    sku: 'SHOE-TRN-007',
  },
  {
    name: 'NovaTempo Lightweight Speed Racer',
    description: 'Featherlight 6.8oz racing flat with energy-returning PEBAX plate for tempo workouts and 5k/10k races.',
    price: 199.99,
    category: 'Running',
    stock: 20,
    sku: 'SHOE-RUN-008',
  },
  {
    name: 'RetroVibe 80s Suede Heritage Sneakers',
    description: 'Vintage-inspired premium suede overlays with classic gum rubber waffle sole and retro color blocking.',
    price: 110.0,
    category: 'Lifestyle',
    stock: 35,
    sku: 'SHOE-LFS-009',
  },
  {
    name: 'SummitShield Winterized Hiking Boot',
    description: 'Insulated Thinsulate lining with waterproof leather upper and Arctic Grip ice-traction lugs.',
    price: 215.0,
    category: 'Trail & Outdoor',
    stock: 18,
    sku: 'SHOE-TRL-010',
  },
  {
    name: 'HyperDrive Mid Basketball Sneaker',
    description: 'Mid-cut ankle lockdown with Zoom air cushioning units in the forefoot and heel for impact absorption.',
    price: 159.0,
    category: 'Basketball',
    stock: 28,
    sku: 'SHOE-BB-011',
  },
  {
    name: 'EcoStep Sustainable Organic Canvas Sneakers',
    description: 'Crafted with 100% GOTS-certified organic cotton canvas and natural vulcanized wild rubber soles.',
    price: 95.0,
    category: 'Lifestyle',
    stock: 55,
    sku: 'SHOE-LFS-012',
  },
  {
    name: 'SprintFlex Track & Field Spikes',
    description: 'Rigid 8-pin forefoot spike plate designed for 100m-400m sprinters seeking maximum propulsion.',
    price: 120.0,
    category: 'Athletic',
    stock: 15,
    sku: 'SHOE-ATH-013',
  },
  {
    name: 'VortexStability Arch-Support Runners',
    description: 'Medial post dynamic stability system to gently correct overpronation over long distances.',
    price: 145.0,
    category: 'Running',
    stock: 42,
    sku: 'SHOE-RUN-014',
  },
  {
    name: 'Coastline Water-Resistant Deck Shoes',
    description: 'Quick-drying mesh upper with razor-siped non-marking outsole for grip on wet surfaces.',
    price: 98.0,
    category: 'Lifestyle',
    stock: 30,
    sku: 'SHOE-LFS-015',
  },
  {
    name: 'ProPerformance Anti-Blister Running Socks (3-Pack)',
    description: 'Merino wool blend with targeted arch compression and seamless toe construction to prevent blisters.',
    price: 28.0,
    category: 'Accessories',
    stock: 120,
    sku: 'ACC-SOX-016',
  },
  {
    name: 'CustomFit Orthotic Support Insoles',
    description: 'Dual-layer antimicrobial memory foam with rigid deep heel cradle for plantar fasciitis relief.',
    price: 38.0,
    category: 'Accessories',
    stock: 80,
    sku: 'ACC-INS-017',
  },
  {
    name: 'SpeedLace Elastic No-Tie Lock Laces',
    description: 'Heavy-duty reflective elastic stretch cords with quick-release lock system for rapid transitions.',
    price: 14.99,
    category: 'Accessories',
    stock: 150,
    sku: 'ACC-LAC-018',
  },
];

const sampleCoupons = [
  {
    code: 'WELCOME10',
    discountType: 'percent',
    discountValue: 10,
    minOrderValue: 50,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Active (1 year)
    usageLimit: 500,
    usedCount: 0,
  },
  {
    code: 'FLAT50',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 200,
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // Active ($200 min order)
    usageLimit: 100,
    usedCount: 0,
  },
  {
    code: 'SPRINT20',
    discountType: 'percent',
    discountValue: 20,
    minOrderValue: 120,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Active ($120 min order)
    usageLimit: 250,
    usedCount: 0,
  },
  {
    code: 'EXPIRED50',
    discountType: 'percent',
    discountValue: 50,
    minOrderValue: 0,
    expiresAt: new Date('2024-01-01T00:00:00.000Z'), // Deliberate Expired Demo
    usageLimit: 100,
    usedCount: 12,
  },
  {
    code: 'MAXEDOUT',
    discountType: 'flat',
    discountValue: 30,
    minOrderValue: 50,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Deliberate Reached Limit Demo
    usageLimit: 5,
    usedCount: 5,
  },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_shopping_agent';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing Products and Coupons...');
    await Product.deleteMany({});
    await Coupon.deleteMany({});

    console.log('[Seed] Inserting products...');
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`[Seed] Successfully seeded ${insertedProducts.length} products.`);

    console.log('[Seed] Inserting coupons...');
    const insertedCoupons = await Coupon.insertMany(sampleCoupons);
    console.log(`[Seed] Successfully seeded ${insertedCoupons.length} coupons.`);

    console.log('\n--- Seeded Products Summary ---');
    insertedProducts.forEach((p) => {
      console.log(`  - [${p.sku}] ${p.name} ($${p.price}) | Category: ${p.category} | Stock: ${p.stock}`);
    });

    console.log('\n--- Seeded Coupons Summary ---');
    insertedCoupons.forEach((c) => {
      const isExpired = c.expiresAt < new Date();
      const isMaxed = c.usageLimit && c.usedCount >= c.usageLimit;
      const note = isExpired ? ' [EXPIRED DEMO]' : isMaxed ? ' [USAGE LIMIT REACHED DEMO]' : ' [ACTIVE]';
      console.log(`  - [${c.code}] ${c.discountType === 'percent' ? `${c.discountValue}% off` : `$${c.discountValue} flat off`} (Min Order: $${c.minOrderValue}, Expires: ${c.expiresAt.toISOString().split('T')[0]})${note}`);
    });

    console.log('\n[Seed] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
