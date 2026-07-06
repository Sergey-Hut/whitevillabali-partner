/* White Villa Bali — i18n (RU source → EN/ID). Default language = EN.
   Language is resolved from the URL folder (/en/ /id/ /ru/ via window.WV_FORCE_LANG),
   then a returning visitor's saved choice, else EN. Switcher rewrites the URL (pushState).
   Per-language WhatsApp text, request popup + form handling.
   Retrofit approach: translate by matching the original RU text of each text node
   against a dictionary — no markup changes needed. Missing keys gracefully stay RU. */
(function () {
  "use strict";

  /* ============ CONFIG ============ */
  // Lead relay endpoint (serverless function that forwards the form to the Telegram group).
  // Leave "" until deployed → form falls back to opening WhatsApp with the lead text.
  var LEAD_ENDPOINT = "https://wvb-relay.vercel.app/api/lead";
  var WA_NUMBER = "6282342182361";

  /* ============ WHATSAPP PREFILLED MESSAGES (per button intent × language) ============ */
  var WA_MSGS = {
    greeting: {
      ru: "Здравствуйте! Интересует White Villa Bali",
      en: "Hi! I'm interested in White Villa Bali",
      id: "Halo! Saya tertarik dengan White Villa Bali"
    },
    income: {
      ru: "Здравствуйте! Интересует доход и договоры по White Villa Bali",
      en: "Hi! I'd like the rental income figures and the contracts for White Villa Bali",
      id: "Halo! Saya ingin melihat angka pendapatan sewa dan kontrak White Villa Bali"
    },
    docs: {
      ru: "Здравствуйте! Прошу пакет документов по White Villa Bali",
      en: "Hi! Please send the document package for White Villa Bali",
      id: "Halo! Mohon kirimkan paket dokumen White Villa Bali"
    },
    viewing: {
      ru: "Здравствуйте! Интересует White Villa Bali — хочу записаться на частный показ",
      en: "Hi! I'm interested in White Villa Bali and would like to book a private viewing",
      id: "Halo! Saya tertarik dengan White Villa Bali dan ingin menjadwalkan viewing privat"
    }
  };
  var POPUP = {
    ru: { t: "Спасибо за заявку!", b: "Мы свяжемся с вами в ближайшее время.", c: "Закрыть" },
    en: { t: "Thank you for your request!", b: "We'll get in touch with you shortly.", c: "Close" },
    id: { t: "Terima kasih atas permintaan Anda!", b: "Kami akan segera menghubungi Anda.", c: "Tutup" }
  };
  var LEAD_LABELS = {
    ru: { head: "Заявка с сайта White Villa Bali", name: "Имя", contact: "Контакт", msg: "Сообщение" },
    en: { head: "Lead from White Villa Bali site", name: "Name", contact: "Contact", msg: "Message" },
    id: { head: "Permintaan dari situs White Villa Bali", name: "Nama", contact: "Kontak", msg: "Pesan" }
  };
  var FORM_ERR = {
    ru: "Заполните имя и контакт.", en: "Please fill in your name and contact.", id: "Isi nama dan kontak Anda."
  };

  /* ============ DICTIONARY (normalized RU → translation) ============ */
  var EN = {
    // nav / common
    "Объект": "Property", "Галерея": "Gallery", "Планировки": "Floor plans",
    "Инвестиции": "Investment", "Частный показ": "Private viewing", "Резиденция": "Residence",
    // hero
    "Унгасан · Букит · Бали": "Ungasan · Bukit · Bali",
    "Вилла на Буките": "A villa on the Bukit", "с доходностью": "yielding", "12–15% годовых": "12–15% a year",
    "4 спальни, панорамная крыша 360° с видом на океан и открытый бассейн. Под ключ — напрямую от собственника, без комиссии агента.":
      "4 bedrooms, a 360° panoramic rooftop with ocean views and an open-air pool. Turnkey — directly from the owner, no agent commission.",
    "Запросить частный показ": "Request a private viewing",
    // facts
    "Готова к жизни и аренде": "Ready to live in and rent out",
    "Четыре уровня вокруг света и вида. Сдана в 2018-м, передаётся под ключ — мебель, техника и система Sonos уже внутри. Заезжайте или сдавайте с первого дня.":
      "Four levels arranged around light and the view. Completed in 2018, handed over turnkey — furniture, appliances and a Sonos system already inside. Move in or rent from day one.",
    "дом": "house", "участок": "land", "спальни": "bedrooms", "санузлов": "bathrooms", "крыша": "rooftop", "год": "year",
    // video
    "Видеотур": "Video tour", "Дом за одну минуту": "The home in one minute",
    "Крыша 360°, интерьеры, бассейн и линия океана — с воздуха и внутри. Без монтажных трюков.":
      "360° rooftop, interiors, pool and the ocean line — from the air and inside. No editing tricks.",
    // interiors
    "Интерьеры": "Interiors", "Пространства, открытые океану": "Spaces open to the ocean",
    "Листайте кадры в каждой зоне. Дом передаётся под ключ — с мебелью и техникой.":
      "Swipe through each area. The home is delivered turnkey — with furniture and appliances.",
    "Кинотеатр-гостиная": "Home-cinema living room",
    "Открытая гостиная с домашним кинотеатром: стекло в пол, мягкий свет и выход на террасу с океаном.":
      "An open living room with a home cinema: floor-to-ceiling glass, soft light and access to the ocean-facing terrace.",
    "Кухня и столовая": "Kitchen & dining",
    "Остров, техника премиум и обеденная зона с выходом к бассейну и панораме.":
      "An island, premium appliances and a dining area opening onto the pool and the panorama.",
    "Спальни и сьюты": "Bedrooms & suites",
    "Спальни-сьюты с гардеробными и ванными. Тёплый камень, дерево и мягкий свет.":
      "Bedroom suites with walk-in closets and bathrooms. Warm stone, wood and soft light.",
    // gallery
    "Резиденция вблизи": "The residence up close",
    "Каждый ракурс — аргумент: архитектура, свет и океан, снятые честно, без рендеров. Ровно то, что вы получаете за $850 000.":
      "Every angle is an argument: architecture, light and the ocean, shot honestly, no renders. Exactly what you get for $850,000.",
    // amenities
    "Оснащение": "Amenities", "Всё уже в доме": "Everything's already in the house",
    "От кинотеатра до мультирум-звука — вилла укомплектована под ключ. Заезжайте или сдавайте: докупать ничего не нужно.":
      "From the cinema to multiroom audio — the villa is fully equipped, turnkey. Move in or rent: nothing left to buy.",
    "Домашний кинотеатр": "Home cinema", "Большой экран и акустика": "Big screen and sound system",
    "Панорамный бассейн": "Panoramic pool", "Вдоль линии океана": "Along the ocean line",
    "Крыша 360°": "360° rooftop", "Океан, GWK и Агунг": "Ocean, GWK and Mt Agung",
    "Звук Sonos": "Sonos sound", "Мультирум во всём доме": "Multiroom throughout",
    "Кухня под ключ": "Fitted kitchen", "Техника премиум": "Premium appliances",
    "Климат-контроль": "Climate control", "Во всех комнатах": "In every room",
    "Гараж на 2 авто": "2-car garage", "Крытая парковка": "Covered parking",
    "Блок персонала": "Staff quarters", "Кухня, спальня, санузел": "Kitchen, bedroom, bathroom",
    "Сад и озеленение": "Garden & landscaping", "Ландшафт по периметру": "Landscaping around the plot",
    "Полная меблировка": "Fully furnished", "Мебель и техника включены": "Furniture and appliances included",
    "Скоростной интернет": "High-speed internet", "Оптика и Wi-Fi": "Fiber and Wi-Fi",
    "Охрана и сервис": "Security & service", "Уборка, бассейн, охрана": "Cleaning, pool, security",
    // plans
    "Четыре уровня — листайте как книгу": "Four levels — flip through like a book",
    "Оригинальные чертежи архитектора, уровень за уровнем — 1:100, без рендеров. Листайте страницы как книгу или выберите этаж слева.":
      "The architect's original drawings, level by level — 1:100, no renders. Flip the pages like a book or pick a floor on the left.",
    "Вход · сервис · бассейн": "Entrance · service · pool", "Гостиная · кухня · мастер": "Living · kitchen · master",
    "Спальни · сьюты": "Bedrooms · suites",
    "оригинал · 1:100": "original · 1:100", "увеличить +": "zoom +", "Назад": "Back", "‹ Назад": "‹ Back", "Листать": "Flip", "м²": "m²",
    "Уровень 01": "Level 01", "Уровень 02": "Level 02", "Уровень 03": "Level 03", "Уровень 04": "Level 04",
    "— въезд, гараж на 2 авто, блок персонала, входная галерея, сад и бассейн.": "— entrance, a 2-car garage, staff quarters, the entry gallery, garden and pool.",
    "— гостиная с кинотеатром, кухня-столовая и мастер-спальня; выход на террасу к бассейну.": "— a living room with a cinema, a kitchen-dining area and the master bedroom; terrace access to the pool.",
    "— спальни-сьюты с гардеробными и ванными; кабинет, тёплый камень и дерево.": "— bedroom suites with walk-in closets and bathrooms; a study, warm stone and wood.",
    "— панорамная крыша 360°: террасы, gazebo, виды на океан, GWK и гору Агунг.": "— a 360° panoramic rooftop: terraces, a gazebo, views of the ocean, GWK and Mt Agung.",
    "Jl. Awar Awar, Унгасан,": "Jl. Awar Awar, Ungasan,", "Кута Селатан, Бадунг, Бали 80361": "Kuta Selatan, Badung, Bali 80361",
    "Jl. Awar Awar, Унгасан, Кута Селатан, Бадунг, Бали": "Jl. Awar Awar, Ungasan, Kuta Selatan, Badung, Bali",
    "Уровень 01 · Ground floor": "Level 01 · Ground floor", "Уровень 02 · First floor": "Level 02 · First floor",
    "Уровень 03 · Second floor": "Level 03 · Second floor", "Уровень 04 · Roof top": "Level 04 · Roof top",
    "Уровень 01 — въезд, гараж на 2 авто, блок персонала, входная галерея, сад и бассейн.":
      "Level 01 — entrance, a 2-car garage, staff quarters, the entry gallery, garden and pool.",
    // location
    "Локация": "Location", "Унгасан — тихая вершина Букита": "Ungasan — the quiet top of the Bukit",
    "Южная вершина Букита — скалы, белые пляжи и закаты над океаном. Пляжи, гольф и рестораны в нескольких минутах; до аэропорта — минут 25.":
      "The southern tip of the Bukit — cliffs, white beaches and sunsets over the ocean. Beaches, golf and restaurants minutes away; about 25 minutes to the airport.",
    "Jl. Awar Awar, Унгасан, Кута Селатан, Бадунг, Бали 80361": "Jl. Awar Awar, Ungasan, Kuta Selatan, Badung, Bali 80361",
    "Проложить маршрут": "Get directions", "Открыть в Google Maps": "Open in Google Maps",
    "Гольф-клуб": "Golf club", "Пляж Джимбаран": "Jimbaran Beach", "Пляж Меласти": "Melasti Beach",
    "Пляж Пандава": "Pandawa Beach", "Аэропорт Нгурах-Рай": "Ngurah Rai Airport",
    "7 мин": "7 min", "8 мин": "8 min", "13 мин": "13 min", "15 мин": "15 min",
    "16 мин": "16 min", "17 мин": "17 min", "25 мин": "25 min", "30 мин": "30 min",
    "Время в пути — на авто, ориентировочно.": "Drive times, approximate.",
    // invest
    "Доход, подтверждённый договорами": "Income backed by contracts",
    "Букит — самый востребованный юг Бали. Вилла под ключ и готова к аренде с первого дня; цифры подтверждают реальные договоры.":
      "The Bukit is the most sought-after south of Bali. The villa is turnkey and rent-ready from day one; the figures are backed by real contracts.",
    "доходность, чистыми": "net yield", "загрузка в год": "annual occupancy",
    "лет окупаемость": "yrs payback", "цена входа": "entry price",
    "Рассчитайте доход от аренды": "Estimate the rental income",
    "Иллюстративно · при текущих допущениях": "Illustrative · at current assumptions",
    "Ставка за ночь": "Nightly rate", "Загрузка": "Occupancy",
    "валовой доход / год": "gross income / year", "чистыми / год ≈": "net / year ≈",
    "доходность": "yield", "окупаемость": "payback",
    "Расчёт после расходов и управления (≈45% от валового). Реальные договоры аренды и точные цифры — приватно на встрече.":
      "Calculated after costs and management (≈45% of gross). Real rental contracts and exact figures — privately at the meeting.",
    "Запросить цифры и договоры": "Request figures & contracts",
    // ownership
    "Собственность и право": "Ownership & title",
    "Чистое право — оформление под любого покупателя": "Clean title — structured for any buyer",
    "Объект передаётся в одном из легальных форматов — в зависимости от того, гражданин вы Индонезии или иностранный покупатель. Структуру и сроки подтверждает лицензированный нотариус (PPAT) на сделке.":
      "The property is transferred in one of the legal formats — depending on whether you are an Indonesian citizen or a foreign buyer. The structure and terms are confirmed by a licensed notary (PPAT) at closing.",
    "Полная собственность": "Full ownership", "Граждане Индонезии": "Indonesian citizens",
    "Фрихолд — право собственности без срока, высшая форма владения землёй и домом.":
      "Freehold — ownership with no time limit, the highest form of holding land and a house.",
    "Право пользования": "Right to use", "Иностранцы · физлицо": "Foreigners · individual",
    "Именное право пользования, продлеваемое по закону — суммарно до ~80 лет по действующим нормам.":
      "A personal right to use, renewable by law — up to ~80 years in total under current rules.",
    "Владение через компанию": "Ownership via a company", "Иностранцы · юрлицо": "Foreigners · company",
    "Оформление на вашу индонезийскую компанию (PT PMA) — частый формат для инвесторов.":
      "Held by your Indonesian company (PT PMA) — a common format for investors.",
    "Полный пакет документов и проверку титула предоставляем на частном показе. Точный формат, сроки и комплект бумаг фиксирует лицензированный нотариус (PPAT) — напрямую, без посредников.":
      "We provide the full document package and title check at the private viewing. The exact format, terms and paperwork are set by a licensed notary (PPAT) — directly, no intermediaries.",
    // trust
    "Документы и доверие": "Documents & trust", "Чистая и прозрачная сделка": "A clean, transparent deal",
    "Прямая продажа от собственника под сопровождением лицензированного нотариуса. Полный пакет документов и подтверждение дохода предоставляем приватно — по индивидуальному запросу.":
      "A direct sale from the owner, supported by a licensed notary. The full document package and income proof are provided privately — on individual request.",
    "Запросить документы": "Request documents",
    "Напрямую от собственника": "Directly from the owner",
    "Без агентов и комиссий: договор и переговоры — напрямую с владельцем.":
      "No agents or commissions: the contract and negotiations are directly with the owner.",
    "Сопровождение нотариуса (PPAT)": "Notary support (PPAT)",
    "Лицензированный нотариус проверяет титул и регистрирует сделку по закону Индонезии.":
      "A licensed notary verifies the title and registers the deal under Indonesian law.",
    "Доход подтверждён договорами": "Income backed by contracts",
    "Реальные договоры аренды показываем приватно — с защитой персональных данных.":
      "We show real rental contracts privately — with personal data protected.",
    "Документы — по запросу": "Documents on request",
    "Полный пакет предоставляем индивидуально: для вас и вашего юриста.":
      "We provide the full package individually: for you and your lawyer.",
    // faq
    "Вопросы": "FAQ", "Коротко о главном": "The essentials, briefly",
    "Кто может купить — иностранец или гражданин Индонезии?": "Who can buy — a foreigner or an Indonesian citizen?",
    "Оформляем под любого покупателя. Гражданам Индонезии — SHM (полная собственность). Иностранцам — Hak Pakai на физлицо или HGB через вашу компанию (PT PMA). Форму и сроки подтверждает лицензированный нотариус (PPAT).":
      "We can structure it for any buyer. Indonesian citizens — SHM (full ownership). Foreigners — Hak Pakai as an individual or HGB via your company (PT PMA). The form and terms are confirmed by a licensed notary (PPAT).",
    "Что входит в цену $850 000?": "What's included in the $850,000 price?",
    "Вилла под ключ: 4 спальни, 5+ санузлов, бассейн, домашний кинотеатр, крыша 360°, кухня с техникой, система Sonos, мебель, гараж на 2 авто и блок персонала. Заезжайте или сдавайте — докупать ничего не нужно.":
      "A turnkey villa: 4 bedrooms, 5+ bathrooms, pool, home cinema, 360° rooftop, a fitted kitchen, a Sonos system, furniture, a 2-car garage and staff quarters. Move in or rent — nothing left to buy.",
    "Какой доход и чем он подтверждён?": "What's the income and how is it backed?",
    "Консервативно — 12–15% чистыми в год при загрузке около 70%. Доход подтверждают реальные договоры аренды; показываем их приватно на встрече, с защитой персональных данных.":
      "Conservatively — 12–15% net per year at around 70% occupancy. The income is backed by real rental contracts; we show them privately at a meeting, with personal data protected.",
    "Есть ли комиссия агента?": "Is there an agent commission?",
    "Нет. Продажа напрямую от собственника — без агентских комиссий. Сделку сопровождает лицензированный нотариус.":
      "No. A direct sale from the owner — no agent commissions. A licensed notary supports the deal.",
    "Как проходит сделка и сколько занимает?": "How does the deal work and how long does it take?",
    "Проверка документов → договор у нотариуса (PPAT) → регистрация. Точные сроки и комплект бумаг фиксирует нотариус; полный пакет предоставляем по индивидуальному запросу.":
      "Document check → contract at the notary (PPAT) → registration. The exact timing and paperwork are set by the notary; the full package is provided on individual request.",
    "Можно посмотреть виллу онлайн и лично?": "Can I view the villa online and in person?",
    "Да. Организуем онлайн-показ по видео и личный просмотр на месте. Напишите в WhatsApp — подберём удобное время.":
      "Yes. We arrange an online video viewing and an in-person visit on site. Message us on WhatsApp — we'll find a convenient time.",
    // contact
    "Посмотрите виллу лично": "See the villa in person",
    "Онлайн-показ по видео или личный визит в Унгасане. Оставьте контакт — ответим в течение часа и подберём удобное время.":
      "An online video viewing or an in-person visit in Ungasan. Leave your contact — we'll reply within an hour and find a convenient time.",
    "Имя": "Name", "Связь с вами": "How to reach you", "(любой способ)": "(any way)",
    "Сообщение": "Message", "(необязательно)": "(optional)", "Записаться на показ": "Book a viewing",
    "Ответим в течение часа. Без спама.": "We'll reply within an hour. No spam.",
    // footer
    "Контакты": "Contacts", "Цена": "Price", "от $850 000": "from $850,000",
    "Напрямую от собственника, без комиссии агента.": "Directly from the owner, no agent commission."
  };

  var ID = {
    "Объект": "Properti", "Галерея": "Galeri", "Планировки": "Denah",
    "Инвестиции": "Investasi", "Частный показ": "Viewing privat", "Резиденция": "Residence",
    "Унгасан · Букит · Бали": "Ungasan · Bukit · Bali",
    "Вилла на Буките": "Vila di Bukit", "с доходностью": "dengan hasil", "12–15% годовых": "12–15% per tahun",
    "4 спальни, панорамная крыша 360° с видом на океан и открытый бассейн. Под ключ — напрямую от собственника, без комиссии агента.":
      "4 kamar tidur, rooftop panorama 360° dengan pemandangan laut dan kolam renang terbuka. Siap huni — langsung dari pemilik, tanpa komisi agen.",
    "Запросить частный показ": "Minta viewing privat",
    "Готова к жизни и аренде": "Siap dihuni dan disewakan",
    "Четыре уровня вокруг света и вида. Сдана в 2018-м, передаётся под ключ — мебель, техника и система Sonos уже внутри. Заезжайте или сдавайте с первого дня.":
      "Empat tingkat yang tertata mengikuti cahaya dan pemandangan. Selesai 2018, diserahkan siap huni — furnitur, peralatan, dan sistem Sonos sudah di dalam. Tinggal masuk atau langsung disewakan.",
    "дом": "rumah", "участок": "tanah", "спальни": "kamar tidur", "санузлов": "kamar mandi", "крыша": "rooftop", "год": "tahun",
    "Видеотур": "Video tur", "Дом за одну минуту": "Rumah dalam satu menit",
    "Крыша 360°, интерьеры, бассейн и линия океана — с воздуха и внутри. Без монтажных трюков.":
      "Rooftop 360°, interior, kolam, dan garis laut — dari udara dan dari dalam. Tanpa trik editing.",
    "Интерьеры": "Interior", "Пространства, открытые океану": "Ruang yang terbuka ke laut",
    "Листайте кадры в каждой зоне. Дом передаётся под ключ — с мебелью и техникой.":
      "Geser foto di tiap area. Rumah diserahkan siap huni — lengkap dengan furnitur dan peralatan.",
    "Кинотеатр-гостиная": "Ruang keluarga & home cinema",
    "Открытая гостиная с домашним кинотеатром: стекло в пол, мягкий свет и выход на террасу с океаном.":
      "Ruang keluarga terbuka dengan home cinema: kaca dari lantai ke langit-langit, cahaya lembut, dan akses ke teras menghadap laut.",
    "Кухня и столовая": "Dapur & ruang makan",
    "Остров, техника премиум и обеденная зона с выходом к бассейну и панораме.":
      "Island dapur, peralatan premium, dan area makan dengan akses ke kolam dan panorama.",
    "Спальни и сьюты": "Kamar tidur & suite",
    "Спальни-сьюты с гардеробными и ванными. Тёплый камень, дерево и мягкий свет.":
      "Suite kamar tidur dengan walk-in closet dan kamar mandi. Batu hangat, kayu, dan cahaya lembut.",
    "Резиденция вблизи": "Residence dari dekat",
    "Каждый ракурс — аргумент: архитектура, свет и океан, снятые честно, без рендеров. Ровно то, что вы получаете за $850 000.":
      "Setiap sudut adalah argumen: arsitektur, cahaya, dan laut — difoto apa adanya, tanpa render. Persis seperti yang Anda dapatkan seharga $850.000.",
    "Оснащение": "Fasilitas", "Всё уже в доме": "Semua sudah ada di rumah",
    "От кинотеатра до мультирум-звука — вилла укомплектована под ключ. Заезжайте или сдавайте: докупать ничего не нужно.":
      "Dari home cinema sampai audio multiroom — vila lengkap dan siap huni. Tinggal masuk atau disewakan: tak perlu beli apa pun lagi.",
    "Домашний кинотеатр": "Home cinema", "Большой экран и акустика": "Layar besar & sound system",
    "Панорамный бассейн": "Kolam panorama", "Вдоль линии океана": "Menghadap garis laut",
    "Крыша 360°": "Rooftop 360°", "Океан, GWK и Агунг": "Laut, GWK & Gunung Agung",
    "Звук Sonos": "Audio Sonos", "Мультирум во всём доме": "Multiroom di seluruh rumah",
    "Кухня под ключ": "Dapur siap pakai", "Техника премиум": "Peralatan premium",
    "Климат-контроль": "Pendingin udara", "Во всех комнатах": "Di semua ruangan",
    "Гараж на 2 авто": "Garasi 2 mobil", "Крытая парковка": "Parkir tertutup",
    "Блок персонала": "Ruang staf", "Кухня, спальня, санузел": "Dapur, kamar, kamar mandi",
    "Сад и озеленение": "Taman & lanskap", "Ландшафт по периметру": "Lanskap di sekeliling",
    "Полная меблировка": "Furnitur lengkap", "Мебель и техника включены": "Furnitur & peralatan termasuk",
    "Скоростной интернет": "Internet cepat", "Оптика и Wi-Fi": "Fiber & Wi-Fi",
    "Охрана и сервис": "Keamanan & layanan", "Уборка, бассейн, охрана": "Kebersihan, kolam, keamanan",
    "Четыре уровня — листайте как книгу": "Empat tingkat — buka seperti buku",
    "Оригинальные чертежи архитектора, уровень за уровнем — 1:100, без рендеров. Листайте страницы как книгу или выберите этаж слева.":
      "Gambar asli arsitek, tingkat demi tingkat — 1:100, tanpa render. Buka halaman seperti buku atau pilih lantai di kiri.",
    "Вход · сервис · бассейн": "Pintu masuk · servis · kolam", "Гостиная · кухня · мастер": "Ruang keluarga · dapur · master",
    "Спальни · сьюты": "Kamar tidur · suite",
    "оригинал · 1:100": "asli · 1:100", "увеличить +": "perbesar +", "Назад": "Kembali", "‹ Назад": "‹ Kembali", "Листать": "Geser", "м²": "m²",
    "Уровень 01": "Lantai 01", "Уровень 02": "Lantai 02", "Уровень 03": "Lantai 03", "Уровень 04": "Lantai 04",
    "— въезд, гараж на 2 авто, блок персонала, входная галерея, сад и бассейн.": "— pintu masuk, garasi 2 mobil, ruang staf, galeri masuk, taman, dan kolam.",
    "— гостиная с кинотеатром, кухня-столовая и мастер-спальня; выход на террасу к бассейну.": "— ruang keluarga dengan home cinema, area dapur-makan, dan kamar utama; akses teras ke kolam.",
    "— спальни-сьюты с гардеробными и ванными; кабинет, тёплый камень и дерево.": "— suite kamar tidur dengan walk-in closet dan kamar mandi; ruang kerja, batu hangat, dan kayu.",
    "— панорамная крыша 360°: террасы, gazebo, виды на океан, GWK и гору Агунг.": "— rooftop panorama 360°: teras, gazebo, pemandangan laut, GWK, dan Gunung Agung.",
    "Jl. Awar Awar, Унгасан,": "Jl. Awar Awar, Ungasan,", "Кута Селатан, Бадунг, Бали 80361": "Kuta Selatan, Badung, Bali 80361",
    "Jl. Awar Awar, Унгасан, Кута Селатан, Бадунг, Бали": "Jl. Awar Awar, Ungasan, Kuta Selatan, Badung, Bali",
    "Уровень 01 · Ground floor": "Lantai 01 · Ground floor", "Уровень 02 · First floor": "Lantai 02 · First floor",
    "Уровень 03 · Second floor": "Lantai 03 · Second floor", "Уровень 04 · Roof top": "Lantai 04 · Roof top",
    "Уровень 01 — въезд, гараж на 2 авто, блок персонала, входная галерея, сад и бассейн.":
      "Lantai 01 — pintu masuk, garasi 2 mobil, ruang staf, galeri masuk, taman, dan kolam.",
    "Локация": "Lokasi", "Унгасан — тихая вершина Букита": "Ungasan — puncak tenang di Bukit",
    "Южная вершина Букита — скалы, белые пляжи и закаты над океаном. Пляжи, гольф и рестораны в нескольких минутах; до аэропорта — минут 25.":
      "Ujung selatan Bukit — tebing, pantai putih, dan matahari terbenam di laut. Pantai, golf, dan restoran beberapa menit saja; sekitar 25 menit ke bandara.",
    "Jl. Awar Awar, Унгасан, Кута Селатан, Бадунг, Бали 80361": "Jl. Awar Awar, Ungasan, Kuta Selatan, Badung, Bali 80361",
    "Проложить маршрут": "Rute ke vila", "Открыть в Google Maps": "Buka di Google Maps",
    "Гольф-клуб": "Klub golf", "Пляж Джимбаран": "Pantai Jimbaran", "Пляж Меласти": "Pantai Melasti",
    "Пляж Пандава": "Pantai Pandawa", "Аэропорт Нгурах-Рай": "Bandara Ngurah Rai",
    "7 мин": "7 mnt", "8 мин": "8 mnt", "13 мин": "13 mnt", "15 мин": "15 mnt",
    "16 мин": "16 mnt", "17 мин": "17 mnt", "25 мин": "25 mnt", "30 мин": "30 mnt",
    "Время в пути — на авто, ориентировочно.": "Waktu tempuh dengan mobil, perkiraan.",
    "Доход, подтверждённый договорами": "Pendapatan yang didukung kontrak",
    "Букит — самый востребованный юг Бали. Вилла под ключ и готова к аренде с первого дня; цифры подтверждают реальные договоры.":
      "Bukit adalah selatan Bali yang paling dicari. Vila siap huni dan siap disewakan sejak hari pertama; angkanya didukung kontrak nyata.",
    "доходность, чистыми": "hasil bersih", "загрузка в год": "okupansi / tahun",
    "лет окупаемость": "thn balik modal", "цена входа": "harga beli",
    "Рассчитайте доход от аренды": "Hitung pendapatan sewa",
    "Иллюстративно · при текущих допущениях": "Ilustratif · pada asumsi saat ini",
    "Ставка за ночь": "Tarif per malam", "Загрузка": "Okupansi",
    "валовой доход / год": "pendapatan kotor / tahun", "чистыми / год ≈": "bersih / tahun ≈",
    "доходность": "hasil", "окупаемость": "balik modal",
    "Расчёт после расходов и управления (≈45% от валового). Реальные договоры аренды и точные цифры — приватно на встрече.":
      "Dihitung setelah biaya dan manajemen (≈45% dari kotor). Kontrak sewa nyata dan angka pasti — secara pribadi saat pertemuan.",
    "Запросить цифры и договоры": "Minta angka & kontrak",
    "Собственность и право": "Kepemilikan & hak",
    "Чистое право — оформление под любого покупателя": "Hak bersih — untuk setiap pembeli",
    "Объект передаётся в одном из легальных форматов — в зависимости от того, гражданин вы Индонезии или иностранный покупатель. Структуру и сроки подтверждает лицензированный нотариус (PPAT) на сделке.":
      "Properti dialihkan dalam salah satu format legal — tergantung apakah Anda warga negara Indonesia atau pembeli asing. Struktur dan jangka waktunya dikonfirmasi oleh notaris berlisensi (PPAT) saat transaksi.",
    "Полная собственность": "Kepemilikan penuh", "Граждане Индонезии": "Warga negara Indonesia",
    "Фрихолд — право собственности без срока, высшая форма владения землёй и домом.":
      "Freehold — kepemilikan tanpa batas waktu, bentuk kepemilikan tanah dan rumah tertinggi.",
    "Право пользования": "Hak untuk memakai", "Иностранцы · физлицо": "Asing · perorangan",
    "Именное право пользования, продлеваемое по закону — суммарно до ~80 лет по действующим нормам.":
      "Hak pakai atas nama pribadi, dapat diperpanjang sesuai hukum — total hingga ~80 tahun menurut aturan saat ini.",
    "Владение через компанию": "Kepemilikan via perusahaan", "Иностранцы · юрлицо": "Asing · badan usaha",
    "Оформление на вашу индонезийскую компанию (PT PMA) — частый формат для инвесторов.":
      "Atas nama perusahaan Indonesia Anda (PT PMA) — format umum bagi investor.",
    "Полный пакет документов и проверку титула предоставляем на частном показе. Точный формат, сроки и комплект бумаг фиксирует лицензированный нотариус (PPAT) — напрямую, без посредников.":
      "Paket dokumen lengkap dan pengecekan titel kami berikan saat viewing privat. Format pasti, jangka waktu, dan berkas ditetapkan oleh notaris berlisensi (PPAT) — langsung, tanpa perantara.",
    "Документы и доверие": "Dokumen & kepercayaan", "Чистая и прозрачная сделка": "Transaksi bersih & transparan",
    "Прямая продажа от собственника под сопровождением лицензированного нотариуса. Полный пакет документов и подтверждение дохода предоставляем приватно — по индивидуальному запросу.":
      "Penjualan langsung dari pemilik, didampingi notaris berlisensi. Paket dokumen lengkap dan bukti pendapatan diberikan secara pribadi — atas permintaan.",
    "Запросить документы": "Minta dokumen",
    "Напрямую от собственника": "Langsung dari pemilik",
    "Без агентов и комиссий: договор и переговоры — напрямую с владельцем.":
      "Tanpa agen atau komisi: kontrak dan negosiasi langsung dengan pemilik.",
    "Сопровождение нотариуса (PPAT)": "Pendampingan notaris (PPAT)",
    "Лицензированный нотариус проверяет титул и регистрирует сделку по закону Индонезии.":
      "Notaris berlisensi memverifikasi titel dan mendaftarkan transaksi sesuai hukum Indonesia.",
    "Доход подтверждён договорами": "Pendapatan didukung kontrak",
    "Реальные договоры аренды показываем приватно — с защитой персональных данных.":
      "Kami tunjukkan kontrak sewa nyata secara pribadi — dengan data pribadi dilindungi.",
    "Документы — по запросу": "Dokumen atas permintaan",
    "Полный пакет предоставляем индивидуально: для вас и вашего юриста.":
      "Paket lengkap kami berikan secara individual: untuk Anda dan pengacara Anda.",
    "Вопросы": "FAQ", "Коротко о главном": "Inti singkatnya",
    "Кто может купить — иностранец или гражданин Индонезии?": "Siapa yang bisa membeli — asing atau WNI?",
    "Оформляем под любого покупателя. Гражданам Индонезии — SHM (полная собственность). Иностранцам — Hak Pakai на физлицо или HGB через вашу компанию (PT PMA). Форму и сроки подтверждает лицензированный нотариус (PPAT).":
      "Bisa untuk pembeli mana pun. WNI — SHM (kepemilikan penuh). Asing — Hak Pakai atas nama pribadi atau HGB via perusahaan Anda (PT PMA). Bentuk dan jangka waktunya dikonfirmasi notaris berlisensi (PPAT).",
    "Что входит в цену $850 000?": "Apa yang termasuk dalam harga $850.000?",
    "Вилла под ключ: 4 спальни, 5+ санузлов, бассейн, домашний кинотеатр, крыша 360°, кухня с техникой, система Sonos, мебель, гараж на 2 авто и блок персонала. Заезжайте или сдавайте — докупать ничего не нужно.":
      "Vila siap huni: 4 kamar tidur, 5+ kamar mandi, kolam, home cinema, rooftop 360°, dapur lengkap, sistem Sonos, furnitur, garasi 2 mobil, dan ruang staf. Tinggal masuk atau disewakan — tak perlu beli apa pun lagi.",
    "Какой доход и чем он подтверждён?": "Berapa pendapatannya dan apa buktinya?",
    "Консервативно — 12–15% чистыми в год при загрузке около 70%. Доход подтверждают реальные договоры аренды; показываем их приватно на встрече, с защитой персональных данных.":
      "Secara konservatif — 12–15% bersih per tahun dengan okupansi sekitar 70%. Pendapatan didukung kontrak sewa nyata; kami tunjukkan secara pribadi saat pertemuan, dengan data pribadi dilindungi.",
    "Есть ли комиссия агента?": "Apakah ada komisi agen?",
    "Нет. Продажа напрямую от собственника — без агентских комиссий. Сделку сопровождает лицензированный нотариус.":
      "Tidak. Penjualan langsung dari pemilik — tanpa komisi agen. Transaksi didampingi notaris berlisensi.",
    "Как проходит сделка и сколько занимает?": "Bagaimana proses transaksinya dan berapa lama?",
    "Проверка документов → договор у нотариуса (PPAT) → регистрация. Точные сроки и комплект бумаг фиксирует нотариус; полный пакет предоставляем по индивидуальному запросу.":
      "Pengecekan dokumen → akta di notaris (PPAT) → pendaftaran. Jangka waktu pasti dan berkas ditetapkan notaris; paket lengkap atas permintaan.",
    "Можно посмотреть виллу онлайн и лично?": "Bisakah melihat vila online dan langsung?",
    "Да. Организуем онлайн-показ по видео и личный просмотр на месте. Напишите в WhatsApp — подберём удобное время.":
      "Ya. Kami atur viewing online via video dan kunjungan langsung di lokasi. Hubungi via WhatsApp — kami carikan waktu yang cocok.",
    "Посмотрите виллу лично": "Lihat vila secara langsung",
    "Онлайн-показ по видео или личный визит в Унгасане. Оставьте контакт — ответим в течение часа и подберём удобное время.":
      "Viewing online via video atau kunjungan langsung di Ungasan. Tinggalkan kontak — kami balas dalam satu jam dan carikan waktu yang cocok.",
    "Имя": "Nama", "Связь с вами": "Kontak Anda", "(любой способ)": "(cara apa pun)",
    "Сообщение": "Pesan", "(необязательно)": "(opsional)", "Записаться на показ": "Pesan viewing",
    "Ответим в течение часа. Без спама.": "Kami balas dalam satu jam. Tanpa spam.",
    "Контакты": "Kontak", "Цена": "Harga", "от $850 000": "mulai $850.000",
    "Напрямую от собственника, без комиссии агента.": "Langsung dari pemilik, tanpa komisi agen."
  };

  var DICT = { en: EN, id: ID };

  /* placeholders (translated separately — they aren't text nodes) */
  var PH = {
    en: { "Как к вам обращаться": "Your name", "WhatsApp, Telegram или e-mail": "WhatsApp, Telegram or e-mail", "Когда удобно, ваши вопросы…": "When suits you, your questions…" },
    id: { "Как к вам обращаться": "Nama Anda", "WhatsApp, Telegram или e-mail": "WhatsApp, Telegram, atau e-mail", "Когда удобно, ваши вопросы…": "Waktu yang cocok, pertanyaan Anda…" }
  };

  /* ============ ENGINE ============ */
  function norm(s) { return s.replace(/\s+/g, " ").trim(); }

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, svg: 1, SVG: 1 };
  var nodes = null; // cached translatable text nodes [{node, orig}]

  function collect() {
    nodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !norm(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== document.body) {
          if (p.id === "plnCap" || SKIP[p.nodeName] || (p.classList && (p.classList.contains("nav__lang") || p.classList.contains("monogram") || p.classList.contains("loader__mono")))) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) nodes.push({ node: n, orig: n.nodeValue });
  }

  function translateNode(item, lang) {
    var raw = item.orig;
    if (lang === "ru") { item.node.nodeValue = raw; return; }
    var key = norm(raw);
    var tr = DICT[lang] && DICT[lang][key];
    if (tr == null) { item.node.nodeValue = raw; return; }
    var lead = (raw.match(/^\s*/) || [""])[0];
    var trail = (raw.match(/\s*$/) || [""])[0];
    item.node.nodeValue = lead + tr + trail;
  }

  // translate the current text of a JS-updated element (reads live content, not a cache)
  function retranslateEl(el) {
    if (!el || CUR === "ru") return;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      var t = norm(n.nodeValue); if (!t) continue;
      var tr = DICT[CUR] && DICT[CUR][t];
      if (tr != null) { var l = (n.nodeValue.match(/^\s*/) || [""])[0], r = (n.nodeValue.match(/\s*$/) || [""])[0]; n.nodeValue = l + tr + r; }
    }
  }
  // calculator payback/yield are JS-set in RU ("7,4 года", "13,5%") — localize suffix + decimal
  function fixCalc() {
    if (CUR === "ru") return;
    var pay = document.getElementById("invPay");
    if (pay && /года|лет|год/.test(pay.textContent)) {
      var t = pay.textContent.replace(/\s*(года|лет|год)\s*$/, CUR === "en" ? " yrs" : " thn");
      if (CUR === "en") t = t.replace(",", ".");
      pay.textContent = t;
    }
    if (CUR === "en") {
      var yl = document.getElementById("invYield");
      if (yl && yl.textContent.indexOf(",") > -1) yl.textContent = yl.textContent.replace(",", ".");
    }
  }

  function setPlaceholders(lang) {
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(function (el) {
      if (!el.dataset.phOrig) el.dataset.phOrig = el.getAttribute("placeholder");
      var o = el.dataset.phOrig;
      el.setAttribute("placeholder", lang === "ru" ? o : ((PH[lang] && PH[lang][o]) || o));
    });
  }

  // classify a WhatsApp button by its ORIGINAL prefilled text so we keep its intent per language
  function waType(orig) {
    var t = (orig || "").toLowerCase();
    if (/договор|доход|contract|income|figures|kontrak|pendapatan/.test(t)) return "income";
    if (/документ|document|dokumen/.test(t)) return "docs";
    if (/показ|viewing|kunjungan|visit/.test(t)) return "viewing";
    return "greeting";
  }
  function setWaLinks(lang) {
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
      if (!a.dataset.waType) {
        var cur = ""; try { cur = decodeURIComponent((a.href.split("text=")[1] || "")); } catch (e) {}
        a.dataset.waType = waType(cur);
      }
      var m = WA_MSGS[a.dataset.waType] || WA_MSGS.greeting;
      a.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(m[lang] || m.ru);
    });
  }

  function setLangButtons(lang) {
    document.querySelectorAll(".nav__lang").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("is-active", b.textContent.trim().toLowerCase() === lang);
      });
    });
  }

  var CUR = "ru";
  function apply(lang) {
    CUR = lang;
    if (!nodes) collect();
    for (var i = 0; i < nodes.length; i++) translateNode(nodes[i], lang);
    retranslateEl(document.getElementById("plnCap"));
    fixCalc();
    setPlaceholders(lang);
    setWaLinks(lang);
    setLangButtons(lang);
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);
  }

  function isLang(l) { return l === "ru" || l === "en" || l === "id"; }
  function langFromPath() {
    var m = (location.pathname || "").match(/\/(en|id|ru)(\/|$)/i);
    return m ? m[1].toLowerCase() : "";
  }
  function detect() {
    // 1) URL language folder (/en/ /id/ /ru/) or shell-forced var = authoritative
    if (isLang(window.WV_FORCE_LANG)) return window.WV_FORCE_LANG;
    var p = langFromPath(); if (p) return p;
    // 2) a returning visitor's explicit choice
    var saved; try { saved = localStorage.getItem("wv_lang"); } catch (e) {}
    if (isLang(saved)) return saved;
    // 3) English is the default language (no browser auto-detect)
    return "en";
  }

  /* ============ MutationObserver: re-translate JS-set captions ============ */
  function observe() {
    var cap = document.getElementById("plnCap");
    if (cap) {
      retranslateEl(cap);
      new MutationObserver(function () { retranslateEl(cap); }).observe(cap, { childList: true, subtree: true, characterData: true });
    }
    var pay = document.getElementById("invPay");
    if (pay) {
      fixCalc();
      var box = pay.closest("section") || pay.parentNode;
      new MutationObserver(fixCalc).observe(box, { childList: true, subtree: true, characterData: true });
    }
  }

  /* ============ POPUP ============ */
  function ensurePopup() {
    if (document.getElementById("wvPop")) return;
    var d = document.createElement("div");
    d.className = "wv-pop"; d.id = "wvPop"; d.setAttribute("aria-hidden", "true");
    d.innerHTML =
      '<div class="wv-pop__card" role="dialog" aria-modal="true">' +
      '<span class="wv-pop__mono">W<span>V</span></span>' +
      '<div class="wv-pop__check" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></div>' +
      '<h3 class="wv-pop__t"></h3><p class="wv-pop__b"></p>' +
      '<button class="btn btn--accent wv-pop__c" type="button"></button>' +
      '</div>';
    document.body.appendChild(d);
    function close() { d.classList.remove("is-open"); d.setAttribute("aria-hidden", "true"); }
    d.addEventListener("click", function (e) { if (e.target === d) close(); });
    d.querySelector(".wv-pop__c").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function showPopup() {
    ensurePopup();
    var p = POPUP[CUR] || POPUP.ru, d = document.getElementById("wvPop");
    d.querySelector(".wv-pop__t").textContent = p.t;
    d.querySelector(".wv-pop__b").textContent = p.b;
    d.querySelector(".wv-pop__c").textContent = p.c;
    d.classList.add("is-open"); d.setAttribute("aria-hidden", "false");
  }

  /* ============ FORM ============ */
  function leadText(name, contact, msg) {
    var L = LEAD_LABELS[CUR] || LEAD_LABELS.ru;
    var t = "🏝️ " + L.head + "\n" + L.name + ": " + name + "\n" + L.contact + ": " + contact;
    if (msg) t += "\n" + L.msg + ": " + msg;
    return t;
  }
  function wireForm() {
    var form = document.getElementById("bookForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.name && form.name.value || "").trim();
      var contact = (form.contact && form.contact.value || "").trim();
      var msg = (form.msg && form.msg.value || "").trim();
      var company = (form.company && form.company.value || "").trim(); // honeypot
      var ok = true;
      [form.name, form.contact].forEach(function (f) {
        if (f) { var bad = !f.value.trim(); f.closest(".field").classList.toggle("is-err", bad); if (bad) ok = false; }
      });
      if (!ok) { return; }
      if (company) { showPopup(); form.reset(); return; } // bot filled hidden field — drop silently
      var text = leadText(name, contact, msg);
      if (LEAD_ENDPOINT) {
        // secure relay → Telegram group (token hidden server-side)
        fetch(LEAD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, contact: contact, msg: msg, lang: CUR, company: company, text: text }) }).catch(function () {});
      } else {
        // fallback until relay deployed: open WhatsApp with the lead so it isn't lost
        window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text), "_blank");
      }
      track("generate_lead", "Lead"); // analytics: form lead conversion (GA4 + Pixel + Metrica)
      showPopup();
      form.reset();
    });
  }

  /* ============ LANG SWITCH WIRING ============ */
  function go(l) {
    if (!isLang(l)) return;
    try { localStorage.setItem("wv_lang", l); } catch (e) {} // remember explicit choice
    apply(l);
    track("lang_" + l); // analytics: language switch
    // reflect the language in the URL bar: /en/ /id/ /ru/ (only when served with lang folders)
    if (window.WV_LANG_ROUTING) {
      try { history.pushState({ lang: l }, "", "/" + l + "/" + (location.hash || "")); } catch (e) {}
    }
  }
  function wireSwitch() {
    document.querySelectorAll(".nav__lang button").forEach(function (b) {
      b.addEventListener("click", function () { go(b.textContent.trim().toLowerCase()); });
    });
    window.addEventListener("popstate", function (e) {
      var l = (e.state && e.state.lang) || langFromPath() || detect();
      if (isLang(l)) apply(l);
    });
  }

  /* ============ ANALYTICS EVENTS (GA4 + Meta Pixel + Yandex Metrica) ============ */
  // One call → GA4 event + Yandex Metrica goal (same name) + Meta Pixel.
  // fbStd = a Meta STANDARD event (Lead / Contact / ViewContent) for conversions; omit → Pixel custom event.
  function track(name, fbStd) {
    try { if (window.gtag) gtag("event", name); } catch (e) {}
    try { if (window.fbq) { fbStd ? fbq("track", fbStd) : fbq("trackCustom", name); } } catch (e) {}
    try { if (window.ym) ym(110156693, "reachGoal", name); } catch (e) {}
  }
  function wireTracking() {
    // Form: first focus = user started a request (funnel step before the submit)
    var form = document.getElementById("bookForm");
    if (form) {
      var fStarted = false;
      form.addEventListener("focusin", function () {
        if (!fStarted) { fStarted = true; track("form_start"); }
      });
    }
    // Investment calculator: first interaction
    var calcSent = false;
    ["invRate", "invOcc"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", function () {
        if (!calcSent) { calcSent = true; track("calculator_use"); }
      });
    });
    // Delegated click tracking — covers EVERY button/link (capture phase → always fires, even if an
    // inner handler stops propagation). Each branch returns so events are never double-counted.
    document.addEventListener("click", function (e) {
      var n = e.target;
      var a = n && n.closest ? n.closest('a[href], button, .gal__item, .pln__planimg, .vid__play, #tourMedia') : null;
      if (!a) return;
      var href = (a.getAttribute && a.getAttribute("href")) || "";
      // 1) Contact conversions (Meta standard "Contact")
      if (href.indexOf("wa.me") > -1 || href.indexOf("api.whatsapp") > -1) return track("whatsapp_click", "Contact");
      if (href.indexOf("t.me") > -1 || href.indexOf("telegram.me") > -1) return track("telegram_click", "Contact");
      // 2) Language buttons are tracked in go() — skip here
      if (a.closest(".nav__lang")) return;
      // 3) Primary CTA → private-viewing intent
      if (href === "#contact" || (a.classList && a.classList.contains("nav__cta"))) return track("cta_viewing");
      // 4) Content engagement (strongest signals = Meta standard "ViewContent")
      if (a.closest(".vid__play, #tourMedia")) return track("video_play", "ViewContent");
      if (a.closest(".gal__item")) return track("gallery_open", "ViewContent");
      if (a.closest(".pln__planimg")) return track("plan_zoom", "ViewContent");
      if (a.closest("#plnLevels, #plnPrev, #plnNext, .pln__mag")) return track("plans_browse");
      if (a.closest(".sld__btn")) return track("interiors_swipe");
      if (a.closest(".loc__actions")) return track("map_click");
      if (a.closest(".faq__q")) return track("faq_open");
      if (a.id === "navBurger" || a.closest("#navBurger")) return track("menu_open");
      if (a.closest(".nav__links, .nav__panel-links")) return track("nav_click");
      // 5) Fallback: any remaining <button> or .btn → so no button goes uncounted
      if (a.tagName === "BUTTON" || (a.classList && a.classList.contains("btn"))) return track("button_click");
    }, true);
  }

  /* ============ INIT ============ */
  function init() {
    collect();
    apply(detect());
    observe();
    wireForm();
    wireSwitch();
    wireTracking();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
