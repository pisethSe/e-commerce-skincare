import { usePrefsStore, type Lang } from './store'

/**
 * Lightweight storefront i18n.
 * English is the source of truth; Khmer (km) mirrors every UI string.
 * Product/blog copy comes from the API and stays in its authored language.
 */

type Entry = { en: string; km: string }

export const dictionary = {
  // Navigation / shell
  'nav.products': { en: 'Our Products', km: 'ផលិតផលរបស់យើង' },
  'nav.journal': { en: 'Journal', km: 'ទស្សនាវដ្ដី' },
  'nav.about': { en: 'About Us', km: 'អំពីយើង' },
  'nav.checkout': { en: 'Checkout', km: 'ការទូទាត់' },
  'nav.login': { en: 'Login', km: 'ចូលគណនី' },
  'nav.logout': { en: 'Logout', km: 'ចាកចេញ' },
  'nav.signup': { en: 'Sign Up', km: 'ចុះឈ្មោះ' },
  'nav.account': { en: 'My Account', km: 'គណនីរបស់ខ្ញុំ' },
  'nav.hi': { en: 'HI, {name}', km: 'សួស្តី {name}' },
  'nav.openCart': { en: 'Open cart', km: 'បើកកន្ត្រក' },
  'nav.wishlist': { en: 'Wishlist', km: 'បញ្ជីចង់បាន' },
  'nav.openWishlist': { en: 'Open wishlist', km: 'បើកបញ្ជីចង់បាន' },
  'nav.search': { en: 'Search', km: 'ស្វែងរក' },
  'search.placeholder': {
    en: 'Search products, concerns, ingredients…',
    km: 'ស្វែងរកផលិតផល បញ្ហាស្បែក គ្រឿងផ្សំ…',
  },
  'search.hint': { en: 'Start typing to see products.', km: 'ចាប់ផ្តើមវាយដើម្បីមើលផលិតផល។' },
  'search.noResults': { en: 'No products match “{query}”.', km: 'គ្មានផលិតផលត្រូវនឹង “{query}” ទេ។' },
  'search.didYouMean': { en: 'Did you mean “{term}”?', km: 'តើអ្នកចង់មានន័យថា “{term}” មែនទេ?' },
  'search.viewAll': { en: 'See all results', km: 'មើលលទ្ធផលទាំងអស់' },
  'search.close': { en: 'Close search', km: 'បិទការស្វែងរក' },
  'nav.toggleMenu': { en: 'Toggle navigation', km: 'បើកម៉ឺនុយ' },
  'nav.logoutConfirmTitle': { en: 'LOGOUT', km: 'ចាកចេញ' },
  'nav.logoutConfirm': {
    en: 'Are you sure you want to log out, {name}? Your bag stays saved for next time.',
    km: 'តើអ្នកប្រាកដជាចង់ចាកចេញមែនទេ {name}? កន្ត្រករបស់អ្នកនឹងរក្សាទុកសម្រាប់ពេលក្រោយ។',
  },
  'nav.logoutConfirmPlain': {
    en: 'Are you sure you want to log out?',
    km: 'តើអ្នកប្រាកដជាចង់ចាកចេញមែនទេ?',
  },
  'nav.yesLogout': { en: 'Yes, log out', km: 'បាទ/ចាស ចាកចេញ' },
  'nav.language': { en: 'Language', km: 'ភាសា' },
  'nav.currency': { en: 'Currency', km: 'រូបិយប័ណ្ណ' },

  // Shared commerce
  'common.addToBag': { en: 'ADD TO BAG', km: 'ដាក់ក្នុងកន្ត្រក' },
  'common.shopNow': { en: 'SHOP NOW', km: 'ទិញឥឡូវនេះ' },
  'common.viewAll': { en: 'View All', km: 'មើលទាំងអស់' },
  'common.back': { en: 'Back', km: 'ត្រឡប់ក្រោយ' },
  'common.backHome': { en: 'Back Home', km: 'ត្រឡប់ទៅទំព័រដើម' },
  'common.continue': { en: 'Continue', km: 'បន្ត' },
  'common.free': { en: 'Free', km: 'ឥតគិតថ្លៃ' },
  'common.subtotal': { en: 'Subtotal', km: 'សរុបរង' },
  'common.shipping': { en: 'Shipping', km: 'ការដឹកជញ្ជូន' },
  'common.tax': { en: 'Tax (VAT 10%)', km: 'ពន្ធអាករ (VAT 10%)' },
  'common.total': { en: 'Total', km: 'សរុប' },
  'common.discount': { en: 'Discount', km: 'បញ្ចុះតម្លៃ' },
  'common.remove': { en: 'Remove', km: 'ដកចេញ' },
  'common.apply': { en: 'Apply', km: 'អនុវត្ត' },
  'common.checking': { en: 'Checking…', km: 'កំពុងពិនិត្យ…' },
  'common.couponCode': { en: 'Coupon code', km: 'កូដបញ្ចុះតម្លៃ' },
  'common.continueShopping': { en: 'Continue Shopping', km: 'បន្តទិញទំនិញ' },
  'common.startShopping': { en: 'Start Shopping', km: 'ចាប់ផ្តើមទិញទំនិញ' },
  'common.proceedCheckout': { en: 'Proceed to Checkout', km: 'បន្តទៅការទូទាត់' },
  'common.checkout': { en: 'Checkout', km: 'ការទូទាត់' },
  'common.freeShippingOver': {
    en: 'Free shipping on orders over $75',
    km: 'ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញលើសពី $75',
  },
  'common.freeShippingOverShort': { en: 'Over $75', km: 'លើសពី $75' },
  'common.away': { en: '{amount} away', km: 'នៅខ្វះ {amount}' },
  'common.taxesAtCheckout': {
    en: 'Taxes and shipping calculated at checkout',
    km: 'ពន្ធនិងការដឹកជញ្ជូនគណនានៅពេលទូទាត់',
  },
  'common.itemsCount': { en: '{count} items', km: '{count} មុខ' },
  'common.productsCount': { en: '{count} products', km: '{count} ផលិតផល' },
  'common.oneProduct': { en: '1 product', km: '១ ផលិតផល' },

  // Cart sidebar + page
  'cart.title': { en: 'Your Bag', km: 'កន្ត្រករបស់អ្នក' },
  'cart.empty': { en: 'Your bag is empty', km: 'កន្ត្រករបស់អ្នកទទេ' },
  'cart.emptyHint': { en: 'Add some luxurious treats', km: 'បន្ថែមផលិតផលថែទាំស្បែកដ៏ប្រណិត' },
  'cart.viewFullCart': { en: 'View full cart', km: 'មើលកន្ត្រកពេញលេញ' },
  'cart.myBag': { en: 'MY BAG', km: 'កន្ត្រករបស់ខ្ញុំ' },
  'cart.selectedRituals': { en: 'Selected Rituals', km: 'ផលិតផលដែលបានជ្រើសរើស' },
  'cart.summary': { en: 'Summary', km: 'សេចក្តីសង្ខេប' },
  'cart.appliedSave': {
    en: '{code} applied — you save {amount}',
    km: '{code} បានអនុវត្ត — អ្នកសន្សំ {amount}',
  },
  'cart.tryCode': { en: 'Try WELCOME15', km: 'សាកល្បង WELCOME15' },
  'cart.emptyDiscover': {
    en: 'Discover our luxurious skincare collection',
    km: 'ស្វែងរកបណ្តុំផលិតផលថែទាំស្បែកដ៏ប្រណិតរបស់យើង',
  },

  // Home
  'home.kicker': { en: 'BEAUTY CARE', km: 'ការថែទាំសម្ផស្ស' },
  'home.title1': { en: 'Your Best Skin', km: 'ស្បែកដ៏ល្អបំផុតរបស់អ្នក' },
  'home.title2': { en: 'Starts Here', km: 'ចាប់ផ្តើមនៅទីនេះ' },
  'home.sub': {
    en: "Science-backed formulas. Nature-inspired ingredients. Glow with skincare that's made to love and made to last.",
    km: 'រូបមន្តផ្អែកលើវិទ្យាសាស្ត្រ។ គ្រឿងផ្សំបំផុតពីធម្មជាតិ។ ភ្លឺថ្លាជាមួយការថែទាំស្បែកដែលអ្នកនឹងស្រលាញ់ និងប្រើបានយូរ។',
  },
  'home.allSkinType': { en: 'All Skin Type', km: 'គ្រប់ប្រភេទស្បែក' },
  'home.skinType': { en: 'Skin type', km: 'ប្រភេទស្បែក' },
  'home.smoothTexture': { en: 'Smooth Texture', km: 'វាយនភាពរលោង' },
  'home.texture': { en: 'Texture', km: 'វាយនភាព' },
  'home.provenResults': { en: 'Proven Results', km: 'លទ្ធផលបញ្ជាក់' },
  'home.committed': { en: 'Committed', km: 'ប្តេជ្ញាចិត្ត' },
  'home.philosophy': { en: 'OUR PHILOSOPHY', km: 'ទស្សនវិជ្ជារបស់យើង' },
  'home.philosophyBody': {
    en: 'Every product is formulated with plant-based ingredients that are gentle yet powerful, free from harmful chemicals.',
    km: 'ផលិតផលនីមួយៗត្រូវបានបង្កើតឡើងពីគ្រឿងផ្សំរុក្ខជាតិដែលទន់ភ្លន់ ប៉ុន្តែមានប្រសិទ្ធភាព និងគ្មានសារធាតុគីមីគ្រោះថ្នាក់។',
  },
  'home.ourProducts': { en: 'Our Products', km: 'ផលិតផលរបស់យើង' },
  'home.whyChooseUs': { en: 'WHY CHOOSE US?', km: 'ហេតុអ្វីជ្រើសរើសយើង?' },
  'home.difference': {
    en: 'The Difference is in the Details',
    km: 'ភាពខុសគ្នាគឺស្ថិតនៅក្នុងព័ត៌មានលម្អិត',
  },
  'home.ingredients': { en: 'INGREDIENTS', km: 'គ្រឿងផ្សំ' },
  'home.natureTitle': {
    en: "Powered by Nature's Best",
    km: 'ដំណើរការដោយធម្មជាតិដ៏ល្អបំផុត',
  },
  'home.ingredientsBody': {
    en: "We source ingredients from the earth's purest and most potent botanicals. From nourishing oils to antioxidant-rich herbs, our formulas are packed with the good stuff to give your skin the care it deserves.",
    km: 'យើងជ្រើសរើសគ្រឿងផ្សំពីរុក្ខជាតិដ៏បរិសុទ្ធ និងមានប្រសិទ្ធភាពបំផុតនៅលើផែនដី។ ចាប់ពីប្រេងចិញ្ចឹមស្បែក ដល់ឱសថសម្បូរសារធាតុប្រឆាំងអុកស៊ីតកម្ម រូបមន្តរបស់យើងពោរពេញទៅដោយសារធាតុល្អៗ ដើម្បីផ្តល់ការថែទាំដែលស្បែកអ្នកសមនឹងទទួលបាន។',
  },
  'home.noFillers': { en: 'No fillers.', km: 'គ្មានសារធាតុបំពេញបន្ថែម។' },
  'home.noChemicals': { en: 'No chemicals.', km: 'គ្មានសារធាតុគីមី។' },
  'home.naturesFinest': { en: "Just nature's finest.", km: 'តែធម្មជាតិដ៏ល្អបំផុត។' },
  'home.testimonialsTitle': {
    en: 'What Our Customers Are Saying',
    km: 'អ្វីដែលអតិថិជនរបស់យើងនិយាយ',
  },
  'home.getStarted': { en: 'GET STARTED', km: 'ចាប់ផ្តើម' },
  'home.communityTitle': { en: 'Join the Calesta Community', km: 'ចូលរួមសហគមន៍ Calesta' },
  'home.communityBody': {
    en: 'Sign up for exclusive offers, skincare tips, and new product launches directly in your inbox.',
    km: 'ចុះឈ្មោះដើម្បីទទួលបានការផ្តល់ជូនពិសេស គន្លឹះថែទាំស្បែក និងផលិតផលថ្មីៗផ្ទាល់ក្នុងប្រអប់សាររបស់អ្នក។',
  },
  'home.enterEmail': { en: 'Enter email...', km: 'បញ្ចូលអ៊ីមែល...' },
  'home.subscribe': { en: 'SUBSCRIBE', km: 'ជាវព័ត៌មាន' },
  'home.ourCommunity': { en: 'Our Community', km: 'សហគមន៍របស់យើង' },

  // Features
  'feature.cleanBeauty': { en: 'Clean Beauty', km: 'សម្ផស្សស្អាត' },
  'feature.cleanBeautyDesc': {
    en: 'All our products are cruelty-free, vegan, and free from parabens, sulfates, and synthetic fragrances.',
    km: 'ផលិតផលទាំងអស់របស់យើងមិនធ្វើតេស្តលើសត្វ ជាវីហ្សែន និងគ្មានប៉ារ៉ាបេន ស៊ុលហ្វាត និងក្លិនស្ថិតិ។',
  },
  'feature.dermTested': { en: 'Dermatologist Tested', km: 'បានធ្វើតេស្តដោយគ្រូពេទ្យសើស្បែក' },
  'feature.dermTestedDesc': {
    en: 'Our formulas are created and tested for all skin types, including sensitive skin.',
    km: 'រូបមន្តរបស់យើងត្រូវបានបង្កើត និងធ្វើតេស្តសម្រាប់គ្រប់ប្រភេទស្បែក រួមទាំងស្បែករសើប។',
  },
  'feature.sustainable': { en: 'Sustainably Sourced', km: 'គ្រឿងផ្សំប្រកបដោយចីរភាព' },
  'feature.sustainableDesc': {
    en: 'We prioritize ethically sourced ingredients and eco-conscious packaging in every collection.',
    km: 'យើងផ្តល់អាទិភាពដល់គ្រឿងផ្សំដែលបានមកដោយសីលធម៌ និងការវេចខ្ចប់ដែលគិតគូរពីបរិស្ថានក្នុងគ្រប់បណ្តុំ។',
  },

  // Home sections
  'featured.kicker': { en: 'Our Bestsellers', km: 'លក់ដាច់បំផុតរបស់យើង' },
  'featured.title1': { en: 'Loved by thousands,', km: 'ស្រលាញ់ដោយមនុស្សរាប់ពាន់' },
  'featured.title2': { en: 'formulated for you', km: 'បង្កើតឡើងសម្រាប់អ្នក' },
  'categories.kicker': { en: 'Shop by Concern', km: 'ទិញតាមបញ្ហាស្បែក' },
  'categories.title1': { en: 'Find your', km: 'ស្វែងរក' },
  'categories.title2': { en: 'perfect ritual', km: 'របៀបថែទាំដ៏ល្អឥតខ្ចោះ' },
  'categories.shopNow': { en: 'Shop now', km: 'ទិញឥឡូវនេះ' },
  'brand.kicker': { en: 'Our Philosophy', km: 'ទស្សនវិជ្ជារបស់យើង' },
  'brand.title1': { en: 'Skin care is', km: 'ការថែទាំស្បែក' },
  'brand.title2': { en: 'self care', km: 'គឺការថែទាំខ្លួនឯង' },
  'brand.body1': {
    en: 'Founded in 2018, Calesta was born from a simple belief: your skin deserves the very best — without compromise. We blend cutting-edge dermatology with time-honored botanical wisdom to create formulas that truly transform.',
    km: 'បង្កើតឡើងក្នុងឆ្នាំ 2018 Calesta កើតចេញពីជំនឿសាមញ្ញមួយ៖ ស្បែករបស់អ្នកសមនឹងទទួលបានអ្វីដែលល្អបំផុត — ដោយគ្មានការសម្របសម្រួល។ យើងរួមបញ្ចូលវិទ្យាសាស្ត្រសើស្បែកទំនើប ជាមួយប្រាជ្ញារុក្ខជាតិបុរាណ ដើម្បីបង្កើតរូបមន្តដែលផ្លាស់ប្តូរពិតប្រាកដ។',
  },
  'brand.body2': {
    en: 'Every ingredient is hand-sourced, every formula clinically tested, and every product made with the utmost care for you and the planet.',
    km: 'គ្រឿងផ្សំនីមួយៗត្រូវបានជ្រើសរើសដោយផ្ទាល់ រូបមន្តនីមួយៗបានធ្វើតេស្តគ្លីនិក ហើយផលិតផលនីមួយៗផលិតដោយការយកចិត្តទុកដាក់បំផុតចំពោះអ្នក និងភពផែនដី។',
  },
  'brand.stat': {
    en: 'Report visibly improved skin within 4 weeks',
    km: 'រាយការណ៍ថាស្បែកប្រសើរឡើងយ៉ាងច្បាស់ក្នុងរយៈពេល 4 សប្តាហ៍',
  },
  'brand.cleanConscious': { en: 'Clean & Conscious', km: 'ស្អាត និងយល់ដឹង' },
  'brand.cleanConsciousDesc': {
    en: 'No harmful fillers. 100% clean ingredients that are kind to your skin and the earth.',
    km: 'គ្មានសារធាតុបំពេញបន្ថែមគ្រោះថ្នាក់។ គ្រឿងផ្សំស្អាត 100% ដែលទន់ភ្លន់ចំពោះស្បែក និងផែនដី។',
  },
  'brand.scienceBacked': { en: 'Science-Backed', km: 'ផ្អែកលើវិទ្យាសាស្ត្រ' },
  'brand.scienceBackedDesc': {
    en: 'Every formula is developed with dermatologists and tested in independent labs.',
    km: 'រូបមន្តនីមួយៗត្រូវបានបង្កើតជាមួយគ្រូពេទ្យសើស្បែក និងធ្វើតេស្តនៅមន្ទីរពិសោធន៍ឯករាជ្យ។',
  },
  'brand.ethicallyMade': { en: 'Ethically Made', km: 'ផលិតដោយសីលធម៌' },
  'brand.ethicallyMadeDesc': {
    en: 'Cruelty-free, vegan, and packaged in fully recyclable or biodegradable materials.',
    km: 'មិនធ្វើតេស្តលើសត្វ ជាវីហ្សែន និងវេចខ្ចប់ដោយសម្ភារៈដែលអាចកែច្នៃឡើងវិញ ឬរលាយដោយធម្មជាតិ។',
  },
  'brand.ourStory': { en: 'Our Story', km: 'រឿងរបស់យើង' },
  'newsletter.kicker': { en: 'Join the Ritual', km: 'ចូលរួមពិធីថែទាំ' },
  'newsletter.title1': { en: 'Get 15% off your', km: 'ទទួលបានបញ្ចុះតម្លៃ 15% សម្រាប់' },
  'newsletter.title2': { en: 'first order', km: 'ការបញ្ជាទិញដំបូង' },
  'newsletter.body': {
    en: 'Subscribe for early access to new launches, expert skincare tips, and exclusive member offers.',
    km: 'ជាវព័ត៌មានដើម្បីទទួលបានការចូលមើលផលិតផលថ្មីមុនគេ គន្លឹះថែទាំស្បែកពីអ្នកជំនាញ និងការផ្តល់ជូនពិសេសសម្រាប់សមាជិក។',
  },
  'newsletter.welcome': {
    en: 'Welcome! Check your inbox for your discount code.',
    km: 'សូមស្វាគមន៍! ពិនិត្យប្រអប់សាររបស់អ្នកសម្រាប់កូដបញ្ចុះតម្លៃ។',
  },
  'journal.kicker': { en: 'The Calesta Journal', km: 'ទស្សនាវដ្ដី Calesta' },
  'journal.title1': { en: 'Skincare wisdom,', km: 'ប្រាជ្ញាថែទាំស្បែក' },
  'journal.title2': { en: 'curated for you', km: 'ជ្រើសរើសសម្រាប់អ្នក' },
  'journal.allArticles': { en: 'All Articles', km: 'អត្ថបទទាំងអស់' },
  'testimonials.kicker': { en: 'Real Results', km: 'លទ្ធផលពិត' },
  'testimonials.title1': { en: 'Skin transformations', km: 'ការផ្លាស់ប្តូរស្បែក' },
  'testimonials.title2': { en: 'you can see', km: 'ដែលអ្នកអាចមើលឃើញ' },
  'instagram.title': { en: 'Share your glow', km: 'ចែករំលែកភាពភ្លឺថ្លារបស់អ្នក' },
  'instagram.sub': { en: 'Tag us to be featured', km: 'ដាក់ស្លាកយើងដើម្បីបង្ហាញ' },
  'marquee.cleanBeauty': { en: 'Clean Beauty', km: 'សម្ផស្សស្អាត' },
  'marquee.dermTested': { en: 'Dermatologist Tested', km: 'ធ្វើតេស្តដោយគ្រូពេទ្យសើស្បែក' },
  'marquee.crueltyFree': { en: 'Cruelty Free', km: 'មិនធ្វើតេស្តលើសត្វ' },
  'marquee.vegan': { en: 'Vegan Formulas', km: 'រូបមន្តវីហ្សែន' },
  'marquee.sustainable': { en: 'Sustainable Packaging', km: 'ការវេចខ្ចប់ប្រកបដោយចីរភាព' },
  'marquee.science': { en: 'Science-Backed', km: 'ផ្អែកលើវិទ្យាសាស្ត្រ' },
  'marquee.noParabens': { en: 'No Parabens', km: 'គ្មានប៉ារ៉ាបេន' },
  'marquee.noSulfates': { en: 'No Sulfates', km: 'គ្មានស៊ុលហ្វាត' },

  // Shop
  'shop.kicker': { en: 'OUR PRODUCTS', km: 'ផលិតផលរបស់យើង' },
  'shop.title': {
    en: 'Find the ritual that fits your skin.',
    km: 'ស្វែងរករបៀបថែទាំដែលសាកសមនឹងស្បែករបស់អ្នក។',
  },
  'shop.sub': {
    en: 'Explore our cleanser, serum, moisturizer, and targeted treatment lineup crafted to match the Calesta visual experience.',
    km: 'ស្វែងយល់ពីផលិតផលសម្អាត សេរ៉ូម ម៉ូញ៉ូរីស និងការព្យាបាលពិសេសដែលរចនាឡើងសម្រាប់បទពិសោធន៍ Calesta។',
  },
  'shop.allProducts': { en: 'All Products', km: 'ផលិតផលទាំងអស់' },
  'shop.sortNewest': { en: 'Newest', km: 'ថ្មីបំផុត' },
  'shop.sortBestsellers': { en: 'Bestsellers', km: 'លក់ដាច់បំផុត' },
  'shop.sortPriceAsc': { en: 'Price: Low to High', km: 'តម្លៃ៖ ទាបទៅខ្ពស់' },
  'shop.sortPriceDesc': { en: 'Price: High to Low', km: 'តម្លៃ៖ ខ្ពស់ទៅទាប' },
  'shop.sortRelevance': { en: 'Best match', km: 'ត្រូវនឹងការស្វែងរក' },
  'shop.sortRating': { en: 'Top rated', km: 'វាយតម្លៃខ្ពស់' },
  'shop.searchPlaceholder': {
    en: 'Search products, concerns, ingredients…',
    km: 'ស្វែងរកផលិតផល បញ្ហាស្បែក គ្រឿងផ្សំ…',
  },
  'shop.searchLabel': { en: 'Search products', km: 'ស្វែងរកផលិតផល' },
  'shop.clearSearch': { en: 'Clear search', km: 'សម្អាតការស្វែងរក' },
  'shop.resultsFor': { en: 'Results for “{query}”', km: 'លទ្ធផលសម្រាប់ “{query}”' },
  'shop.filters': { en: 'Filters', km: 'តម្រង' },
  'shop.clearFilters': { en: 'Clear all', km: 'សម្អាតទាំងអស់' },
  'shop.price': { en: 'Price', km: 'តម្លៃ' },
  'shop.priceUnder': { en: 'Under {amount}', km: 'ក្រោម {amount}' },
  'shop.priceBetween': { en: '{min} – {max}', km: '{min} – {max}' },
  'shop.priceOver': { en: '{amount} +', km: '{amount} +' },
  'shop.rating': { en: 'Rating', km: 'ការវាយតម្លៃ' },
  'shop.rating4': { en: '4 stars & up', km: '៤ ផ្កាយឡើង' },
  'shop.rating3': { en: '3 stars & up', km: '៣ ផ្កាយឡើង' },
  'shop.noResults': { en: 'No products found', km: 'រកមិនឃើញផលិតផល' },
  'shop.noResultsHint': {
    en: 'Try a different spelling, a broader term, or remove a filter.',
    km: 'សូមព្យាយាមសរសេរខុសគ្នា ប្រើពាក្យទូលំទូលាយជាង ឬដកតម្រងចេញ។',
  },
  'shop.didYouMean': { en: 'Did you mean “{term}”?', km: 'តើអ្នកចង់មានន័យថា “{term}” មែនទេ?' },
  'shop.loadMore': { en: 'Load more products', km: 'មើលផលិតផលបន្ថែម' },
  'shop.searching': { en: 'Searching…', km: 'កំពុងស្វែងរក…' },
  'shop.searchError': {
    en: 'Search is unavailable right now. Please try again.',
    km: 'ការស្វែងរកមិនអាចប្រើបានទេឥឡូវនេះ។ សូមព្យាយាមម្តងទៀត។',
  },

  // Back in stock
  'product.soldOut': { en: 'Sold out', km: 'អស់ស្តុក' },
  'product.outOfStockHint': {
    en: 'This ritual is currently sold out. Leave your email and we will let you know the moment it returns.',
    km: 'ផលិតផលនេះអស់ស្តុកបណ្តោះអាសន្ន។ ទុកអ៊ីមែលរបស់អ្នក ហើយយើងនឹងជូនដំណឹងភ្លាមៗពេលមានស្តុកវិញ។',
  },
  'product.notifyTitle': { en: 'Email me when it is back', km: 'ផ្ញើអ៊ីមែលមកខ្ញុំពេលមានស្តុកវិញ' },
  'product.notifyPlaceholder': { en: 'Your email', km: 'អ៊ីមែលរបស់អ្នក' },
  'product.notifyButton': { en: 'Notify me', km: 'ជូនដំណឹងខ្ញុំ' },
  'product.notifying': { en: 'Sending…', km: 'កំពុងផ្ញើ…' },
  'product.notifySuccess': {
    en: "You're on the list — we'll email you the moment it is back.",
    km: 'អ្នកបានចុះក្នុងបញ្ជី — យើងនឹងផ្ញើអ៊ីមែលភ្លាមៗពេលមានស្តុកវិញ។',
  },
  'product.notifyError': {
    en: 'Could not save your request. Please try again.',
    km: 'មិនអាចរក្សាទុកសំណើរបស់អ្នកបានទេ។ សូមព្យាយាមម្តងទៀត។',
  },
  'product.addedToBag': { en: 'Added to bag', km: 'បានដាក់ក្នុងកន្ត្រក' },

  // Product detail
  'product.notFound': { en: 'Product not found', km: 'រកមិនឃើញផលិតផល' },
  'product.backToShop': { en: 'Back to Shop', km: 'ត្រឡប់ទៅហាង' },
  'product.saved': { en: 'SAVED', km: 'បានរក្សាទុក' },
  'product.save': { en: 'SAVE', km: 'រក្សាទុក' },
  'product.share': { en: 'SHARE', km: 'ចែករំលែក' },
  'product.ingredients': { en: 'Ingredients', km: 'គ្រឿងផ្សំ' },
  'product.howToUse': { en: 'How to use', km: 'របៀបប្រើប្រាស់' },
  'product.texture': { en: 'Texture:', km: 'វាយនភាព៖' },
  'product.idealFor': { en: 'Ideal for:', km: 'សមស្របសម្រាប់៖' },
  'product.keyBenefits': { en: 'Key benefits:', km: 'អត្ថប្រយោជន៍សំខាន់៖' },
  'product.textureValue': { en: 'Silky, fast-absorbing, refined', km: 'រលោង ជ្រាបលឿន ឆ្មប' },
  'product.idealValue': {
    en: 'Dull, dry, uneven, or stressed skin',
    km: 'ស្បែកស្រអាប់ ស្ងួត មិនស្មើគ្នា ឬតានតឹង',
  },
  'product.benefitsFallback': {
    en: 'Hydration, radiance, and skin barrier support',
    km: 'ផ្តល់សំណើម ភាពភ្លឺថ្លា និងការពារស្រទាប់ស្បែក',
  },
  'product.careLine': { en: '{category} Care, Visible Results', km: 'ការថែទាំ{category} លទ្ធផលជាក់ស្តែង' },
  'product.howToUseFallback': {
    en: 'Apply after cleansing and before moisturizing. Pat gently into skin.',
    km: 'លាបបន្ទាប់ពីសម្អាត និងមុនពេលលាបម៉ូញ៉ូរីស។ ត្រូវវាលស្រាលៗលើស្បែក។',
  },
  'product.careNote': {
    en: 'Because your skin deserves concentrated, effective care every day.',
    km: 'ព្រោះស្បែករបស់អ្នកសមនឹងទទួលបានការថែទាំដ៏មានប្រសិទ្ធភាពជារៀងរាល់ថ្ងៃ។',
  },
  'product.moreToExplore': { en: 'More to Explore', km: 'ស្វែងយល់បន្ថែម' },

  // Wishlist
  'wishlist.title': { en: 'Wishlist', km: 'បញ្ជីចង់បាន' },
  'wishlist.sub': {
    en: 'The rituals you have saved for later. They stay here on this device until you remove them.',
    km: 'ផលិតផលដែលអ្នកបានរក្សាទុកសម្រាប់ពេលក្រោយ។ វានឹងនៅទីនេះលើឧបករណ៍នេះរហូតដល់អ្នកដកវាចេញ។',
  },
  'wishlist.saved': { en: '{count} saved', km: 'បានរក្សាទុក {count}' },
  'wishlist.empty': { en: 'Nothing saved yet', km: 'មិនទាន់មានអ្វីរក្សាទុក' },
  'wishlist.emptyHint': {
    en: 'Tap the heart on any product to keep it here for later.',
    km: 'ចុចសញ្ញាបេះដូងលើផលិតផលណាមួយ ដើម្បីរក្សាទុកវាទុកនៅទីនេះ។',
  },
  'wishlist.shop': { en: 'Explore products', km: 'រកមើលផលិតផល' },
  'wishlist.remove': { en: 'Remove from wishlist', km: 'ដកចេញពីបញ្ជីចង់បាន' },
  'wishlist.soldOut': { en: 'Sold out', km: 'អស់ស្តុក' },

  // Reviews
  'reviews.title': { en: 'Reviews', km: 'មតិយោបល់' },
  'reviews.average': { en: '{average} out of 5', km: '{average} ក្នុង 5' },
  'reviews.basedOn': {
    en: 'Based on {count} review',
    km: 'ផ្អែកលើមតិ {count}',
  },
  'reviews.basedOnPlural': {
    en: 'Based on {count} reviews',
    km: 'ផ្អែកលើមតិ {count}',
  },
  'reviews.none': {
    en: 'No reviews yet — be the first to share your experience.',
    km: 'មិនទាន់មានមតិ — ចែករំលែកបទពិសោធន៍របស់អ្នកមុនគេ។',
  },
  'reviews.write': { en: 'Write a review', km: 'សរសេរមតិ' },
  'reviews.signInPrompt': {
    en: 'Sign in to share how this product worked for your skin.',
    km: 'ចូលគណនីដើម្បីចែករំលែកពីប្រសិទ្ធភាពផលិតផលនេះលើស្បែករបស់អ្នក។',
  },
  'reviews.signIn': { en: 'Sign in to write a review', km: 'ចូលគណនីដើម្បីសរសេរមតិ' },
  'reviews.rating': { en: 'Your rating', km: 'ការវាយតម្លៃរបស់អ្នក' },
  'reviews.ratingRequired': {
    en: 'Choose a rating from 1 to 5 stars.',
    km: 'សូមជ្រើសរើសផ្កាយពី ១ ដល់ ៥។',
  },
  'reviews.titleLabel': { en: 'Review title (optional)', km: 'ចំណងជើងមតិ (ស្រេចចិត្ត)' },
  'reviews.titlePlaceholder': { en: 'Sum it up in a few words', km: 'សង្ខេបក្នុងពាក្យខ្លីៗ' },
  'reviews.bodyLabel': { en: 'Your review', km: 'មតិរបស់អ្នក' },
  'reviews.bodyPlaceholder': {
    en: 'What did you notice? Texture, scent, results…',
    km: 'តើអ្នកកត់សម្គាល់អ្វី? វាយនភាព ក្លិន លទ្ធផល…',
  },
  'reviews.bodyTooShort': {
    en: 'Please write at least 10 characters.',
    km: 'សូមសរសេរយ៉ាងតិច ១០ តួអក្សរ។',
  },
  'reviews.submit': { en: 'Submit review', km: 'ដាក់ស្នើមតិ' },
  'reviews.submitting': { en: 'Submitting…', km: 'កំពុងដាក់ស្នើ…' },
  'reviews.pending': {
    en: 'Thank you — your review is awaiting moderation and will appear shortly.',
    km: 'អរគុណ — មតិរបស់អ្នកកំពុងរង់ចាំការត្រួតពិនិត្យ ហើយនឹងបង្ហាញក្នុងពេលឆាប់ៗ។',
  },
  'reviews.pendingShort': { en: 'Awaiting approval', km: 'រង់ចាំការអនុម័ត' },
  'reviews.published': { en: 'Published', km: 'បានផ្សាយ' },
  'reviews.yourReview': { en: 'Your review', km: 'មតិរបស់អ្នក' },
  'reviews.verified': { en: 'Verified purchase', km: 'ការទិញដែលបានផ្ទៀងផ្ទាត់' },
  'reviews.sortNewest': { en: 'Newest', km: 'ថ្មីបំផុត' },
  'reviews.sortHighest': { en: 'Highest rated', km: 'វាយតម្លៃខ្ពស់បំផុត' },
  'reviews.sortLowest': { en: 'Lowest rated', km: 'វាយតម្លៃទាបបំផុត' },
  'reviews.loadMore': { en: 'Load more reviews', km: 'មើលមតិបន្ថែម' },
  'reviews.loading': { en: 'Loading reviews…', km: 'កំពុងផ្ទុកមតិ…' },
  'reviews.error': { en: 'Could not load reviews.', km: 'មិនអាចផ្ទុកមតិបានទេ។' },
  'reviews.submitError': {
    en: 'Could not submit your review. Please try again.',
    km: 'មិនអាចដាក់ស្នើមតិរបស់អ្នកបានទេ។ សូមព្យាយាមម្តងទៀត។',
  },
  'reviews.moderationNote': {
    en: 'Reviews are moderated before publishing. Verified buyers are marked.',
    km: 'មតិត្រូវបានត្រួតពិនិត្យមុនពេលផ្សាយ។ អ្នកទិញដែលបានផ្ទៀងផ្ទាត់នឹងមានសញ្ញាសម្គាល់។',
  },
  'reviews.starsLabel': { en: '{count} out of 5 stars', km: '{count} ក្នុង 5 ផ្កាយ' },

  // Checkout
  'checkout.stepInfo': { en: 'info', km: 'ព័ត៌មាន' },
  'checkout.stepShipping': { en: 'shipping', km: 'ការដឹកជញ្ជូន' },
  'checkout.stepPayment': { en: 'payment', km: 'ការទូទាត់' },
  'checkout.contactInfo': { en: 'Contact Information', km: 'ព័ត៌មានទំនាក់ទំនង' },
  'checkout.firstName': { en: 'First Name', km: 'នាមខ្លួន' },
  'checkout.lastName': { en: 'Last Name', km: 'នាមត្រកូល' },
  'checkout.email': { en: 'Email', km: 'អ៊ីមែល' },
  'checkout.phone': { en: 'Phone', km: 'លេខទូរស័ព្ទ' },
  'checkout.continueShipping': { en: 'Continue to Shipping', km: 'បន្តទៅការដឹកជញ្ជូន' },
  'checkout.shippingAddress': { en: 'Shipping Address', km: 'អាសយដ្ឋានដឹកជញ្ជូន' },
  'checkout.livingNow': { en: 'Where do you live?', km: 'តើអ្នករស់នៅឯណា?' },
  'checkout.phnomPenh': { en: 'Phnom Penh', km: 'ភ្នំពេញ' },
  'checkout.phnomPenhDesc': { en: 'In the capital', km: 'នៅរាជធានី' },
  'checkout.province': { en: 'Province', km: 'ខេត្ត' },
  'checkout.provinceDesc': { en: 'Outside Phnom Penh', km: 'ក្រៅភ្នំពេញ' },
  'checkout.area': { en: 'Khan / Province', km: 'ខណ្ឌ / ខេត្ត' },
  'checkout.khan': { en: 'Khan / District', km: 'ខណ្ឌ' },
  'checkout.chooseArea': { en: 'Choose location…', km: 'ជ្រើសរើសទីតាំង…' },
  'checkout.chooseKhan': { en: 'Choose khan…', km: 'ជ្រើសរើសខណ្ឌ…' },
  'checkout.chooseProvince': { en: 'Choose province…', km: 'ជ្រើសរើសខេត្ត…' },
  'checkout.houseStreet': { en: 'House number & street', km: 'លេខផ្ទះ និងផ្លូវ' },
  'checkout.houseStreetPlaceholder': { en: 'House 12, Street 215', km: 'ផ្ទះលេខ 12 ផ្លូវ 215' },
  'checkout.cambodia': { en: 'Cambodia', km: 'កម្ពុជា' },
  'checkout.shipCambodiaOnly': {
    en: 'We ship within Cambodia only',
    km: 'យើងដឹកជញ្ជូនតែក្នុងប្រទេសកម្ពុជាប៉ុណ្ណោះ',
  },
  'checkout.shippingMethod': { en: 'Shipping Method', km: 'វិធីដឹកជញ្ជូន' },
  'checkout.standardDelivery': { en: 'Standard Delivery', km: 'ការដឹកជញ្ជូនស្តង់ដារ' },
  'checkout.standardDeliveryDesc': {
    en: 'Nationwide across Cambodia · 2–5 business days',
    km: 'ទូទាំងប្រទេសកម្ពុជា · 2–5 ថ្ងៃធ្វើការ',
  },
  'checkout.continuePayment': { en: 'Continue to Payment', km: 'បន្តទៅការទូទាត់' },
  'checkout.payment': { en: 'Payment', km: 'ការទូទាត់' },
  'checkout.cod': { en: 'Cash on delivery', km: 'បង់ប្រាក់ពេលដឹកជញ្ជូន' },
  'checkout.codDesc': { en: 'Pay the driver when it arrives', km: 'បង់ប្រាក់ឱ្យអ្នកដឹកជញ្ជូនពេលទទួលទំនិញ' },
  'checkout.codNote': {
    en: 'Keep the exact amount ready. Our delivery team will call you before arriving.',
    km: 'សូមត្រៀមប្រាក់ឱ្យគ្រប់ចំនួន។ ក្រុមដឹកជញ្ជូននឹងទូរស័ព្ទមកអ្នកមុនពេលមកដល់។',
  },
  'checkout.card': { en: 'Credit / Debit Card', km: 'កាតឥណទាន / ឥណពន្ធ' },
  'checkout.cardDesc': { en: 'Visa, Mastercard', km: 'Visa, Mastercard' },
  'checkout.aba': { en: 'ABA PayWay', km: 'ABA PayWay' },
  'checkout.abaDesc': { en: 'Pay via ABA Mobile or cards', km: 'ទូទាត់តាម ABA Mobile ឬកាត' },
  'checkout.bakong': { en: 'Bakong (KHQR)', km: 'បាកុង (KHQR)' },
  'checkout.bakongDesc': {
    en: 'Scan with any Cambodian bank app',
    km: 'ស្កេនដោយកម្មវិធីធនាគារកម្ពុជាណាមួយ',
  },
  'checkout.cardNumber': { en: 'Card Number', km: 'លេខកាត' },
  'checkout.expiry': { en: 'Expiry Date', km: 'ថ្ងៃផុតកំណត់' },
  'checkout.cvc': { en: 'CVC', km: 'CVC' },
  'checkout.nameOnCard': { en: 'Name on Card', km: 'ឈ្មោះលើកាត' },
  'checkout.abaRedirect': {
    en: "You'll be redirected to ABA PayWay to complete the payment securely.",
    km: 'អ្នកនឹងត្រូវបញ្ជូនទៅ ABA PayWay ដើម្បីបញ្ចប់ការទូទាត់ដោយសុវត្ថិភាព។',
  },
  'checkout.bakongNote': {
    en: 'A KHQR code will be shown after you confirm — scan it with any Cambodian bank app.',
    km: 'កូដ KHQR នឹងបង្ហាញបន្ទាប់ពីអ្នកបញ្ជាក់ — ស្កេនដោយកម្មវិធីធនាគារកម្ពុជាណាមួយ។',
  },
  'checkout.demoNote': {
    en: 'Demo checkout — no payment is charged. Card processing is Stripe-ready; ABA PayWay and Bakong are wired for merchant credentials.',
    km: 'ការទូទាត់សាកល្បង — គ្មានការគិតថ្លៃទេ។ ការទូទាត់កាតត្រៀមជាមួយ Stripe រួចហើយ។ ABA PayWay និងបាកុងភ្ជាប់រួចសម្រាប់ព័ត៌មានអាជីវករ។',
  },
  'checkout.placeOrder': { en: 'Place Order · {amount}', km: 'បញ្ជាទិញ · {amount}' },
  'checkout.placing': { en: 'Placing order…', km: 'កំពុងបញ្ជាទិញ…' },
  'checkout.secure': {
    en: 'Your payment information is encrypted and secure',
    km: 'ព័ត៌មានទូទាត់របស់អ្នកត្រូវបានអ៊ិនគ្រីប និងមានសុវត្ថិភាព',
  },
  'checkout.orderSummary': { en: 'Order Summary', km: 'សេចក្តីសង្ខេបការបញ្ជាទិញ' },
  'checkout.shippingStandard': {
    en: 'Shipping (Standard)',
    km: 'ការដឹកជញ្ជូន (ស្តង់ដារ)',
  },
  'checkout.haveAccount': {
    en: 'Have an account? Sign in to check out faster.',
    km: 'មានគណនីរួចហើយ? ចូលគណនីដើម្បីទូទាត់លឿនជាងមុន។',
  },
  'checkout.signIn': { en: 'Sign in', km: 'ចូលគណនី' },
  'checkout.nothing': { en: 'Nothing to check out', km: 'គ្មានអ្វីត្រូវទូទាត់' },
  'checkout.nothingHint': {
    en: 'Your bag is empty — add a ritual first',
    km: 'កន្ត្រករបស់អ្នកទទេ — សូមបន្ថែមផលិតផលជាមុនសិន',
  },
  'checkout.confirmTitle': { en: 'CONFIRM ORDER', km: 'បញ្ជាក់ការបញ្ជាទិញ' },
  'checkout.confirmMessage': {
    en: 'Place your order for {amount}? Your items will be reserved and a confirmation email sent to {email}.',
    km: 'បញ្ជាទិញសម្រាប់ {amount}? ទំនិញរបស់អ្នកនឹងត្រូវបានកក់ទុក ហើយអ៊ីមែលបញ្ជាក់នឹងផ្ញើទៅ {email}។',
  },
  'checkout.yesPlace': { en: 'Yes, place order', km: 'បាទ/ចាស បញ្ជាទិញ' },
  'checkout.yourInbox': { en: 'your inbox', km: 'ប្រអប់សាររបស់អ្នក' },
  'checkout.payLater': { en: 'Pay later — back home', km: 'ទូទាត់ពេលក្រោយ — ត្រឡប់ទៅទំព័រដើម' },
  'checkout.verifyPayment': { en: "I've paid — verify payment", km: 'ខ្ញុំបានបង់ប្រាក់ — ផ្ទៀងផ្ទាត់ការទូទាត់' },
  'checkout.checkingPayment': { en: 'Checking payment…', km: 'កំពុងពិនិត្យការទូទាត់…' },
  'checkout.bakongDemo': {
    en: "Demo mode — Bakong auto-verification activates when the store's Bakong account is configured.",
    km: 'របៀបសាកល្បង — ការផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ Bakong នឹងដំណើរការនៅពេលគណនី Bakong របស់ហាងត្រូវបានកំណត់។',
  },
  'checkout.errName': { en: 'Please enter your first and last name.', km: 'សូមបញ្ចូលនាមខ្លួន និងនាមត្រកូលរបស់អ្នក។' },
  'checkout.errEmail': { en: 'Please enter a valid email address.', km: 'សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ។' },
  'checkout.errStreet': { en: 'Please enter your house number and street.', km: 'សូមបញ្ចូលលេខផ្ទះ និងផ្លូវរបស់អ្នក។' },
  'checkout.errLocation': { en: 'Choose Phnom Penh or a province.', km: 'សូមជ្រើសរើសភ្នំពេញ ឬខេត្ត។' },
  'checkout.errArea': { en: 'Choose your khan or province.', km: 'សូមជ្រើសរើសខណ្ឌ ឬខេត្តរបស់អ្នក។' },
  'checkout.errKhan': { en: 'Choose a Phnom Penh khan.', km: 'សូមជ្រើសរើសខណ្ឌនៅភ្នំពេញ។' },
  'checkout.errProvince': { en: 'Choose a province from the list.', km: 'សូមជ្រើសរើសខេត្តពីបញ្ជី។' },
  'checkout.errPhoneRequired': {
    en: 'Please enter a phone number for delivery.',
    km: 'សូមបញ្ចូលលេខទូរស័ព្ទសម្រាប់ការដឹកជញ្ជូន។',
  },
  'checkout.errPhone': {
    en: 'Please enter a valid Cambodian phone number (e.g. 012 345 678).',
    km: 'សូមបញ្ចូលលេខទូរស័ព្ទកម្ពុជាត្រឹមត្រូវ (ឧ. 012 345 678)។',
  },

  // Account
  'account.myAccount': { en: 'MY ACCOUNT', km: 'គណនីរបស់ខ្ញុំ' },
  'account.hi': { en: 'Hi, {name}', km: 'សួស្តី {name}' },
  'account.memberSince': { en: 'member since {date}', km: 'សមាជិកតាំងពី {date}' },
  'account.logout': { en: 'Logout', km: 'ចាកចេញ' },
  'account.ordersPlaced': { en: 'Orders placed', km: 'ការបញ្ជាទិញ' },
  'account.totalSpent': { en: 'Total spent', km: 'ចំណាយសរុប' },
  'account.freeShipping': { en: 'Free shipping', km: 'ដឹកជញ្ជូនឥតគិតថ្លៃ' },
  'account.orderHistory': { en: 'ORDER HISTORY', km: 'ប្រវត្តិការបញ្ជាទិញ' },
  'account.yourRituals': { en: 'Your Rituals', km: 'ផលិតផលរបស់អ្នក' },
  'account.ordersCount': { en: '{count} orders', km: 'ការបញ្ជាទិញ {count}' },
  'account.noOrders': { en: 'No orders yet', km: 'មិនទាន់មានការបញ្ជាទិញ' },
  'account.noOrdersHint': {
    en: 'When you buy something, it will appear here.',
    km: 'នៅពេលអ្នកទិញទំនិញ វានឹងបង្ហាញនៅទីនេះ។',
  },
  'account.trackingNumber': { en: 'Tracking number:', km: 'លេខតាមដាន៖' },
  'account.pending': { en: 'Pending', km: 'កំពុងរង់ចាំ' },
  'account.cancelledStatus': { en: 'Cancelled', km: 'បានលុបចោល' },
  'account.refundedStatus': { en: 'Refunded', km: 'បានសងប្រាក់វិញ' },
  'account.trackingReference': {
    en: 'Tracking reference {number}',
    km: 'លេខតាមដាន {number}',
  },
  'account.placed': { en: 'Placed', km: 'បានបញ្ជាទិញ' },
  'account.processing': { en: 'Processing', km: 'កំពុងដំណើរការ' },
  'account.shipped': { en: 'Shipped', km: 'បានដឹកជញ្ជូន' },
  'account.delivered': { en: 'Delivered', km: 'បានទទួល' },
  'account.cancelled': { en: 'This order was cancelled.', km: 'ការបញ្ជាទិញនេះត្រូវបានលុបចោល។' },
  'account.refunded': { en: 'This order was refunded.', km: 'ការបញ្ជាទិញនេះត្រូវបានសងប្រាក់វិញ។' },
  'account.signInFirst': {
    en: 'Sign in to see your orders',
    km: 'ចូលគណនីដើម្បីមើលការបញ្ជាទិញរបស់អ្នក',
  },

  // Public order tracking
  'track.eyebrow': { en: 'ORDER TRACKING', km: 'ការតាមដានការបញ្ជាទិញ' },
  'track.title': { en: 'Where is my order?', km: 'ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?' },
  'track.subtitle': {
    en: 'Enter your order number and the email you used at checkout. We’ll show the latest status and tracking details.',
    km: 'បញ្ចូលលេខការបញ្ជាទិញ និងអ៊ីមែលដែលអ្នកបានប្រើពេលទូទាត់។ យើងនឹងបង្ហាញស្ថានភាពចុងក្រោយ និងព័ត៌មានតាមដាន។',
  },
  'track.orderNumber': { en: 'Order number', km: 'លេខការបញ្ជាទិញ' },
  'track.orderPlaceholder': { en: 'LUM-XXXXXX-XXXX', km: 'LUM-XXXXXX-XXXX' },
  'track.email': { en: 'Email', km: 'អ៊ីមែល' },
  'track.emailPlaceholder': { en: 'you@example.com', km: 'you@example.com' },
  'track.submit': { en: 'Track order', km: 'តាមដានការបញ្ជាទិញ' },
  'track.searching': { en: 'Looking up your order…', km: 'កំពុងស្វែងរកការបញ្ជាទិញរបស់អ្នក…' },
  'track.privacy': {
    en: 'Your email is only used to find this order.',
    km: 'អ៊ីមែលរបស់អ្នកត្រូវបានប្រើសម្រាប់តែការស្វែងរកការបញ្ជាទិញនេះប៉ុណ្ណោះ។',
  },
  'track.required': {
    en: 'Enter your order number and email.',
    km: 'បញ្ចូលលេខការបញ្ជាទិញ និងអ៊ីមែលរបស់អ្នក។',
  },
  'track.notFound': {
    en: 'We couldn’t find an order with that number and email. Check both and try again.',
    km: 'យើងរកមិនឃើញការបញ្ជាទិញដែលមានលេខ និងអ៊ីមែលនេះទេ។ សូមពិនិត្យឡើងវិញ ហើយព្យាយាមម្តងទៀត។',
  },
  'track.error': {
    en: 'We couldn’t look up your order right now. Please try again.',
    km: 'យើងមិនអាចពិនិត្យការបញ្ជាទិញរបស់អ្នកបានទេឥឡូវនេះ។ សូមព្យាយាមម្តងទៀត។',
  },
  'track.rateLimited': {
    en: 'Too many attempts. Please wait a few minutes and try again.',
    km: 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច ហើយព្យាយាមម្តងទៀត។',
  },
  'track.resultEyebrow': { en: 'ORDER {number}', km: 'ការបញ្ជាទិញ {number}' },
  'track.placedOn': { en: 'Placed {date}', km: 'បានបញ្ជាទិញ {date}' },
  'track.items': { en: 'Items', km: 'ទំនិញ' },
  'track.summary': { en: 'Order summary', km: 'សេចក្តីសង្ខេបការបញ្ជាទិញ' },
  'track.shippingTo': { en: 'Shipping to', km: 'ដឹកជញ្ជូនទៅ' },
  'track.payment': { en: 'Payment', km: 'ការទូទាត់' },
  'track.paid': { en: 'Paid', km: 'បានបង់ប្រាក់' },
  'track.unpaid': { en: 'Unpaid', km: 'មិនទាន់បង់ប្រាក់' },
  'track.paymentRefunded': { en: 'Refunded', km: 'បានសងប្រាក់វិញ' },
  'track.trackAnother': { en: 'Track another order', km: 'តាមដានការបញ្ជាទិញផ្សេងទៀត' },
  'track.viewOrders': { en: 'View my orders', km: 'មើលការបញ្ជាទិញរបស់ខ្ញុំ' },
  'track.help': { en: 'Need help?', km: 'ត្រូវការជំនួយ?' },

  // Auth
  'auth.login': { en: 'LOGIN', km: 'ចូលគណនី' },
  'auth.createAccount': { en: 'CREATE AN ACCOUNT', km: 'បង្កើតគណនី' },
  'auth.resetPassword': { en: 'RESET PASSWORD', km: 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ' },
  'auth.signIn': { en: 'Sign in', km: 'ចូលគណនី' },
  'auth.newHere': { en: "I'm new here", km: 'ខ្ញុំជាអ្នកថ្មី' },
  'auth.email': { en: 'Email Address*', km: 'អាសយដ្ឋានអ៊ីមែល*' },
  'auth.password': { en: 'Password*', km: 'ពាក្យសម្ងាត់*' },
  'auth.confirmPassword': { en: 'Confirm Password*', km: 'បញ្ជាក់ពាក្យសម្ងាត់*' },
  'auth.firstName': { en: 'First Name*', km: 'នាមខ្លួន*' },
  'auth.lastName': { en: 'Last Name*', km: 'នាមត្រកូល*' },
  'auth.forgot': { en: 'Forgot password?', km: 'ភ្លេចពាក្យសម្ងាត់?' },
  'auth.sendReset': { en: 'SEND RESET LINK', km: 'ផ្ញើតំណកំណត់ឡើងវិញ' },
  'auth.continueGoogle': { en: 'Continue with Google', km: 'បន្តជាមួយ Google' },
  'auth.acceptTerms': {
    en: "I've read and accept the Terms & Conditions",
    km: 'ខ្ញុំបានអាន និងយល់ព្រមលក្ខខណ្ឌប្រើប្រាស់',
  },
  'auth.pleaseWait': { en: 'Please wait...', km: 'សូមរង់ចាំ...' },
  'auth.backToSignIn': { en: 'Back to sign in', km: 'ត្រឡប់ទៅការចូលគណនី' },
  'auth.signUp': { en: 'SIGN UP', km: 'ចុះឈ្មោះ' },
  'auth.weak': { en: 'Weak', km: 'ខ្សោយ' },
  'auth.fair': { en: 'Fair', km: 'មធ្យម' },
  'auth.strong': { en: 'Strong', km: 'រឹងមាំ' },
  'auth.strengthTip': {
    en: 'Tip: use 10+ characters with a mix of upper & lower case, numbers, and symbols for a strong password.',
    km: 'គន្លឹះ៖ ប្រើ 10 តួអក្សរឡើងទៅ ដោយលាយអក្សរធំ-តូច លេខ និងសញ្ញា ដើម្បីបានពាក្យសម្ងាត់រឹងមាំ។',
  },
  'auth.termsNote': {
    en: "By clicking on 'Create an Account', you accept our confidentiality policies.",
    km: "ដោយចុចលើ 'បង្កើតគណនី' អ្នកយល់ព្រមតាមគោលការណ៍រក្សាការសម្ងាត់របស់យើង។",
  },
  'auth.close': { en: 'Close auth modal', km: 'បិទប្រអប់ចូលគណនី' },
  'auth.or': { en: 'or', km: 'ឬ' },

  // About
  'about.kicker': { en: 'ABOUT CALESTA', km: 'អំពី CALESTA' },
  'about.title': {
    en: 'Beauty where science and nature meet.',
    km: 'សម្ផស្សដែលវិទ្យាសាស្ត្រ និងធម្មជាតិជួបគ្នា។',
  },
  'about.body1': {
    en: 'Calesta was created to make skincare feel elevated, clear, and trustworthy. We believe visible results come from thoughtful formulation, not noise.',
    km: 'Calesta ត្រូវបានបង្កើតឡើងដើម្បីធ្វើឱ្យការថែទាំស្បែកមានភាពខ្ពង់ខ្ពស់ ច្បាស់លាស់ និងគួរឱ្យទុកចិត្ត។ យើងជឿថាលទ្ធផលជាក់ស្តែងកើតចេញពីរូបមន្តដែលគិតគូរដោយប្រុងប្រយ័ត្ន មិនមែនពីការឃោសនាឡូឡា។',
  },
  'about.body2': {
    en: 'Every ritual is designed to feel refined in your hands and gentle on your skin, while staying grounded in ingredients that do real work.',
    km: 'រាល់ផលិតផលត្រូវបានរចនាឡើងឱ្យមានអារម្មណ៍ប្រណិតនៅក្នុងដៃ និងទន់ភ្លន់លើស្បែក ខណៈដែលនៅតែផ្អែកលើគ្រឿងផ្សំដែលដំណើរការពិតប្រាកដ។',
  },
  'about.provenResults': { en: 'Proven Results', km: 'លទ្ធផលបញ្ជាក់' },
  'about.provenResultsDesc': {
    en: 'We formulate with evidence-led actives and test for efficacy before anything reaches the shelf.',
    km: 'យើងបង្កើតរូបមន្តដោយសារធាតុសកម្មដែលមានភស្តុតាង និងធ្វើតេស្តប្រសិទ្ធភាពមុនពេលផលិតផលដាក់លក់។',
  },
  'about.cleanIngredients': { en: 'Clean Ingredients', km: 'គ្រឿងផ្សំស្អាត' },
  'about.cleanIngredientsDesc': {
    en: 'Our formulas focus on plant-based ingredients and avoid unnecessary fillers or harsh additives.',
    km: 'រូបមន្តរបស់យើងផ្តោតលើគ្រឿងផ្សំពីរុក្ខជាតិ និងជៀសវាងសារធាតុបំពេញបន្ថែមដែលមិនចាំបាច់ ឬសារធាតុរឹងដែលបង្កគ្រោះថ្នាក់។',
  },
  'about.kindnessFirst': { en: 'Kindness First', km: 'សេចក្តីមេត្តាជាមុន' },
  'about.kindnessFirstDesc': {
    en: 'From cruelty-free development to responsible packaging, care is part of the product.',
    km: 'ចាប់ពីការអភិវឌ្ឍដោយមិនធ្វើតេស្តលើសត្វ ដល់ការវេចខ្ចប់ដោយទទួលខុសត្រូវ ការយកចិត្តទុកដាក់គឺជាផ្នែកមួយនៃផលិតផល។',
  },
  'about.philosophyA': { en: 'Every formula balances', km: 'រូបមន្តនីមួយៗរួមបញ្ចូលគ្នារវាង' },
  'about.philosophyB': {
    en: 'high-performance actives with a softer sensorial experience,',
    km: 'សារធាតុសកម្មដ៏មានប្រសិទ្ធភាពខ្ពស់ ជាមួយបទពិសោធន៍ដ៏ទន់ភ្លន់,',
  },
  'about.philosophyC': {
    en: 'so skincare feels as good as it performs.',
    km: 'ដើម្បីឱ្យការថែទាំស្បែកមានអារម្មណ៍ល្អដូចប្រសិទ្ធភាពរបស់វា។',
  },

  // Journal page
  'journalPage.kicker': { en: 'OUR JOURNAL', km: 'ទស្សនាវដ្ដីរបស់យើង' },
  'journalPage.title': {
    en: 'Stories, rituals, and ingredient notes from the Calesta studio.',
    km: 'រឿងរ៉ាវ ពិធីថែទាំ និងកំណត់ចំណាំអំពីគ្រឿងផ្សំ ពីស្ទូឌីយោ Calesta។',
  },
  'journalPage.sub': {
    en: 'Editorial content shaped to the same calm, spacious visual rhythm as the rest of the experience.',
    km: 'អត្ថបទដែលមានចង្វាក់រូបភាពស្ងប់ស្ងាត់ និងទូលាយ ដូចបទពិសោធន៍ផ្សេងទៀតរបស់យើង។',
  },
  'journalPage.noStories': { en: 'No stories yet', km: 'មិនទាន់មានរឿង' },
  'journalPage.noStoriesHint': {
    en: 'Journal posts will appear here once published.',
    km: 'អត្ថបទនឹងបង្ហាញនៅទីនេះនៅពេលចេញផ្សាយ។',
  },
  'journalPage.featured': { en: 'FEATURED ARTICLE', km: 'អត្ថបទពិសេស' },
  'journalPage.minRead': { en: '{count} min read', km: 'អាន {count} នាទី' },

  // Reset password
  'reset.updated': { en: 'Password updated', km: 'បានធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់' },
  'reset.updatedBody': {
    en: 'You can sign in with your new password.',
    km: 'អ្នកអាចចូលគណនីដោយប្រើពាក្យសម្ងាត់ថ្មីរបស់អ្នក។',
  },
  'reset.missing': { en: 'Missing reset link', km: 'ខ្វះតំណកំណត់ឡើងវិញ' },
  'reset.missingBody': {
    en: 'Request a fresh link from the sign-in page.',
    km: 'ស្នើសុំតំណថ្មីពីទំព័រចូលគណនី។',
  },
  'reset.choose': { en: 'Choose a new password', km: 'ជ្រើសរើសពាក្យសម្ងាត់ថ្មី' },
  'reset.chooseHint': {
    en: 'Pick something strong — at least 8 characters with a mix of letters, numbers, and symbols.',
    km: 'ជ្រើសរើសពាក្យសម្ងាត់រឹងមាំ — យ៉ាងតិច 8 តួអក្សរ ដោយលាយអក្សរ លេខ និងសញ្ញា។',
  },
  'reset.newPassword': { en: 'New password', km: 'ពាក្យសម្ងាត់ថ្មី' },
  'reset.confirmPassword': { en: 'Confirm new password', km: 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី' },
  'reset.update': { en: 'Update Password', km: 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់' },
  'reset.updating': { en: 'Updating…', km: 'កំពុងធ្វើបច្ចុប្បន្នភាព…' },

  // Payment result
  'pay.received': { en: 'PAYMENT RECEIVED', km: 'បានទទួលការបង់ប្រាក់' },
  'pay.thanks': { en: 'Thank you!', km: 'សូមអរគុណ!' },
  'pay.thanksBody': {
    en: 'Order {number} is paid and will ship soon.',
    km: 'ការបញ្ជាទិញ {number} បានបង់ប្រាក់រួច ហើយនឹងដឹកជញ្ជូនឆាប់ៗ។',
  },
  'pay.viewOrders': { en: 'View My Orders', km: 'មើលការបញ្ជាទិញរបស់ខ្ញុំ' },
  'pay.signInContinue': { en: 'Sign in to continue', km: 'ចូលគណនីដើម្បីបន្ត' },
  'pay.verifying': { en: 'Verifying payment…', km: 'កំពុងផ្ទៀងផ្ទាត់ការបង់ប្រាក់…' },
  'pay.pending': { en: 'Payment pending', km: 'កំពុងរង់ចាំការបង់ប្រាក់' },
  'pay.pendingBody': {
    en: 'The payment has not settled yet — check your account page shortly.',
    km: 'ការបង់ប្រាក់មិនទាន់បានបញ្ចប់ — សូមពិនិត្យទំព័រគណនីរបស់អ្នកក្នុងពេលបន្តិចទៀត។',
  },

  // Google callback
  'callback.failed': { en: "Sign-in didn't complete", km: 'ការចូលគណនីមិនបានបញ្ចប់' },
  'callback.failedBody': {
    en: 'Google sign-in failed. Please try again.',
    km: 'ការចូលគណនីដោយ Google បរាជ័យ។ សូមព្យាយាមម្តងទៀត។',
  },
  'callback.signedIn': { en: "You're signed in", km: 'អ្នកបានចូលគណនីហើយ' },
  'callback.welcome': {
    en: 'Welcome to Calesta — taking you home.',
    km: 'សូមស្វាគមន៍មកកាន់ Calesta — កំពុងបញ្ជូនអ្នកទៅទំព័រដើម។',
  },
  'callback.completing': { en: 'Completing sign-in…', km: 'កំពុងបញ្ចប់ការចូលគណនី…' },

  // Footer
  'footer.tagline': {
    en: 'A relationship between you and your skin, between nature and science, between beauty and responsibility.',
    km: 'ទំនាក់ទំនងរវាងអ្នក និងស្បែករបស់អ្នក រវាងធម្មជាតិ និងវិទ្យាសាស្ត្រ រវាងភាពស្រស់ស្អាត និងការទទួលខុសត្រូវ។',
  },
  'footer.shop': { en: 'Shop', km: 'ហាង' },
  'footer.more': { en: 'More', km: 'បន្ថែម' },
  'footer.follow': { en: 'Follow', km: 'តាមដាន' },
  'footer.backToTop': { en: 'BACK TO TOP', km: 'ត្រឡប់ទៅកំពូល' },
  'footer.rights': { en: '©2026 Calesta. All rights reserved.', km: '©2026 Calesta។ រក្សាសិទ្ធិគ្រប់យ៉ាង។' },
  'footer.about': { en: 'About', km: 'អំពី' },
  'footer.track': { en: 'Track Order', km: 'តាមដានការបញ្ជាទិញ' },

  // Category labels (DB slugs)
  'category.cleansers': { en: 'Cleansers', km: 'ផលិតផលសម្អាត' },
  'category.serums': { en: 'Serums', km: 'សេរ៉ូម' },
  'category.moisturizers': { en: 'Moisturizers', km: 'ម៉ូញ៉ូរីស' },
  'category.sunscreen': { en: 'Sunscreen', km: 'ក្រែមការពារកម្តៅថ្ងៃ' },
  'category.eye-care': { en: 'Eye Care', km: 'ការថែទាំភ្នែក' },
  'category.masks': { en: 'Masks', km: 'ម៉ាស' },
} as const satisfies Record<string, Entry>

export type TKey = keyof typeof dictionary

/** Translate a key for a given language, with {placeholder} interpolation. */
export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  const entry = dictionary[key] as Entry | undefined
  let text = entry ? entry[lang] ?? entry.en : key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

/** Hook: returns a `t()` bound to the current language (re-renders on switch). */
export function useT() {
  const lang = usePrefsStore((s) => s.lang)
  return (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars)
}

export function useLang(): Lang {
  return usePrefsStore((s) => s.lang)
}

/** Localized label for a catalog category slug, falling back to the API name. */
export function useCategoryName() {
  const lang = useLang()
  return (slug: string | undefined, fallback: string) => {
    const key = `category.${slug ?? ''}` as TKey
    const entry = dictionary[key] as Entry | undefined
    return entry ? entry[lang] ?? fallback : fallback
  }
}
