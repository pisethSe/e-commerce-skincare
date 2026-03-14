import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Lumière database...')

  // ── Categories ────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'cleansers' }, update: {}, create: { name: 'Cleansers', slug: 'cleansers', description: 'Gentle yet effective formulas', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80', sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: 'serums' }, update: {}, create: { name: 'Serums', slug: 'serums', description: 'Targeted treatment solutions', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80', sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: 'moisturizers' }, update: {}, create: { name: 'Moisturizers', slug: 'moisturizers', description: 'Deep hydration & nourishment', image: 'https://images.unsplash.com/photo-1574156863536-37fbc5e1cfef?w=800&q=80', sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: 'sunscreen' }, update: {}, create: { name: 'Sunscreen', slug: 'sunscreen', description: 'Broad spectrum protection', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80', sortOrder: 4 } }),
    prisma.category.upsert({ where: { slug: 'eye-care' }, update: {}, create: { name: 'Eye Care', slug: 'eye-care', description: 'Delicate eye area treatments', image: 'https://images.unsplash.com/photo-1567721913486-6585f069b3f4?w=800&q=80', sortOrder: 5 } }),
    prisma.category.upsert({ where: { slug: 'masks' }, update: {}, create: { name: 'Masks', slug: 'masks', description: 'Intensive weekly rituals', image: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&q=80', sortOrder: 6 } }),
  ])

  const [cleansers, serums, moisturizers, sunscreen, eyeCare, masks] = categories
  console.log(`✅ Created ${categories.length} categories`)

  // ── Admin user ────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@lumiere123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumiere.com' },
    update: {},
    create: {
      email: 'admin@lumiere.com',
      password: adminPassword,
      firstName: 'Lumière',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  })
  console.log(`✅ Admin user: admin@lumiere.com / Admin@lumiere123`)

  // ── Sample customer ───────────────────────────
  const userPassword = await bcrypt.hash('User@lumiere123', 12)
  const customer = await prisma.user.upsert({
    where: { email: 'sophie@example.com' },
    update: {},
    create: {
      email: 'sophie@example.com',
      password: userPassword,
      firstName: 'Sophie',
      lastName: 'Martin',
      role: 'USER',
      emailVerified: true,
    },
  })
  console.log(`✅ Sample customer: sophie@example.com / User@lumiere123`)

  // ── Products ──────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'radiance-brightening-serum' },
      update: {},
      create: {
        name: 'Radiance Brightening Serum',
        slug: 'radiance-brightening-serum',
        tagline: 'Luminous skin in 14 days',
        description: 'A potent blend of Vitamin C, niacinamide, and hyaluronic acid that visibly reduces dark spots.',
        longDescription: 'Our Radiance Brightening Serum combines 15% stable Vitamin C with 5% niacinamide and a trio of hyaluronic acids.',
        price: 68,
        comparePrice: 85,
        volume: '30ml / 1 fl oz',
        categoryId: serums.id,
        images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'],
        tags: ['brightening', 'vitamin c', 'anti-aging', 'bestseller'],
        ingredients: ['Ascorbic Acid 15%', 'Niacinamide 5%', 'Hyaluronic Acid', 'Ferulic Acid', 'Vitamin E'],
        benefits: ['Brightens dark spots', 'Evens skin tone', 'Hydrates deeply', 'Boosts collagen'],
        howToUse: 'Apply 3–4 drops to cleansed skin morning and evening.',
        isNew: false, isBestseller: true, isFeatured: true, inStock: true, stockCount: 284,
        rating: 4.8, reviewCount: 342,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'gentle-foam-cleanser' },
      update: {},
      create: {
        name: 'Gentle Foam Cleanser',
        slug: 'gentle-foam-cleanser',
        tagline: 'Pure, soft, perfectly balanced',
        description: 'A pH-balanced foaming cleanser with ceramides and green tea that cleanses without stripping.',
        price: 38,
        volume: '150ml / 5 fl oz',
        categoryId: cleansers.id,
        images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'],
        tags: ['cleanser', 'gentle', 'all skin types'],
        benefits: ['pH balanced', 'Non-stripping', 'Ceramide-rich', 'Gentle lather'],
        howToUse: 'Massage onto damp skin, lather, and rinse.',
        isNew: true, isBestseller: false, isFeatured: true, inStock: true, stockCount: 156,
        rating: 4.7, reviewCount: 218,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'silk-barrier-moisturizer' },
      update: {},
      create: {
        name: 'Silk Barrier Moisturizer',
        slug: 'silk-barrier-moisturizer',
        tagline: 'Restore. Protect. Glow.',
        description: 'Rich yet lightweight moisturizer with ceramides, squalane, and peptides.',
        price: 72,
        comparePrice: 90,
        volume: '50ml / 1.7 fl oz',
        categoryId: moisturizers.id,
        images: ['https://images.unsplash.com/photo-1574156863536-37fbc5e1cfef?w=800&q=80'],
        tags: ['moisturizer', 'barrier', 'ceramides', 'bestseller'],
        benefits: ['Strengthens skin barrier', 'Deep hydration', 'Reduces redness', 'Non-greasy'],
        howToUse: 'Apply to face and neck morning and evening after serum.',
        isNew: false, isBestseller: true, isFeatured: true, inStock: true, stockCount: 98,
        rating: 4.9, reviewCount: 486,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'solar-shield-spf-50' },
      update: {},
      create: {
        name: 'Solar Shield SPF 50+',
        slug: 'solar-shield-spf-50',
        tagline: 'Invisible protection, all day comfort',
        description: 'Lightweight, non-greasy SPF 50+ with blue light protection.',
        price: 45,
        volume: '50ml / 1.7 fl oz',
        categoryId: sunscreen.id,
        images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80'],
        tags: ['sunscreen', 'spf50', 'daily', 'blue light'],
        benefits: ['SPF 50+ UVA/UVB', 'Blue light protection', 'No white cast', 'Weightless'],
        howToUse: 'Apply generously as the last step of morning routine.',
        isNew: true, isBestseller: false, isFeatured: false, inStock: true, stockCount: 203,
        rating: 4.6, reviewCount: 193,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'retinol-renewal-night-cream' },
      update: {},
      create: {
        name: 'Retinol Renewal Night Cream',
        slug: 'retinol-renewal-night-cream',
        tagline: 'Wake up to younger-looking skin',
        description: 'Encapsulated retinol with bakuchiol and peptides for wrinkle reduction without irritation.',
        price: 95,
        volume: '50ml / 1.7 fl oz',
        categoryId: moisturizers.id,
        images: ['https://images.unsplash.com/photo-1567721913486-6585f069b3f4?w=800&q=80'],
        tags: ['retinol', 'anti-aging', 'night', 'bestseller'],
        benefits: ['Reduces fine lines', 'Firms skin', 'Improves texture', 'Gentle formula'],
        howToUse: 'Apply pea-sized amount to face and neck at night, 2-3x per week.',
        isNew: false, isBestseller: true, isFeatured: false, inStock: true, stockCount: 67,
        rating: 4.8, reviewCount: 267,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'luminous-eye-concentrate' },
      update: {},
      create: {
        name: 'Luminous Eye Concentrate',
        slug: 'luminous-eye-concentrate',
        tagline: 'Brighter eyes, instantly',
        description: 'Multi-action eye cream with caffeine, peptides, and vitamin K.',
        price: 58,
        volume: '15ml / 0.5 fl oz',
        categoryId: eyeCare.id,
        images: ['https://images.unsplash.com/photo-1567721913486-6585f069b3f4?w=800&q=80'],
        tags: ['eye cream', 'dark circles', 'peptides'],
        benefits: ['Reduces dark circles', 'Depuffs', 'Firms eye area', 'Hydrates'],
        howToUse: 'Gently pat around eye area morning and evening.',
        isNew: true, isBestseller: false, isFeatured: false, inStock: true, stockCount: 112,
        rating: 4.7, reviewCount: 154,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'kaolin-clay-detox-mask' },
      update: {},
      create: {
        name: 'Kaolin Clay Detox Mask',
        slug: 'kaolin-clay-detox-mask',
        tagline: 'Deep cleanse in 15 minutes',
        description: 'Purifying kaolin and bentonite clay mask with activated charcoal.',
        price: 42,
        volume: '75ml / 2.5 fl oz',
        categoryId: masks.id,
        images: ['https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&q=80'],
        tags: ['mask', 'clay', 'detox', 'pores'],
        benefits: ['Unclogs pores', 'Absorbs excess oil', 'Brightens complexion', 'Smooths texture'],
        howToUse: 'Apply 2-3 times weekly. Leave for 10-15 minutes, rinse.',
        isNew: false, isBestseller: false, isFeatured: false, inStock: true, stockCount: 23,
        rating: 4.5, reviewCount: 128,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'hyaluronic-acid-booster' },
      update: {},
      create: {
        name: 'Hyaluronic Acid Booster',
        slug: 'hyaluronic-acid-booster',
        tagline: '72-hour plumping hydration',
        description: 'Triple-weight hyaluronic acid serum for intense moisture at every skin layer.',
        price: 55,
        comparePrice: 68,
        volume: '30ml / 1 fl oz',
        categoryId: serums.id,
        images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'],
        tags: ['hyaluronic', 'hydration', 'plumping', 'bestseller'],
        benefits: ['72hr hydration', 'Plumps fine lines', 'Lightweight', 'All skin types'],
        howToUse: 'Apply to damp skin before moisturizer, morning and evening.',
        isNew: false, isBestseller: true, isFeatured: false, inStock: true, stockCount: 201,
        rating: 4.9, reviewCount: 521,
      },
    }),
  ])
  console.log(`✅ Created ${products.length} products`)

  // ── Blog posts ────────────────────────────────
  const blogs = await Promise.all([
    prisma.blogPost.upsert({
      where: { slug: 'science-behind-vitamin-c-serums' },
      update: {},
      create: {
        title: 'The Science Behind Vitamin C Serums',
        slug: 'science-behind-vitamin-c-serums',
        excerpt: 'Discover why Vitamin C is the gold standard in brightening skincare.',
        body: 'Vitamin C (ascorbic acid) is one of the most well-researched antioxidants in skincare...',
        coverImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
        category: 'Ingredient Deep Dive',
        author: 'Dr. Sophie Martin',
        readTime: 6,
        published: true,
        publishedAt: new Date('2024-02-20'),
      },
    }),
    prisma.blogPost.upsert({
      where: { slug: 'building-perfect-morning-routine' },
      update: {},
      create: {
        title: 'Building Your Perfect Morning Routine',
        slug: 'building-perfect-morning-routine',
        excerpt: 'From cleanser to SPF, we break down the exact order for maximum efficacy.',
        body: 'A consistent morning skincare routine is the cornerstone of healthy, radiant skin...',
        coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
        category: 'Routines',
        author: 'Emma Caldwell',
        readTime: 5,
        published: true,
        publishedAt: new Date('2024-02-14'),
      },
    }),
    prisma.blogPost.upsert({
      where: { slug: 'retinol-101-everything-need-to-know' },
      update: {},
      create: {
        title: 'Retinol 101: Everything You Need to Know',
        slug: 'retinol-101-everything-need-to-know',
        excerpt: 'The most powerful anti-aging ingredient, demystified.',
        body: 'Retinol is a derivative of vitamin A and one of the most studied ingredients in dermatology...',
        coverImage: 'https://images.unsplash.com/photo-1567721913486-6585f069b3f4?w=800&q=80',
        category: 'Ingredient Deep Dive',
        author: 'Dr. Sophie Martin',
        readTime: 8,
        published: true,
        publishedAt: new Date('2024-01-28'),
      },
    }),
  ])
  console.log(`✅ Created ${blogs.length} blog posts`)

  // ── Coupon codes ──────────────────────────────
  await Promise.all([
    prisma.coupon.upsert({
      where: { code: 'WELCOME15' },
      update: {},
      create: { code: 'WELCOME15', type: 'PERCENTAGE', value: 15, minOrderAmt: 0, maxUses: 1000, active: true },
    }),
    prisma.coupon.upsert({
      where: { code: 'GLOW20' },
      update: {},
      create: { code: 'GLOW20', type: 'PERCENTAGE', value: 20, minOrderAmt: 100, maxUses: 500, active: true },
    }),
    prisma.coupon.upsert({
      where: { code: 'FREESHIP' },
      update: {},
      create: { code: 'FREESHIP', type: 'FIXED', value: 9, minOrderAmt: 50, maxUses: 200, active: true },
    }),
  ])
  console.log('✅ Created coupon codes: WELCOME15, GLOW20, FREESHIP')

  // ── Sample address for customer ───────────────
  const address = await prisma.address.upsert({
    where: { id: 'sample-address-1' },
    update: {},
    create: {
      id: 'sample-address-1',
      userId: customer.id,
      firstName: 'Sophie',
      lastName: 'Martin',
      street: '123 Beauty Lane',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      phone: '+1 555 000 1234',
      isDefault: true,
    },
  })

  // ── Sample newsletter subscribers ────────────
  await Promise.all([
    prisma.newsletter.upsert({ where: { email: 'sarah@example.com' }, update: {}, create: { email: 'sarah@example.com', firstName: 'Sarah', active: true } }),
    prisma.newsletter.upsert({ where: { email: 'emma@example.com' }, update: {}, create: { email: 'emma@example.com', firstName: 'Emma', active: true } }),
    prisma.newsletter.upsert({ where: { email: 'olivia@example.com' }, update: {}, create: { email: 'olivia@example.com', firstName: 'Olivia', active: true } }),
  ])
  console.log('✅ Created newsletter subscribers')

  console.log('\n🎉 Database seeded successfully!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Admin login: admin@lumiere.com')
  console.log('  Password:    Admin@lumiere123')
  console.log('  Customer:    sophie@example.com')
  console.log('  Password:    User@lumiere123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
