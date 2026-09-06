/**
 * Interface text in English and Spanish.
 *
 * One flat dictionary keyed by a stable identifier. English is the source
 * of truth: a key missing from the Spanish set falls back to English
 * rather than rendering an empty string or the key itself, so a partial
 * translation degrades to a readable page instead of a broken one.
 *
 * Only interface text lives here. Listing titles, seller descriptions and
 * anything else that comes from eBay is never translated: it is other
 * people's words, shown as written.
 */

export type Language = 'en' | 'es';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
];

const en = {
  // --- Shell ---
  'nav.discover': 'Discover',
  'nav.search': 'Search',
  'nav.saved': 'Saved',
  'nav.settings': 'Settings',
  'nav.skip': 'Skip to content',
  'nav.main': 'Main',
  'status.checking': 'Checking',
  'status.connected': 'Connected',
  'status.notConnected': 'Not connected',
  'status.updated': 'Updated {time}',

  // --- Discover ---
  'discover.title': 'Start with what you can spend',
  'discover.intro':
    'Set your limits, then scan a category to see what is currently listed below what the rest of the market is asking. You do not need to know the products: each category explains what makes it worth a look and what to check before you buy.',
  'discover.limits': 'Your limits',
  'discover.limitsNote': 'Used by every scan',
  'discover.maxPrice': 'Maximum purchase price',
  'discover.maxPriceHint': 'The most you will pay for one item.',
  'discover.minProfit': 'Minimum profit',
  'discover.minProfitHint': 'After every fee and cost.',
  'discover.minReturn': 'Minimum return',
  'discover.minReturnHint': 'Profit as a share of what you pay out.',
  'discover.condition': 'Condition',
  'discover.preferences': 'Preferences',
  'discover.collect': 'I can collect locally',
  'discover.collectHint': 'Includes listings offering collection, which are often cheaper.',
  'discover.smallParcels': 'Prefer small parcels',
  'discover.smallParcelsHint': 'Favours categories that post cheaply.',
  'discover.easyTest': 'Prefer items that are easy to test',
  'discover.easyTestHint': 'Favours things you can check works in a minute.',
  'discover.whereToStart': 'Where to start looking',
  'discover.suggestionsTitle': 'These are suggestions, not findings',
  'discover.suggestionsBody':
    'The categories below are hand written starting points chosen because they are easy to identify and check. Nothing here claims that a product is in demand or that it sells for a particular price. Numbers only appear once you run a scan, and they come from what is listed right now.',
  'discover.startingPoint': 'Starting point, not evidence',
  'discover.whatDecides': 'What decides it:',
  'discover.scanCategory': 'Scan this category',
  'discover.scanning': 'Scanning',
  'discover.scanFinished': 'Scan finished',
  'discover.searchesProgress': '{done} of {total} searches',
  'discover.worthALook': '{count} worth a look',
  'discover.queued': 'queued',
  'discover.searching': 'searching',
  'discover.failedNote':
    '{count} searches did not complete. The results below cover the rest.',

  // --- Search ---
  'search.title': 'Search',
  'search.intro':
    'Look up a product, or paste an eBay listing link to review one listing against its own market.',
  'search.placeholder': 'Product name, or paste an eBay listing link',
  'search.ariaLabel': 'Search term or eBay listing link',
  'search.scan': 'Scan',
  'search.scanning': 'Scanning',
  'search.filters': 'Filters',
  'search.clearFilters': 'Clear filters',
  'search.moreFilters': 'More filters',
  'search.whatYouBuy': 'What you will buy',
  'search.whichListings': 'Which listings',
  'search.comparisonSet': 'Comparison set',
  'search.comparisonHint':
    'Bounds the listings used to work out what the item is worth. Leave both blank unless a search is pulling in a different class of product entirely.',
  'search.maxPurchaseHint':
    'Applies to the listings you see, not to the market they are compared against.',
  'search.format': 'Buying format',
  'search.delivery': 'Delivery',
  'search.exclude': 'Exclude keywords',
  'search.excludeHint': 'Comma separated. Any title containing one is dropped.',
  'search.depth': 'Search depth',
  'search.comparisonFrom': 'Comparison price from',
  'search.comparisonTo': 'Comparison price to',
  'search.ready': 'Ready when you are',
  'search.readyBody':
    'Enter a product above, or start from a category on Discover if you are not sure what to look for.',
  'search.viewExample': 'View example results',
  'search.showExcluded': 'Show excluded ({count})',
  'search.worthALook': '{count} worth a look',

  // --- Results ---
  'results.product': 'Product',
  'results.totalCost': 'Total cost',
  'results.profit': 'Est. profit',
  'results.roi': 'ROI',
  'results.maxPrice': 'Max price',
  'results.actions': 'Actions',
  'results.save': 'Save',
  'results.saved': 'Saved',
  'results.details': 'Details',
  'results.openEbay': 'Open on eBay',
  'results.nothingMatches': 'Nothing matches your criteria',
  'results.nothingMatchesBody':
    'Every listing was either excluded or fell short of your profit and return targets. Turn on "Show excluded" to see them and why.',
  'results.excludedBecause': 'Excluded: {reason}',
  'results.ifWon': 'if won at this bid',
  'results.incDelivery': 'inc. delivery',
  'results.freeDelivery': 'free delivery',
  'results.deliveryUnknown': 'delivery unknown',
  'results.conditionUnknown': 'Condition not stated',

  // --- Summary ---
  'summary.scanned': 'Listings scanned',
  'summary.comparable': '{count} comparable',
  'summary.notProduct': ', {count} not the product',
  'summary.reference': 'Reference value',
  'summary.referenceNote': 'asking prices, not sold prices',
  'summary.range': 'Usual asking range',
  'summary.midpoint': 'midpoint {value}',
  'summary.evidence': 'Evidence',
  'summary.meetCriteria': '{passing} of {total} meet your criteria',
  'summary.basedOn': 'What this is based on',
  'summary.cannotTell': 'What this cannot tell you',
  'summary.setAside': 'Listings set aside',
  'summary.setAsideNote':
    'These were kept out of the reference price because they are not the product itself. Hover any one for the reason.',
  'summary.apiCalls': '{count} API calls',
  'summary.fromCache': 'from cache',
  'summary.exampleData': 'example data',
  'evidence.reasonable': 'Reasonable evidence',
  'evidence.moderate': 'Moderate evidence',
  'evidence.limited': 'Limited evidence',

  // --- States ---
  'state.setupTitle': 'eBay connection needs setup',
  'state.setupBody':
    'This app has no eBay credentials configured on the server, so it cannot fetch live listings yet. Everything else works: you can see how results look using example data.',
  'state.setupHint':
    'Setting this up is a developer task: the API keys go in the server environment, never in the browser. The steps are in the project README under "eBay developer portal steps".',
  'state.tryAgain': 'Try again',
  'state.exampleTitle': 'These are example results, not live listings',
  'state.exampleBody':
    'Realistic figures run through the real calculation, so you can see how everything fits together. Nothing here is for sale.',
  'state.exitExample': 'Exit example',
  'state.searching': 'Searching eBay',

  // --- Saved ---
  'saved.title': 'Saved',
  'saved.intro': 'Opportunities you shortlisted, with your own notes and where you got to.',
  'saved.empty': 'Nothing saved yet',
  'saved.emptyBody':
    'When a listing looks worth a second look, save it. You can add notes, mark it Interested, Purchased or Passed, and re-check the price later.',
  'saved.interested': 'Interested',
  'saved.purchased': 'Purchased',
  'saved.passed': 'Passed',
  'saved.browserOnly': 'Saved in this browser only',
  'saved.browserOnlyBody':
    'There is no account and no server storage, so this list will not follow you to another device or browser, and clearing site data will erase it. Marking something Purchased is a note to yourself: it never places an order.',
  'saved.notPersisting': 'This browser is not saving your list',
  'saved.notPersistingBody':
    'Storage is blocked or full, so anything you save will disappear when you reload. Private browsing windows often behave this way.',
  'saved.priceThen': 'Price then',
  'saved.profitThen': 'Profit then',
  'saved.roiThen': 'ROI then',
  'saved.maxPrice': 'Max price',
  'saved.refresh': 'Refresh',
  'saved.checking': 'Checking',
  'saved.remove': 'Remove',
  'saved.notePlaceholder': 'Your notes: what to check, what you offered, why you passed…',
  'saved.stale': 'Assessment may be out of date',
  'saved.savedFrom': 'Saved {when} · from "{query}"',

  // --- Settings ---
  'settings.title': 'Settings',
  'settings.regionGroup': 'Region, language and currency',
  'settings.regionGroupIntro':
    'Three separate settings. The region decides what is searched and how fees are charged; the language changes only the words on screen; the currency follows the region.',
  'settings.region': 'eBay region',
  'settings.regionHint':
    'Which eBay site is searched. Also sets the delivery country, the fee rules and the currency.',
  'settings.currency': 'Currency',
  'settings.currencyHint':
    'Follows the region, because prices come from eBay already in that currency. Showing them in another one would need an exchange rate this app does not have, and converting without one would be inventing numbers.',
  'settings.currencyFixed': 'set by the region',
  'settings.marketplace': 'Marketplace',
  'settings.marketplaceIntro':
    'Which eBay site is searched and priced. Fees, currency and delivery all follow this choice.',
  'settings.marketplaceWarning': 'Fees differ by country',
  'settings.marketplaceWarningBody':
    'Each marketplace has its own fee rules. Notably, private sellers pay no final value fee in the UK but do pay one in Spain, so switching country changes every profit figure.',
  'settings.language': 'Language',
  'settings.languageIntro': 'Changes the interface only. Listing text is always shown as written.',
  'settings.howYouSell': 'How you sell',
  'settings.howYouSellIntro':
    'This decides which eBay fees come out of your payout. Private is the default, because private sellers pay no final value fee on eligible domestic sales in the UK.',
  'settings.sellerType': 'Seller type',
  'settings.hint.private.EBAY_GB':
    'No selling fees on eligible domestic sales since 1 October 2024. The Buyer Protection fee is paid by the buyer, so it is never deducted here. Authenticity checked categories and international sales still carry a fee.',
  'settings.hint.private.EBAY_ES':
    'Spanish private sellers DO pay a final value fee: the UK nil fee position does not apply here. A per order fee and a regulatory fee also apply, and the quoted rates already include IVA.',
  'settings.hint.business.EBAY_GB':
    'A category final value fee, a per order fee, a 0.35% regulatory fee, and 20% VAT on all of them.',
  'settings.hint.business.EBAY_ES':
    'A category final value fee, a per order fee, a 0.35% regulatory fee, and 21% IVA on all of them.',
  'settings.business': 'Business',
  'settings.private': 'Private',
  'settings.category': 'Category',
  'settings.categoryHint':
    'Sets the final value fee rate. Change it per search if you scan across different kinds of item.',
  'settings.vatCost': 'Treat VAT on fees as a cost',
  'settings.vatCostHint':
    'Turn this off if you are VAT registered and reclaim it. VAT is still shown, just not deducted.',
  'settings.international': 'Assume an international sale',
  'settings.internationalHint': 'Adds the 3% international fee to every calculation.',
  'settings.feeOverride': 'Final value fee override',
  'settings.feeOverrideHint':
    'If you know your exact rate, put it here. Results calculated with an override say so.',
  'settings.useCategoryRate': 'Use the category rate',
  'settings.yourCosts': 'Your costs per item',
  'settings.yourCostsIntro':
    'Everything you pay out beyond the item itself. These are deducted from every calculation.',
  'settings.postageOut': 'Postage out',
  'settings.packaging': 'Packaging',
  'settings.preparation': 'Preparation',
  'settings.preparationHint': 'Cleaning, batteries, cables.',
  'settings.repair': 'Repair allowance',
  'settings.repairHint': 'Optional, for items you expect to fix.',
  'settings.lossAllowance': 'Loss allowance',
  'settings.lossAllowanceHint':
    'A share of the resale value set aside for returns, damage and items that never sell. Not all of them will work out.',
  'settings.dataSources': 'Data sources',
  'settings.dataSourcesIntro': 'What this app is allowed to use, and what it therefore cannot tell you.',
  'settings.connection': 'Connection',
  'settings.environment': 'Environment',
  'settings.lastRefresh': 'Last successful refresh',
  'settings.notYet': 'not yet',
  'settings.close': 'Close',

  // --- Item details ---
  'item.whatItIs': 'What it is',
  'item.issues': 'Issues found in the listing',
  'item.referenceFrom': 'Where the reference value comes from',
  'item.calculation': 'The profit calculation',
  'item.manualScenario': 'Manual scenario',
  'item.moneyIn': 'Money in',
  'item.moneyOut': 'Money out',
  'item.netReceipts': 'Net receipts',
  'item.itemPrice': 'Item price',
  'item.deliveryToYou': 'Delivery to you',
  'item.totalCost': 'Total cost',
  'item.estimatedProfit': 'Estimated profit',
  'item.profitBasis': 'Trading profit before any tax you owe on it',
  'item.roiBasis': 'Profit ÷ total cost',
  'item.marginBasis': 'Profit ÷ resale value',
  'item.margin': 'Margin',
  'item.mostToPay': 'The most you should pay',
  'item.maxItemPrice': 'Maximum item price',
  'item.maxAllIn': 'Maximum all in',
  'item.tryOwn': 'Try your own resale figure',
  'item.tryOwnLabel': 'If you think it sells for a different amount, enter it here',
  'item.description': "Seller's description",
  'item.beforeYouBuy': 'Before you buy',
  'item.rateUnverified': 'This category rate is unverified',
  'item.notSoldPrices': 'These are asking prices',

  // --- Filter option labels ---
  'condition.any': 'Any condition',
  'condition.new': 'New',
  'condition.refurbished': 'Refurbished',
  'condition.used': 'Used',
  'condition.parts': 'For parts or not working',
  'format.any': 'Any format',
  'format.buyItNow': 'Buy It Now',
  'format.auction': 'Auction',
  'delivery.any': 'Any delivery',
  'delivery.delivered': 'Delivered to me',
  'delivery.collectionAvailable': 'Local collection available',
  'depth.quick': 'Quick',
  'depth.standard': 'Standard',
  'depth.thorough': 'Thorough',

  // --- Provenance ---
  'provenance.source': 'From eBay',
  'provenance.seller': 'Seller says',
  'provenance.calculated': 'Calculated',
  'provenance.yours': 'Your input',
} as const;

export type TranslationKey = keyof typeof en;

const es: Partial<Record<TranslationKey, string>> = {
  'nav.discover': 'Descubrir',
  'nav.search': 'Buscar',
  'nav.saved': 'Guardados',
  'nav.settings': 'Ajustes',
  'nav.skip': 'Saltar al contenido',
  'nav.main': 'Principal',
  'status.checking': 'Comprobando',
  'status.connected': 'Conectado',
  'status.notConnected': 'Sin conexión',
  'status.updated': 'Actualizado {time}',

  'discover.title': 'Empieza por lo que puedes gastar',
  'discover.intro':
    'Fija tus límites y analiza una categoría para ver qué se está vendiendo por debajo de lo que pide el resto del mercado. No necesitas conocer los productos: cada categoría explica por qué merece atención y qué comprobar antes de comprar.',
  'discover.limits': 'Tus límites',
  'discover.limitsNote': 'Se aplican a cada análisis',
  'discover.maxPrice': 'Precio máximo de compra',
  'discover.maxPriceHint': 'Lo máximo que pagarás por un artículo.',
  'discover.minProfit': 'Beneficio mínimo',
  'discover.minProfitHint': 'Después de todas las comisiones y costes.',
  'discover.minReturn': 'Retorno mínimo',
  'discover.minReturnHint': 'Beneficio como porcentaje de lo que desembolsas.',
  'discover.condition': 'Estado',
  'discover.preferences': 'Preferencias',
  'discover.collect': 'Puedo recoger en persona',
  'discover.collectHint': 'Incluye anuncios con recogida, que suelen ser más baratos.',
  'discover.smallParcels': 'Prefiero paquetes pequeños',
  'discover.smallParcelsHint': 'Favorece categorías con envío barato.',
  'discover.easyTest': 'Prefiero artículos fáciles de probar',
  'discover.easyTestHint': 'Favorece cosas que puedes comprobar en un minuto.',
  'discover.whereToStart': 'Por dónde empezar',
  'discover.suggestionsTitle': 'Son sugerencias, no hallazgos',
  'discover.suggestionsBody':
    'Las categorías siguientes son puntos de partida escritos a mano, elegidos porque son fáciles de identificar y comprobar. Nada aquí afirma que un producto tenga demanda ni que se venda a un precio concreto. Las cifras solo aparecen al analizar, y proceden de lo que está publicado ahora mismo.',
  'discover.startingPoint': 'Punto de partida, no evidencia',
  'discover.whatDecides': 'Lo que lo decide:',
  'discover.scanCategory': 'Analizar esta categoría',
  'discover.scanning': 'Analizando',
  'discover.scanFinished': 'Análisis terminado',
  'discover.searchesProgress': '{done} de {total} búsquedas',
  'discover.worthALook': '{count} a tener en cuenta',
  'discover.queued': 'en cola',
  'discover.searching': 'buscando',
  'discover.failedNote':
    '{count} búsquedas no se completaron. Los resultados siguientes cubren el resto.',

  'search.title': 'Buscar',
  'search.intro':
    'Busca un producto o pega el enlace de un anuncio de eBay para analizarlo frente a su propio mercado.',
  'search.placeholder': 'Nombre del producto, o pega un enlace de eBay',
  'search.ariaLabel': 'Término de búsqueda o enlace de eBay',
  'search.scan': 'Analizar',
  'search.scanning': 'Analizando',
  'search.filters': 'Filtros',
  'search.clearFilters': 'Borrar filtros',
  'search.moreFilters': 'Más filtros',
  'search.whatYouBuy': 'Lo que vas a comprar',
  'search.whichListings': 'Qué anuncios',
  'search.comparisonSet': 'Conjunto de comparación',
  'search.comparisonHint':
    'Limita los anuncios usados para calcular cuánto vale el artículo. Deja ambos en blanco salvo que la búsqueda arrastre un tipo de producto totalmente distinto.',
  'search.maxPurchaseHint':
    'Se aplica a los anuncios que ves, no al mercado con el que se comparan.',
  'search.format': 'Formato de compra',
  'search.delivery': 'Envío',
  'search.exclude': 'Excluir palabras',
  'search.excludeHint': 'Separadas por comas. Se descarta cualquier título que contenga una.',
  'search.depth': 'Profundidad de búsqueda',
  'search.comparisonFrom': 'Precio de comparación desde',
  'search.comparisonTo': 'Precio de comparación hasta',
  'search.ready': 'Cuando quieras',
  'search.readyBody':
    'Escribe un producto arriba, o empieza por una categoría en Descubrir si no sabes qué buscar.',
  'search.viewExample': 'Ver resultados de ejemplo',
  'search.showExcluded': 'Mostrar excluidos ({count})',
  'search.worthALook': '{count} a tener en cuenta',

  'results.product': 'Producto',
  'results.totalCost': 'Coste total',
  'results.profit': 'Beneficio est.',
  'results.roi': 'ROI',
  'results.maxPrice': 'Precio máx.',
  'results.actions': 'Acciones',
  'results.save': 'Guardar',
  'results.saved': 'Guardado',
  'results.details': 'Detalles',
  'results.openEbay': 'Abrir en eBay',
  'results.nothingMatches': 'Nada cumple tus criterios',
  'results.nothingMatchesBody':
    'Todos los anuncios fueron excluidos o no alcanzaron tus objetivos de beneficio y retorno. Activa "Mostrar excluidos" para verlos y saber por qué.',
  'results.excludedBecause': 'Excluido: {reason}',
  'results.ifWon': 'si ganas a esta puja',
  'results.incDelivery': 'envío incluido',
  'results.freeDelivery': 'envío gratis',
  'results.deliveryUnknown': 'envío desconocido',
  'results.conditionUnknown': 'Estado no indicado',

  'summary.scanned': 'Anuncios analizados',
  'summary.comparable': '{count} comparables',
  'summary.notProduct': ', {count} no son el producto',
  'summary.reference': 'Valor de referencia',
  'summary.referenceNote': 'precios pedidos, no precios vendidos',
  'summary.range': 'Rango habitual',
  'summary.midpoint': 'punto medio {value}',
  'summary.evidence': 'Evidencia',
  'summary.meetCriteria': '{passing} de {total} cumplen tus criterios',
  'summary.basedOn': 'En qué se basa esto',
  'summary.cannotTell': 'Lo que esto no puede decirte',
  'summary.setAside': 'Anuncios apartados',
  'summary.setAsideNote':
    'Se dejaron fuera del valor de referencia porque no son el producto en sí. Pasa el cursor por cualquiera para ver el motivo.',
  'summary.apiCalls': '{count} llamadas a la API',
  'summary.fromCache': 'desde caché',
  'summary.exampleData': 'datos de ejemplo',
  'evidence.reasonable': 'Evidencia razonable',
  'evidence.moderate': 'Evidencia moderada',
  'evidence.limited': 'Evidencia limitada',

  'state.setupTitle': 'Falta configurar la conexión con eBay',
  'state.setupBody':
    'Esta aplicación no tiene credenciales de eBay configuradas en el servidor, así que todavía no puede obtener anuncios reales. Todo lo demás funciona: puedes ver cómo quedan los resultados con datos de ejemplo.',
  'state.setupHint':
    'Configurarlo es tarea de desarrollo: las claves van en el entorno del servidor, nunca en el navegador. Los pasos están en el README del proyecto.',
  'state.tryAgain': 'Reintentar',
  'state.exampleTitle': 'Estos son resultados de ejemplo, no anuncios reales',
  'state.exampleBody':
    'Cifras realistas pasadas por el cálculo real, para que veas cómo encaja todo. Nada de esto está a la venta.',
  'state.exitExample': 'Salir del ejemplo',
  'state.searching': 'Buscando en eBay',

  'saved.title': 'Guardados',
  'saved.intro': 'Oportunidades que has preseleccionado, con tus notas y en qué punto estás.',
  'saved.empty': 'Todavía no has guardado nada',
  'saved.emptyBody':
    'Cuando un anuncio merezca una segunda mirada, guárdalo. Puedes añadir notas, marcarlo como Interesado, Comprado o Descartado, y volver a comprobar el precio más tarde.',
  'saved.interested': 'Interesado',
  'saved.purchased': 'Comprado',
  'saved.passed': 'Descartado',
  'saved.browserOnly': 'Guardado solo en este navegador',
  'saved.browserOnlyBody':
    'No hay cuenta ni almacenamiento en servidor, así que esta lista no te seguirá a otro dispositivo o navegador, y borrar los datos del sitio la eliminará. Marcar algo como Comprado es una nota para ti: nunca realiza un pedido.',
  'saved.notPersisting': 'Este navegador no está guardando tu lista',
  'saved.notPersistingBody':
    'El almacenamiento está bloqueado o lleno, así que lo que guardes desaparecerá al recargar. Las ventanas privadas suelen comportarse así.',
  'saved.priceThen': 'Precio entonces',
  'saved.profitThen': 'Beneficio entonces',
  'saved.roiThen': 'ROI entonces',
  'saved.maxPrice': 'Precio máx.',
  'saved.refresh': 'Actualizar',
  'saved.checking': 'Comprobando',
  'saved.remove': 'Quitar',
  'saved.notePlaceholder': 'Tus notas: qué comprobar, qué ofreciste, por qué lo descartaste…',
  'saved.stale': 'La valoración puede estar desactualizada',
  'saved.savedFrom': 'Guardado {when} · de "{query}"',

  'settings.title': 'Ajustes',
  'settings.regionGroup': 'Región, idioma y moneda',
  'settings.regionGroupIntro':
    'Tres ajustes independientes. La región decide qué se busca y cómo se cobran las comisiones; el idioma cambia solo las palabras en pantalla; la moneda depende de la región.',
  'settings.region': 'Región de eBay',
  'settings.regionHint':
    'Qué sitio de eBay se busca. También fija el país de envío, las reglas de comisiones y la moneda.',
  'settings.currency': 'Moneda',
  'settings.currencyHint':
    'Depende de la región, porque los precios llegan de eBay ya en esa moneda. Mostrarlos en otra requeriría un tipo de cambio que esta aplicación no tiene, y convertir sin él sería inventar cifras.',
  'settings.currencyFixed': 'la fija la región',
  'settings.marketplace': 'Mercado',
  'settings.marketplaceIntro':
    'Qué sitio de eBay se busca y se valora. Las comisiones, la moneda y el envío dependen de esta elección.',
  'settings.marketplaceWarning': 'Las comisiones varían por país',
  'settings.marketplaceWarningBody':
    'Cada mercado tiene sus propias reglas de comisiones. En particular, los vendedores particulares no pagan comisión por venta en el Reino Unido pero sí en España, así que cambiar de país cambia todas las cifras de beneficio.',
  'settings.language': 'Idioma',
  'settings.languageIntro':
    'Cambia solo la interfaz. El texto de los anuncios siempre se muestra tal cual.',
  'settings.howYouSell': 'Cómo vendes',
  'settings.howYouSellIntro':
    'Esto decide qué comisiones de eBay se descuentan de tu cobro. Particular es la opción por defecto, porque en el Reino Unido los particulares no pagan comisión por venta en ventas nacionales.',
  'settings.sellerType': 'Tipo de vendedor',
  'settings.hint.private.EBAY_GB':
    'Sin comisiones de venta en ventas nacionales elegibles desde el 1 de octubre de 2024. La comisión de Protección al Comprador la paga el comprador, así que nunca se descuenta aquí. Las categorías con autenticación y las ventas internacionales sí tienen comisión.',
  'settings.hint.private.EBAY_ES':
    'Los vendedores particulares en España SÍ pagan comisión por venta: la exención del Reino Unido no se aplica aquí. También hay una tarifa por pedido y una tarifa regulatoria, y los porcentajes indicados ya incluyen el IVA.',
  'settings.hint.business.EBAY_GB':
    'Una comisión por venta según categoría, una tarifa por pedido, una tarifa regulatoria del 0,35% y un 20% de IVA sobre todas ellas.',
  'settings.hint.business.EBAY_ES':
    'Una comisión por venta según categoría, una tarifa por pedido, una tarifa regulatoria del 0,35% y un 21% de IVA sobre todas ellas.',
  'settings.business': 'Profesional',
  'settings.private': 'Particular',
  'settings.category': 'Categoría',
  'settings.categoryHint':
    'Fija el porcentaje de comisión por venta. Cámbialo si analizas tipos de artículo distintos.',
  'settings.vatCost': 'Tratar el IVA de las comisiones como un coste',
  'settings.vatCostHint':
    'Desactívalo si estás dado de alta y lo deduces. El IVA se sigue mostrando, pero no se descuenta.',
  'settings.international': 'Suponer una venta internacional',
  'settings.internationalHint': 'Añade el 3% de comisión internacional a cada cálculo.',
  'settings.feeOverride': 'Comisión por venta manual',
  'settings.feeOverrideHint':
    'Si conoces tu porcentaje exacto, ponlo aquí. Los resultados calculados así lo indican.',
  'settings.useCategoryRate': 'Usar el porcentaje de la categoría',
  'settings.yourCosts': 'Tus costes por artículo',
  'settings.yourCostsIntro':
    'Todo lo que pagas más allá del artículo. Se descuenta en cada cálculo.',
  'settings.postageOut': 'Envío de salida',
  'settings.packaging': 'Embalaje',
  'settings.preparation': 'Preparación',
  'settings.preparationHint': 'Limpieza, pilas, cables.',
  'settings.repair': 'Provisión para reparación',
  'settings.repairHint': 'Opcional, para artículos que esperas arreglar.',
  'settings.lossAllowance': 'Provisión por pérdidas',
  'settings.lossAllowanceHint':
    'Una parte del valor de reventa reservada para devoluciones, daños y artículos que nunca se venden. No todos saldrán bien.',
  'settings.dataSources': 'Fuentes de datos',
  'settings.dataSourcesIntro': 'Qué puede usar esta aplicación y, por tanto, qué no puede decirte.',
  'settings.connection': 'Conexión',
  'settings.environment': 'Entorno',
  'settings.lastRefresh': 'Última actualización correcta',
  'settings.notYet': 'todavía no',
  'settings.close': 'Cerrar',

  'item.whatItIs': 'Qué es',
  'item.issues': 'Problemas detectados en el anuncio',
  'item.referenceFrom': 'De dónde sale el valor de referencia',
  'item.calculation': 'El cálculo del beneficio',
  'item.manualScenario': 'Escenario manual',
  'item.moneyIn': 'Entradas',
  'item.moneyOut': 'Salidas',
  'item.netReceipts': 'Ingreso neto',
  'item.itemPrice': 'Precio del artículo',
  'item.deliveryToYou': 'Envío hasta ti',
  'item.totalCost': 'Coste total',
  'item.estimatedProfit': 'Beneficio estimado',
  'item.profitBasis': 'Beneficio comercial antes de impuestos',
  'item.roiBasis': 'Beneficio ÷ coste total',
  'item.marginBasis': 'Beneficio ÷ valor de reventa',
  'item.margin': 'Margen',
  'item.mostToPay': 'Lo máximo que deberías pagar',
  'item.maxItemPrice': 'Precio máximo del artículo',
  'item.maxAllIn': 'Máximo todo incluido',
  'item.tryOwn': 'Prueba tu propia cifra de reventa',
  'item.tryOwnLabel': 'Si crees que se vende por otra cantidad, escríbela aquí',
  'item.description': 'Descripción del vendedor',
  'item.beforeYouBuy': 'Antes de comprar',
  'item.rateUnverified': 'Este porcentaje de categoría no está verificado',
  'item.notSoldPrices': 'Son precios pedidos',

  'condition.any': 'Cualquier estado',
  'condition.new': 'Nuevo',
  'condition.refurbished': 'Reacondicionado',
  'condition.used': 'Usado',
  'condition.parts': 'Para piezas o no funciona',
  'format.any': 'Cualquier formato',
  'format.buyItNow': 'Cómpralo ya',
  'format.auction': 'Subasta',
  'delivery.any': 'Cualquier envío',
  'delivery.delivered': 'Enviado a mí',
  'delivery.collectionAvailable': 'Recogida disponible',
  'depth.quick': 'Rápida',
  'depth.standard': 'Estándar',
  'depth.thorough': 'Exhaustiva',

  'provenance.source': 'De eBay',
  'provenance.seller': 'Dice el vendedor',
  'provenance.calculated': 'Calculado',
  'provenance.yours': 'Tu dato',
};

export const DICTIONARIES: Record<Language, Partial<Record<TranslationKey, string>>> = { en, es };

/**
 * Looks up a key, falling back to English, then to the key itself. A
 * missing Spanish string shows readable English rather than breaking.
 * `{name}` placeholders are replaced from `values`.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[language]?.[key] ?? en[key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in values ? String(values[name]) : match,
  );
}
