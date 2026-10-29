(() => {
  "use strict";

  const STORAGE = {
    cart: "demoda_cart_v1",
    favorites: "demoda_favorites_v1",
    orders: "demoda_orders_v1",
    profile: "demoda_profile_v1",
    accounts: "demoda_accounts_v1",
    session: "demoda_session_v1"
  };

  const CATEGORIES = [
    { name: "Panty Señorial", icon: "panty", description: "Modelos y colores surtidos" },
    { name: "Brasier Dama", icon: "bra", description: "Variedad para venta al por mayor" },
    { name: "Panty Básico", icon: "panty", description: "Próximamente en el catálogo" },
    { name: "Conjuntos", icon: "set", description: "Próximamente en el catálogo" },
    { name: "Pijamas", icon: "pajamas", description: "Próximamente en el catálogo" }
  ];

  const appContent = document.getElementById("appContent");
  const searchBar = document.getElementById("searchBar");
  const searchInput = document.getElementById("searchInput");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const productModal = document.getElementById("productModal");
  const checkoutModal = document.getElementById("checkoutModal");
  const toastElement = document.getElementById("toast");

  let products = [];
  let currentView = "home";
  let activeCategory = "Todos";
  let searchTerm = "";
  let sortMode = "featured";
  let toastTimer = null;
  let productModalQty = 1;
  let lastOrder = null;

  const readStorage = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("No fue posible leer localStorage:", key, error);
      return fallback;
    }
  };
  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("No fue posible guardar en localStorage:", key, error);
      showToast("No se pudo guardar. Revisa el almacenamiento del navegador.");
    }
  };

  let cart = readStorage(STORAGE.cart, []);
  let favorites = readStorage(STORAGE.favorites, []);
  let orders = readStorage(STORAGE.orders, []);
  let profile = readStorage(STORAGE.profile, {
    name: "", phone: "", city: "", address: "", email: ""
  });
  let accounts = readStorage(STORAGE.accounts, []);
  let currentUserId = readStorage(STORAGE.session, null);
  let currentUser = accounts.find(account => account.id === currentUserId) || null;
  let currentAuthMode = "login";

  // In this prototype, account data is stored only in this browser.
  // This is a demonstration login, not secure production authentication.
  if (currentUser) {
    profile = {
      name: currentUser.profile?.name || currentUser.name || profile.name || "",
      phone: currentUser.profile?.phone || currentUser.phone || profile.phone || "",
      city: currentUser.profile?.city || "",
      address: currentUser.profile?.address || "",
      email: currentUser.email || ""
    };
  }

  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const emptyProfile = () => ({ name: "", phone: "", city: "", address: "", email: "" });

  function activateAccount(account) {
    currentUser = account;
    currentUserId = account.id;
    writeStorage(STORAGE.session, currentUserId);
    profile = {
      ...emptyProfile(),
      ...(account.profile || {}),
      name: (account.profile && account.profile.name) || account.name || "",
      phone: (account.profile && account.profile.phone) || account.phone || "",
      email: account.email || ""
    };
    writeStorage(STORAGE.profile, profile);
  }

  function saveCurrentAccountProfile() {
    if (!currentUser) return;
    currentUser.name = profile.name || currentUser.name;
    currentUser.phone = profile.phone || "";
    currentUser.profile = { ...profile, email: currentUser.email };
    accounts = accounts.map(account => account.id === currentUser.id ? currentUser : account);
    writeStorage(STORAGE.accounts, accounts);
  }

  function logoutAccount() {
    currentUser = null;
    currentUserId = null;
    localStorage.removeItem(STORAGE.session);
    profile = emptyProfile();
    writeStorage(STORAGE.profile, profile);
    currentAuthMode = "login";
    currentView = "account";
    setActiveNav("account");
    render();
    showToast("Sesión cerrada.");
  }

  const money = (value) => new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0
  }).format(Number(value) || 0);

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function icon(name) {
    const paths = {
      search: '<circle cx="10.8" cy="10.8" r="7.2"/><path d="m16.2 16.2 4.3 4.3"/>',
      cart: '<path d="M2.5 3.5h2.7l2.1 12.2a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 1.9-1.5L22 8H6"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/>',
      heart: '<path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>',
      panty: '<path d="M4 6c2.5 1 5.2 1.4 8 1.4S17.5 7 20 6l-2 11-6 3-6-3z"/><path d="m6 9 6 5 6-5"/>',
      bra: '<path d="M3 10c0-3.5 2.2-5.5 5-5.5 2.3 0 4 2.2 4 5.2v7.5H7C4.6 17.2 3 14.4 3 10Z"/><path d="M21 10c0-3.5-2.2-5.5-5-5.5-2.3 0-4 2.2-4 5.2v7.5h5c2.4 0 4-2.8 4-7.2Z"/><path d="M3 9 1.5 6M21 9l1.5-3M7 17l-1 3M17 17l1 3"/>',
      set: '<path d="M6 4h12l2 6-3 2v8H7v-8l-3-2z"/><path d="M8 4c0 3 2 4 4 4s4-1 4-4"/>',
      pajamas: '<path d="m7 3 5 2 5-2 4 4-3 4-2-1v11H8V10l-2 1-3-4z"/><path d="M9 4c0 2 1 3 3 3s3-1 3-3"/>',
      truck: '<path d="M2 5h12v12H2zM14 9h4l4 4v4h-8z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
      box: '<path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
      tag: '<path d="M20 13 11 22l-9-9V2h11z"/><circle cx="7" cy="7" r="1.4"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      user: '<circle cx="12" cy="7.5" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      arrow: '<path d="M4 12h15M13 5l7 7-7 7"/>',
      checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
      shield: '<path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m8 12 2.5 2.5L16 9"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v3h16v-3"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.box}</svg>`;
  }

  function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove("show"), 2500);
  }

  function getProduct(id) {
    return products.find(product => product.id === id);
  }

  // A single pricing layer keeps offer prices consistent in cards, details, cart and checkout.
  function hasOffer(product) {
    return Boolean(product && product.offer && product.offer.active && Number(product.offer.packPrice) > 0);
  }

  function getDiscountPercent(product) {
    return hasOffer(product) ? Number(product.offer.percent) || 0 : 0;
  }

  function getUnitPrice(product) {
    return hasOffer(product) ? Number(product.offer.unitPrice) : Number(product.unitPrice);
  }

  function getPackPrice(product) {
    return hasOffer(product) ? Number(product.offer.packPrice) : Number(product.packPrice);
  }

  function getCartOriginalTotal() {
    return cart.reduce((sum, item) => {
      const product = getProduct(item.id);
      return sum + (product ? Number(product.packPrice) * item.qty : 0);
    }, 0);
  }

  function getCartSavings() {
    return Math.max(0, getCartOriginalTotal() - getCartTotal());
  }

  function getCartCount() {
    return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => {
      const product = getProduct(item.id);
      return sum + (product ? getPackPrice(product) * item.qty : 0);
    }, 0);
  }

  function persistCart() {
    cart = cart.filter(item => getProduct(item.id) && Number(item.qty) > 0);
    writeStorage(STORAGE.cart, cart);
    updateCounters();
  }

  function updateCounters() {
    const count = getCartCount();
    document.getElementById("headerCartCount").textContent = count;
    document.getElementById("navCartCount").textContent = count;
    document.getElementById("headerCartCount").hidden = count === 0;
    document.getElementById("navCartCount").hidden = count === 0;
  }

  function setActiveNav(view) {
    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });
  }

  function goTo(view) {
    currentView = view;
    setActiveNav(view);
    closeAllModals();
    if (view !== "home" && view !== "categories" && view !== "offers") {
      searchBar.hidden = true;
    }
    if (view === "offers") {
      activeCategory = "Todos";
      sortMode = "discount-high";
      searchTerm = "";
      searchInput.value = "";
      searchBar.hidden = true;
    }
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeAllModals() {
    modalBackdrop.hidden = true;
    productModal.hidden = true;
    checkoutModal.hidden = true;
  }

  function visibleProducts(source = products) {
    let result = [...source];
    if (activeCategory !== "Todos") {
      result = result.filter(product => product.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLocaleLowerCase("es");
      result = result.filter(product =>
        `${product.name} ${product.ref} ${product.brand} ${product.category} ${product.colors}`.toLocaleLowerCase("es").includes(term)
      );
    }
    if (sortMode === "price-low") result.sort((a,b) => getPackPrice(a) - getPackPrice(b));
    else if (sortMode === "price-high") result.sort((a,b) => getPackPrice(b) - getPackPrice(a));
    else if (sortMode === "discount-high") result.sort((a,b) => getDiscountPercent(b) - getDiscountPercent(a));
    else if (sortMode === "name") result.sort((a,b) => a.name.localeCompare(b.name, "es"));
    else if (sortMode === "featured") result.sort((a,b) => Number(b.featured) - Number(a.featured));
    return result;
  }

  function categoryIcon(categoryName) {
    const category = CATEGORIES.find(item => item.name === categoryName);
    return icon(category ? category.icon : "box");
  }

  function renderCategoryStrip() {
    return `<div class="category-strip" aria-label="Categorías destacadas">
      ${CATEGORIES.map((category, index) => {
        const available = products.some(product => product.category === category.name);
        return `<button class="category-button ${activeCategory === category.name ? "active" : ""}" data-category="${escapeHTML(category.name)}" ${!available ? 'data-coming-soon="true"' : ""}>
          <span class="category-icon">${categoryIcon(category.name)}</span>
          <span>${escapeHTML(category.name)}</span>
        </button>`;
      }).join("")}
    </div>`;
  }

  function productCard(product) {
    const isFavorite = favorites.includes(product.id);
    const onOffer = hasOffer(product);
    const unitPrice = getUnitPrice(product);
    const packPrice = getPackPrice(product);
    const badge = onOffer ? `${getDiscountPercent(product)}% OFF` : (product.tag || `Pack x${product.packSize}`);
    return `<article class="product-card ${onOffer ? "product-card-offer" : ""}">
      <button class="product-visual" data-detail="${product.id}" aria-label="Ver ${escapeHTML(product.name)}">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy">
        <span class="product-badge ${onOffer ? "offer-badge" : ""}">${escapeHTML(badge)}</span>
      </button>
      <button class="favorite-toggle ${isFavorite ? "active" : ""}" data-favorite="${product.id}" aria-label="${isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}">
        ${icon("heart")}
      </button>
      <div class="product-info">
        <p class="product-title">${escapeHTML(product.name)}</p>
        <p class="product-ref">Ref. ${escapeHTML(product.ref)} · ${escapeHTML(product.brand)}</p>
        <div class="product-price-row ${onOffer ? "has-offer" : ""}">
          <div>
            <div class="unit-price">${money(unitPrice)}</div>
            ${onOffer ? `<div class="old-price">Antes ${money(product.unitPrice)}</div>` : ""}
            <div class="unit-label">Unidad</div>
          </div>
          <div style="text-align:right">
            <div class="pack-price">${money(packPrice)}</div>
            ${onOffer ? `<div class="old-pack-price">${money(product.packPrice)}</div>` : ""}
            <div class="pack-label">Pack x${product.packSize}</div>
          </div>
        </div>
        ${onOffer ? `<div class="offer-saving">Ahorras ${money(product.packPrice - packPrice)} por paquete</div>` : ""}
        <div class="product-meta">Tallas: ${escapeHTML(product.sizes.join(" · "))}<br>Colores: ${escapeHTML(product.colors)}</div>
        <button class="add-button" data-add="${product.id}">${icon("cart")} ${onOffer ? "Aprovechar oferta" : "Agregar pack"}</button>
      </div>
    </article>`;
  }

  function emptyState(title, message, actionLabel = "Volver al catálogo", actionView = "home") {
    return `<div class="empty-state">
      <div class="empty-icon">${icon("box")}</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
      <button class="primary-button" data-view="${actionView}">${escapeHTML(actionLabel)}</button>
    </div>`;
  }

  function renderHome() {
    const listed = visibleProducts();
    const heading = activeCategory === "Todos" ? "Catálogo mayorista" : activeCategory;
    const activeOffers = products.filter(hasOffer);
    const maxDiscount = activeOffers.reduce((max, product) => Math.max(max, getDiscountPercent(product)), 0);
    return `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Moda para tu negocio</span>
          <h1>Venta de ropa <span>al por mayor</span></h1>
          <p>Prendas seleccionadas, variedad de estilos y precios especiales por paquete.</p>
          <button class="primary-button" data-scroll="catalog">Ver catálogo ${icon("arrow")}</button>
          <div class="hero-perks">
            <span>${icon("truck")} Precios mayoristas</span>
            <span>${icon("box")} Packs x12</span>
          </div>
        </div>
        <div class="hero-image-wrap"><img src="assets/hero-model.jpg" alt="Modelo con ropa íntima de catálogo"></div>
      </section>

      <div class="section-heading">
        <div><h2>Compra por categoría</h2><p>Encuentra rápido lo que buscas</p></div>
      </div>
      ${renderCategoryStrip()}

      <button class="offer-banner" data-view="offers" aria-label="Abrir ofertas especiales">
        <span class="offer-banner-copy">
          <span class="offer-eyebrow">✦ Promociones activas</span>
          <strong class="offer-banner-title">OFERTAS <span>ESPECIALES</span></strong>
          <span class="offer-banner-description">Precios especiales en referencias seleccionadas.</span>
          <span class="offer-banner-cta">Ver ofertas ${icon("arrow")}</span>
        </span>
        <span class="offer-banner-art"><img src="assets/products/brasier-03.jpg" alt="" loading="lazy"><span class="offer-discount-burst">HASTA <strong>${maxDiscount}%</strong> OFF</span></span>
      </button>

      <section id="catalog">
        <div class="section-heading">
          <div><h2>${escapeHTML(heading)}</h2><p>${listed.length} referencias disponibles</p></div>
          <button class="text-link" data-view="categories">Ver categorías ${icon("arrow")}</button>
        </div>
        <div class="filter-row">
          ${["Todos", "Panty Señorial", "Brasier Dama"].map(category => `<button class="filter-chip ${activeCategory === category ? "active" : ""}" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}
        </div>
        ${listed.length ? `<div class="product-grid">${listed.map(productCard).join("")}</div>` : emptyState("Sin resultados", "No encontramos productos con esos filtros. Prueba otra búsqueda o categoría.")}
      </section>
      <p class="footer-note">DE MODA DISTRIBUIDORA · Catálogo de demostración<br>Las promociones son ilustrativas y se aplican al precio por paquete durante esta prueba.</p>`;
  }

  function renderOffers() {
    const offerProducts = products.filter(hasOffer);
    const listed = visibleProducts(offerProducts);
    const maxDiscount = offerProducts.reduce((max, product) => Math.max(max, getDiscountPercent(product)), 0);
    const offerCategories = CATEGORIES.filter(category => offerProducts.some(product => product.category === category.name));
    return `
      <h1 class="page-title">Ofertas especiales</h1>
      <p class="page-subtitle">Aprovecha precios promocionales por paquete. El descuento se refleja en el carrito y en el resumen del pedido.</p>
      <section class="offers-page-hero">
        <div class="offers-page-copy">
          <span class="offer-eyebrow">✦ Solo referencias seleccionadas</span>
          <h2>Renueva tu inventario <span>ahorrando</span></h2>
          <p>Encuentra oportunidades para comprar al por mayor.</p>
          <div class="offers-page-max">HASTA <strong>${maxDiscount}% OFF</strong></div>
        </div>
        <div class="offers-page-art"><img src="assets/products/panty-02.jpg" alt="Prendas disponibles en promoción" loading="lazy"></div>
      </section>
      <div class="list-heading"><h2>${listed.length} promociones activas</h2>
        <select class="sort-select" id="sortSelect" aria-label="Ordenar ofertas">
          <option value="discount-high" ${sortMode === "discount-high" ? "selected" : ""}>Mayor descuento</option>
          <option value="price-low" ${sortMode === "price-low" ? "selected" : ""}>Menor precio</option>
          <option value="price-high" ${sortMode === "price-high" ? "selected" : ""}>Mayor precio</option>
          <option value="name" ${sortMode === "name" ? "selected" : ""}>Nombre A-Z</option>
        </select>
      </div>
      <div class="filter-row offer-filters">
        ${["Todos", ...offerCategories.map(category => category.name)].map(category => `<button class="filter-chip ${activeCategory === category ? "active" : ""}" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}
      </div>
      ${listed.length ? `<div class="product-grid">${listed.map(productCard).join("")}</div>` : emptyState("No hay ofertas en esta categoría", "Selecciona otra categoría para ver las promociones disponibles.", "Ver todas las ofertas", "offers")}
      <p class="footer-note">Las promociones de esta versión son de prueba. Verifica los precios y la vigencia antes de publicar el catálogo.</p>`;
  }

  function renderCategories() {
    const categoryProducts = activeCategory === "Todos" ? products : products.filter(product => product.category === activeCategory);
    return `
      <h1 class="page-title">Categorías</h1>
      <p class="page-subtitle">Explora las líneas disponibles. Los productos se venden por paquetes de ${products[0]?.packSize || 12} unidades.</p>
      <div class="category-page-grid">
        ${CATEGORIES.map(category => {
          const count = products.filter(product => product.category === category.name).length;
          return `<button class="category-tile" data-category="${escapeHTML(category.name)}" data-category-view="true">
            <span class="category-icon">${categoryIcon(category.name)}</span>
            <span><strong>${escapeHTML(category.name)}</strong><small>${count ? `${count} referencias` : "Próximamente"}</small></span>
          </button>`;
        }).join("")}
      </div>
      <div class="list-heading"><h2>${escapeHTML(activeCategory === "Todos" ? "Todos los productos" : activeCategory)}</h2>
        <select class="sort-select" id="sortSelect" aria-label="Ordenar productos">
          <option value="featured" ${sortMode === "featured" ? "selected" : ""}>Destacados</option>
          <option value="price-low" ${sortMode === "price-low" ? "selected" : ""}>Menor precio</option>
          <option value="price-high" ${sortMode === "price-high" ? "selected" : ""}>Mayor precio</option>
          <option value="name" ${sortMode === "name" ? "selected" : ""}>Nombre A-Z</option>
        </select>
      </div>
      ${categoryProducts.length ? `<div class="product-grid">${visibleProducts(categoryProducts).map(productCard).join("")}</div>` : emptyState("Próximamente", "Estamos preparando esta categoría. Por ahora puedes explorar panty señorial y brasier dama.", "Ver productos disponibles", "home")}
      <p class="footer-note">DE MODA DISTRIBUIDORA · Catálogo de demostración</p>`;
  }

  function renderCart() {
    if (!cart.length) {
      return `<h1 class="page-title">Tu carrito</h1><p class="page-subtitle">Los paquetes que agregues aparecerán aquí.</p>${emptyState("Tu carrito está vacío", "Explora el catálogo y agrega los paquetes que deseas cotizar o pedir.", "Explorar catálogo", "home")}`;
    }

    const rows = cart.map(item => {
      const product = getProduct(item.id);
      if (!product) return "";
      return `<article class="cart-item">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
        <div class="cart-item-info">
          <h3 class="cart-item-title">${escapeHTML(product.name)}</h3>
          <p class="cart-item-ref">Ref. ${escapeHTML(product.ref)} · Pack x${product.packSize}</p>
          <p class="cart-item-price">${money(getPackPrice(product))} / paquete${hasOffer(product) ? ` <span class="cart-old-price">${money(product.packPrice)}</span>` : ""}</p>
          ${hasOffer(product) ? `<p class="offer-saving">Oferta: ${getDiscountPercent(product)}% OFF · Ahorras ${money(product.packPrice - getPackPrice(product))}</p>` : ""}
          <div class="cart-item-controls">
            <div class="stepper">
              <button data-cart-minus="${product.id}" aria-label="Restar paquete">−</button>
              <span>${item.qty}</span>
              <button data-cart-plus="${product.id}" aria-label="Sumar paquete">+</button>
            </div>
            <button class="remove-button" data-remove="${product.id}">${icon("trash")} Quitar</button>
          </div>
        </div>
      </article>`;
    }).join("");

    const totalUnits = cart.reduce((sum, item) => {
      const product = getProduct(item.id);
      return sum + (product ? product.packSize * item.qty : 0);
    }, 0);

    return `<h1 class="page-title">Tu carrito</h1><p class="page-subtitle">${getCartCount()} paquetes · ${totalUnits} unidades estimadas</p>
      <div class="cart-layout">
        <div class="cart-list">${rows}</div>
        <aside class="cart-summary">
          <h3>Resumen del pedido</h3>
          <div class="summary-line"><span>Paquetes</span><strong>${getCartCount()}</strong></div>
          <div class="summary-line"><span>Unidades estimadas</span><strong>${totalUnits}</strong></div>
          ${getCartSavings() > 0 ? `<div class="summary-line savings-line"><span>Ahorro por ofertas</span><strong>−${money(getCartSavings())}</strong></div>` : ""}
          <div class="summary-line summary-total"><span>Total estimado</span><strong>${money(getCartTotal())}</strong></div>
          <p class="summary-note">Esta es una demostración frontend. El pedido se guardará localmente en este dispositivo; no se enviará a una tienda o servidor.</p>
          <button class="primary-button full-width" id="checkoutButton">Continuar pedido ${icon("arrow")}</button>
          <button class="secondary-button full-width" style="margin-top:9px" data-view="home">Seguir comprando</button>
        </aside>
      </div>`;
  }

  function renderFavorites() {
    const favProducts = products.filter(product => favorites.includes(product.id));
    return `<h1 class="page-title">Mis favoritos</h1><p class="page-subtitle">Guarda aquí las referencias que quieras revisar después.</p>
      ${favProducts.length ? `<div class="product-grid">${favProducts.map(productCard).join("")}</div>` : emptyState("Aún no tienes favoritos", "Pulsa el corazón de cualquier producto para guardarlo en esta sección.", "Ver catálogo", "home")}
      <p class="footer-note">Los favoritos se guardan en este navegador.</p>`;
  }

  function renderAccount() {
    if (!currentUser) {
      if (currentAuthMode === "register") {
        return `<section class="auth-wrap">
          <div class="auth-brand-mark"><span class="brand-bag"><span>DM</span></span></div>
          <p class="auth-eyebrow">DE MODA DISTRIBUIDORA</p>
          <h1 class="page-title auth-title">Crea tu cuenta</h1>
          <p class="page-subtitle auth-subtitle">Regístrate para consultar tu historial y guardar tus datos de compra.</p>
          <form id="registerForm" class="account-card auth-card">
            <div class="field"><label for="registerName">Nombre completo *</label><input id="registerName" name="name" required autocomplete="name" placeholder="Tu nombre y apellido"></div>
            <div class="field"><label for="registerEmail">Correo electrónico *</label><input id="registerEmail" name="email" type="email" required autocomplete="email" placeholder="tu@correo.com"></div>
            <div class="field"><label for="registerPhone">WhatsApp / teléfono</label><input id="registerPhone" name="phone" inputmode="tel" autocomplete="tel" placeholder="300 000 0000"></div>
            <div class="field"><label for="registerPassword">Contraseña *</label><input id="registerPassword" name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></div>
            <div class="field"><label for="registerConfirmPassword">Confirmar contraseña *</label><input id="registerConfirmPassword" name="confirmPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Repite la contraseña"></div>
            <button class="primary-button full-width auth-submit" type="submit">Crear cuenta ${icon("user")}</button>
          </form>
          <p class="auth-switch">¿Ya tienes una cuenta? <button type="button" data-auth-mode="login">Inicia sesión</button></p>
          <p class="auth-disclaimer">Modo de prueba: la cuenta se guarda en este navegador. No uses una contraseña real ni información sensible.</p>
        </section>`;
      }

      return `<section class="auth-wrap">
        <div class="auth-brand-mark"><span class="brand-bag"><span>DM</span></span></div>
        <p class="auth-eyebrow">DE MODA DISTRIBUIDORA</p>
        <h1 class="page-title auth-title">Bienvenido</h1>
        <p class="page-subtitle auth-subtitle">Inicia sesión para consultar tus pedidos y los datos de tu cuenta.</p>
        <form id="loginForm" class="account-card auth-card">
          <div class="field"><label for="loginEmail">Correo electrónico *</label><input id="loginEmail" name="email" type="email" required autocomplete="username" placeholder="tu@correo.com"></div>
          <div class="field"><label for="loginPassword">Contraseña *</label><input id="loginPassword" name="password" type="password" required autocomplete="current-password" placeholder="Tu contraseña"></div>
          <button class="primary-button full-width auth-submit" type="submit">Iniciar sesión ${icon("arrow")}</button>
        </form>
        <p class="auth-switch">¿Todavía no tienes cuenta? <button type="button" data-auth-mode="register">Registrarme</button></p>
        <p class="auth-disclaimer">Acceso de demostración: los datos y el historial se guardan localmente en este navegador; no hay servidor ni autenticación segura.</p>
      </section>`;
    }

    const orderHistory = orders
      .filter(order => order.userId === currentUser.id || normalizeEmail(order.customer?.email) === normalizeEmail(currentUser.email))
      .slice()
      .reverse();

    return `<div class="account-header-row">
        <div><p class="auth-eyebrow">TU ESPACIO PERSONAL</p><h1 class="page-title">Mi cuenta</h1><p class="page-subtitle">Hola, ${escapeHTML(currentUser.name || currentUser.email)}. Aquí puedes revisar tus pedidos.</p></div>
        <button class="secondary-button logout-button" id="logoutButton" type="button">Cerrar sesión</button>
      </div>
      <section class="account-card account-welcome-card">
        <div class="account-avatar">${escapeHTML((currentUser.name || currentUser.email || "DM").trim().charAt(0).toUpperCase())}</div>
        <div class="account-welcome-copy"><strong>${escapeHTML(currentUser.name || "Cliente De Moda")}</strong><span>${escapeHTML(currentUser.email)}</span><small>${orderHistory.length} pedido(s) en tu historial</small></div>
      </section>
      <form id="profileForm" class="account-card">
        <h2>Datos de contacto</h2>
        <div class="form-grid two-col">
          <div class="field"><label for="profileName">Nombre completo *</label><input id="profileName" name="name" value="${escapeHTML(profile.name)}" required placeholder="Tu nombre"></div>
          <div class="field"><label for="profilePhone">WhatsApp / teléfono *</label><input id="profilePhone" name="phone" value="${escapeHTML(profile.phone)}" required inputmode="tel" placeholder="300 000 0000"></div>
          <div class="field"><label for="profileCity">Ciudad *</label><input id="profileCity" name="city" value="${escapeHTML(profile.city)}" required placeholder="Ciudad de entrega"></div>
          <div class="field"><label for="profileEmail">Correo de la cuenta</label><input id="profileEmail" name="email" value="${escapeHTML(currentUser.email)}" type="email" readonly aria-readonly="true"></div>
          <div class="field" style="grid-column:1/-1"><label for="profileAddress">Dirección (opcional)</label><input id="profileAddress" name="address" value="${escapeHTML(profile.address)}" placeholder="Dirección de entrega"></div>
        </div>
        <button class="primary-button" type="submit" style="margin-top:14px">Guardar datos ${icon("check")}</button>
      </form>
      <section class="account-card account-history-card">
        <div class="account-section-title"><div><h2>Historial de pedidos</h2><p>Pedidos asociados a esta cuenta</p></div><span class="history-count">${orderHistory.length}</span></div>
        ${orderHistory.length ? orderHistory.map(order => `<article class="account-order">
          <div class="account-order-top"><span>${escapeHTML(order.code)}</span><strong>${money(order.total)}</strong></div>
          <p>${escapeHTML(order.dateLabel || order.date || "Fecha no disponible")} · ${order.items?.length || 0} referencia(s) · ${escapeHTML(order.status || "Registrado localmente")}</p>
          <details class="order-details"><summary>Ver productos del pedido</summary>
            <div class="order-items-list">${(order.items || []).map(item => `<div><span>${escapeHTML(item.name)} <small>(${escapeHTML(item.ref || "Sin referencia")}) · ${Number(item.qty) || 1} paquete(s)</small></span><strong>${money(item.subtotal || 0)}</strong></div>`).join("")}</div>
          </details>
        </article>`).join("") : `<div class="account-empty-history"><span>${icon("box")}</span><strong>Aún no tienes pedidos</strong><p>Cuando confirmes una compra de prueba, aparecerá aquí con su número, total y productos.</p><button class="secondary-button" data-view="home" type="button">Explorar catálogo</button></div>`}
      </section>
      <button class="secondary-button full-width" id="resetDemoButton" type="button">Restablecer pedidos y datos de prueba</button>
      <p class="footer-note">Cuenta de demostración: los datos permanecen en este navegador. No uses contraseñas reales; esta versión no sustituye un sistema de autenticación con backend.</p>`;
  }

  function render() {
    if (!products.length) {
      appContent.innerHTML = emptyState("No se pudo cargar el catálogo", "Revisa que los archivos estén completos e intenta recargar la página.");
      return;
    }
    if (currentView === "home") appContent.innerHTML = renderHome();
    else if (currentView === "categories") appContent.innerHTML = renderCategories();
    else if (currentView === "offers") appContent.innerHTML = renderOffers();
    else if (currentView === "cart") appContent.innerHTML = renderCart();
    else if (currentView === "favorites") appContent.innerHTML = renderFavorites();
    else if (currentView === "account") appContent.innerHTML = renderAccount();
    else appContent.innerHTML = renderHome();
    updateCounters();
  }

  function addToCart(id, qty = 1) {
    const product = getProduct(id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.qty += qty;
    else cart.push({ id, qty });
    persistCart();
    showToast(`${product.name}: ${qty} paquete${qty > 1 ? "s" : ""} agregado${qty > 1 ? "s" : ""}`);
    if (currentView === "cart") render();
  }

  function toggleFavorite(id) {
    if (favorites.includes(id)) {
      favorites = favorites.filter(favoriteId => favoriteId !== id);
      showToast("Producto quitado de favoritos");
    } else {
      favorites.push(id);
      showToast("Producto guardado en favoritos");
    }
    writeStorage(STORAGE.favorites, favorites);
    render();
  }

  function openProductModal(id) {
    const product = getProduct(id);
    if (!product) return;
    productModalQty = 1;
    modalBackdrop.hidden = false;
    productModal.hidden = false;
    productModal.innerHTML = `
      <button class="modal-close" data-close-modal aria-label="Cerrar">×</button>
      <img class="modal-product-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
      <div class="modal-product-body">
        <div class="modal-product-title-row">
          <div><h2>${escapeHTML(product.name)}</h2><p class="modal-ref">Ref. ${escapeHTML(product.ref)} · ${escapeHTML(product.brand)}</p></div>
          <div class="modal-price">${money(getUnitPrice(product))}${hasOffer(product) ? `<del>${money(product.unitPrice)}</del>` : ""}<small>por unidad</small></div>
        </div>
        <div class="modal-pack"><div><strong>${money(getPackPrice(product))}</strong>${hasOffer(product) ? `<del>${money(product.packPrice)}</del>` : ""}<small>Precio por paquete de ${product.packSize} unidades${hasOffer(product) ? ` · Ahorras ${money(product.packPrice - getPackPrice(product))}` : ""}</small></div><span class="product-badge ${hasOffer(product) ? "offer-badge" : ""}">${hasOffer(product) ? `${getDiscountPercent(product)}% OFF` : escapeHTML(product.tag || "Mayorista")}</span></div>
        <div class="detail-list">
          <span>${icon("checkCircle")} Tallas: ${escapeHTML(product.sizes.join(", "))}</span>
          <span>${icon("checkCircle")} Colores: ${escapeHTML(product.colors)}</span>
          <span>${icon("shield")} Venta mayorista · Paquete cerrado de ${product.packSize} unidades</span>
        </div>
        <div class="modal-actions">
          <div class="stepper"><button data-modal-minus aria-label="Restar paquete">−</button><span id="modalQty">1</span><button data-modal-plus aria-label="Sumar paquete">+</button></div>
          <button class="primary-button" data-modal-add="${product.id}">${icon("cart")} Agregar al carrito</button>
        </div>
      </div>`;
  }

  function closeProductModal() {
    productModal.hidden = true;
    if (checkoutModal.hidden) modalBackdrop.hidden = true;
  }

  function openCheckout() {
    if (!cart.length) {
      showToast("Agrega al menos un paquete antes de continuar.");
      return;
    }
    closeProductModal();
    modalBackdrop.hidden = false;
    checkoutModal.hidden = false;
    checkoutModal.innerHTML = `
      <button class="modal-close" data-close-modal aria-label="Cerrar">×</button>
      <h2 id="checkoutTitle">Completar pedido</h2>
      <p class="checkout-subtitle">Formulario de prueba. Al confirmar, el pedido quedará guardado en este navegador; no se enviará a un servidor.</p>
      <form id="checkoutForm">
        <div class="form-grid two-col">
          <div class="field"><label for="checkoutName">Nombre completo *</label><input id="checkoutName" name="name" value="${escapeHTML(profile.name)}" required autocomplete="name"></div>
          <div class="field"><label for="checkoutPhone">WhatsApp / teléfono *</label><input id="checkoutPhone" name="phone" value="${escapeHTML(profile.phone)}" required inputmode="tel" autocomplete="tel"></div>
          <div class="field"><label for="checkoutCity">Ciudad *</label><input id="checkoutCity" name="city" value="${escapeHTML(profile.city)}" required></div>
          <div class="field"><label for="checkoutEmail">Correo (opcional)</label><input id="checkoutEmail" name="email" value="${escapeHTML(profile.email)}" type="email"></div>
          <div class="field" style="grid-column:1/-1"><label for="checkoutAddress">Dirección de entrega *</label><input id="checkoutAddress" name="address" value="${escapeHTML(profile.address)}" required autocomplete="street-address"></div>
          <div class="field" style="grid-column:1/-1"><label for="checkoutNotes">Observaciones (opcional)</label><textarea id="checkoutNotes" name="notes" placeholder="Indicaciones para este pedido"></textarea></div>
        </div>
        <div class="checkout-total-box"><span>Total estimado (${getCartCount()} paquetes)</span><strong>${money(getCartTotal())}</strong></div>
        <div class="checkout-actions"><button type="button" class="secondary-button" data-close-modal>Cancelar</button><button type="submit" class="primary-button">Confirmar pedido ${icon("check")}</button></div>
      </form>`;
  }

  function completeCheckout(formData) {
    const now = new Date();
    const code = `DM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const items = cart.map(item => {
      const product = getProduct(item.id);
      return {
        id: item.id, name: product.name, ref: product.ref,
        qty: item.qty, packSize: product.packSize,
        unitPrice: getUnitPrice(product),
        originalUnitPrice: product.unitPrice,
        packPrice: getPackPrice(product),
        originalPackPrice: product.packPrice,
        discountPercent: getDiscountPercent(product),
        subtotal: getPackPrice(product) * item.qty
      };
    });
    const order = {
      code,
      date: now.toISOString(),
      dateLabel: now.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }),
      userId: currentUser ? currentUser.id : null,
      customer: {
        name: formData.name, phone: formData.phone, city: formData.city,
        email: formData.email || (currentUser ? currentUser.email : ""), address: formData.address
      },
      notes: formData.notes,
      items,
      total: getCartTotal(),
      status: "Registrado en este dispositivo"
    };
    orders.push(order);
    writeStorage(STORAGE.orders, orders);
    profile = { ...profile, ...order.customer };
    if (currentUser) profile.email = currentUser.email;
    writeStorage(STORAGE.profile, profile);
    saveCurrentAccountProfile();
    lastOrder = order;
    cart = [];
    persistCart();
    checkoutModal.hidden = true;
    productModal.hidden = true;
    currentView = "home";
    activeCategory = "Todos";
    searchTerm = "";
    searchInput.value = "";
    searchBar.hidden = true;
    setActiveNav("home");
    render();
    showOrderSuccess(order);
  }

  function showOrderSuccess(order) {
    modalBackdrop.hidden = false;
    checkoutModal.hidden = false;
    checkoutModal.innerHTML = `
      <div class="success-icon">${icon("checkCircle")}</div>
      <h2>Pedido registrado</h2>
      <p class="checkout-subtitle">El pedido de demostración se guardó correctamente en este navegador.</p>
      <div class="checkout-total-box"><span>Número de pedido</span><strong style="font-size:14px">${escapeHTML(order.code)}</strong></div>
      <div class="summary-line"><span>Cliente</span><strong>${escapeHTML(order.customer.name)}</strong></div>
      <div class="summary-line"><span>Referencias</span><strong>${order.items.length}</strong></div>
      <div class="summary-line summary-total"><span>Total estimado</span><strong>${money(order.total)}</strong></div>
      <p class="summary-note">No se realizó ningún cobro ni envío real. Puedes consultar este pedido en “Mi cuenta”. El carrito se ha vaciado para iniciar una compra nueva.</p>
      <button class="primary-button full-width" id="successHomeButton">Volver al inicio ${icon("home")}</button>`;
  }

  function closeDrawer() {
    document.querySelector(".mobile-drawer")?.remove();
    modalBackdrop.hidden = true;
  }

  function openDrawer() {
    modalBackdrop.hidden = false;
    const drawer = document.createElement("div");
    drawer.className = "mobile-drawer";
    drawer.innerHTML = `
      <button class="drawer-close" data-close-drawer aria-label="Cerrar menú">×</button>
      <div class="brand" style="justify-content:flex-start;margin:0 0 10px">
        <span class="brand-bag"><span>DM</span></span><span class="brand-text"><strong>DE M<span>O</span>DA</strong><small>DISTRIBUIDORA</small></span>
      </div>
      <h2>¿Qué deseas ver?</h2>
      <button class="drawer-link" data-view="home">${icon("home")} Inicio y catálogo</button>
      <button class="drawer-link" data-view="categories">${icon("grid")} Categorías</button>
      <button class="drawer-link drawer-offers-link" data-view="offers">${icon("tag")} Ofertas especiales</button>
      <button class="drawer-link" data-view="cart">${icon("cart")} Carrito (${getCartCount()})</button>
      <button class="drawer-link" data-view="favorites">${icon("heart")} Favoritos (${favorites.length})</button>
      <button class="drawer-link" data-view="account">${icon("user")} Mi cuenta e historial</button>
      <button class="drawer-link pwa-install-link" data-install-app type="button">${icon("download")} Instalar aplicación</button>
      <p class="footer-note" style="margin-top:auto">De Moda Distribuidora · Modelo de prueba</p>`;
    document.body.appendChild(drawer);
    updatePWAInstallButton();
  }

  // Main click delegation.
  document.addEventListener("click", event => {
    const installButton = event.target.closest("[data-install-app]");
    if (installButton) {
      event.preventDefault();
      installPWA();
      return;
    }

    const authModeButton = event.target.closest("[data-auth-mode]");
    if (authModeButton) {
      currentAuthMode = authModeButton.dataset.authMode === "register" ? "register" : "login";
      render();
      return;
    }

    if (event.target.closest("#logoutButton")) {
      logoutAccount();
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      event.preventDefault();
      const view = viewButton.dataset.view;
      closeDrawer();
      goTo(view);
      return;
    }

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      const category = categoryButton.dataset.category;
      if (categoryButton.dataset.comingSoon === "true" || (category !== "Todos" && !products.some(product => product.category === category))) {
        showToast("Esta categoría estará disponible próximamente.");
        return;
      }
      activeCategory = category;
      if (categoryButton.dataset.categoryView === "true") currentView = "categories";
      else if (currentView === "home" || currentView === "categories") currentView = currentView;
      render();
      if (currentView === "home") {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const detailButton = event.target.closest("[data-detail]");
    if (detailButton) {
      openProductModal(detailButton.dataset.detail);
      return;
    }

    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      addToCart(addButton.dataset.add, 1);
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.favorite);
      return;
    }

    const plus = event.target.closest("[data-cart-plus]");
    if (plus) {
      const item = cart.find(row => row.id === plus.dataset.cartPlus);
      if (item) item.qty += 1;
      persistCart(); render(); return;
    }
    const minus = event.target.closest("[data-cart-minus]");
    if (minus) {
      const item = cart.find(row => row.id === minus.dataset.cartMinus);
      if (item) item.qty -= 1;
      persistCart(); render(); return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      cart = cart.filter(item => item.id !== remove.dataset.remove);
      persistCart(); render(); showToast("Producto retirado del carrito"); return;
    }

    if (event.target.closest("#checkoutButton")) { openCheckout(); return; }
    if (event.target.closest("[data-close-modal]")) {
      closeAllModals(); return;
    }
    if (event.target.closest("[data-close-drawer]")) {
      closeDrawer(); return;
    }
    if (event.target.closest("[data-modal-minus]")) {
      productModalQty = Math.max(1, productModalQty - 1);
      const qty = document.getElementById("modalQty");
      if (qty) qty.textContent = productModalQty;
      return;
    }
    if (event.target.closest("[data-modal-plus]")) {
      productModalQty = Math.min(99, productModalQty + 1);
      const qty = document.getElementById("modalQty");
      if (qty) qty.textContent = productModalQty;
      return;
    }
    const modalAdd = event.target.closest("[data-modal-add]");
    if (modalAdd) {
      addToCart(modalAdd.dataset.modalAdd, productModalQty);
      closeProductModal();
      return;
    }
    if (event.target.closest("#successHomeButton")) {
      closeAllModals();
      goTo("home");
      showToast("Listo. Puedes iniciar un nuevo pedido.");
      return;
    }
    if (event.target.closest("[data-scroll]")) {
      const target = document.getElementById(event.target.closest("[data-scroll]").dataset.scroll);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (event.target.closest("#resetDemoButton")) {
      const confirmed = window.confirm("¿Deseas borrar el carrito, favoritos, historial de pedidos y datos de contacto? Tu cuenta de prueba seguirá activa.");
      if (!confirmed) return;
      [STORAGE.cart, STORAGE.favorites, STORAGE.orders, STORAGE.profile].forEach(key => localStorage.removeItem(key));
      cart = []; favorites = []; orders = [];
      profile = currentUser
        ? { ...emptyProfile(), ...(currentUser.profile || {}), name: currentUser.name || "", phone: currentUser.phone || "", email: currentUser.email }
        : emptyProfile();
      writeStorage(STORAGE.profile, profile);
      updateCounters(); render();
      showToast("Pedidos y datos de prueba restablecidos.");
    }
  });

  document.addEventListener("change", event => {
    if (event.target.id === "sortSelect") {
      sortMode = event.target.value;
      render();
    }
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "loginForm") {
      event.preventDefault();
      const data = new FormData(event.target);
      const email = normalizeEmail(data.get("email"));
      const password = String(data.get("password") || "");
      const account = accounts.find(item => normalizeEmail(item.email) === email && item.password === password);
      if (!account) {
        showToast("Correo o contraseña incorrectos. Revisa los datos o regístrate.");
        return;
      }
      activateAccount(account);
      currentAuthMode = "login";
      currentView = "account";
      setActiveNav("account");
      render();
      showToast(`Bienvenido${account.name ? `, ${account.name}` : ""}.`);
      return;
    }

    if (event.target.id === "registerForm") {
      event.preventDefault();
      const data = new FormData(event.target);
      const name = String(data.get("name") || "").trim();
      const email = normalizeEmail(data.get("email"));
      const phone = String(data.get("phone") || "").trim();
      const password = String(data.get("password") || "");
      const confirmPassword = String(data.get("confirmPassword") || "");
      if (!name || !email || !password) {
        showToast("Completa los campos obligatorios.");
        return;
      }
      if (password.length < 6) {
        showToast("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        showToast("Las contraseñas no coinciden.");
        return;
      }
      if (accounts.some(item => normalizeEmail(item.email) === email)) {
        showToast("Ya existe una cuenta con ese correo. Inicia sesión.");
        currentAuthMode = "login";
        render();
        return;
      }
      const account = {
        id: `DMU-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        name,
        email,
        phone,
        password,
        createdAt: new Date().toISOString(),
        profile: { ...emptyProfile(), name, email, phone }
      };
      accounts.push(account);
      writeStorage(STORAGE.accounts, accounts);
      activateAccount(account);
      currentAuthMode = "login";
      currentView = "account";
      setActiveNav("account");
      render();
      showToast("Cuenta de prueba creada correctamente.");
      return;
    }

    if (event.target.id === "profileForm") {
      event.preventDefault();
      const data = new FormData(event.target);
      profile = {
        name: String(data.get("name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        city: String(data.get("city") || "").trim(),
        email: String(data.get("email") || "").trim(),
        address: String(data.get("address") || "").trim()
      };
      if (currentUser) profile.email = currentUser.email;
      writeStorage(STORAGE.profile, profile);
      saveCurrentAccountProfile();
      showToast("Datos de contacto guardados.");
      render();
      return;
    }
    if (event.target.id === "checkoutForm") {
      event.preventDefault();
      const data = new FormData(event.target);
      const formData = {
        name: String(data.get("name") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        city: String(data.get("city") || "").trim(),
        email: String(data.get("email") || "").trim(),
        address: String(data.get("address") || "").trim(),
        notes: String(data.get("notes") || "").trim()
      };
      if (!formData.name || !formData.phone || !formData.city || !formData.address) {
        showToast("Completa los campos obligatorios.");
        return;
      }
      completeCheckout(formData);
    }
  });

  document.getElementById("searchToggle").addEventListener("click", () => {
    searchBar.hidden = !searchBar.hidden;
    if (!searchBar.hidden) {
      searchInput.focus();
    } else {
      searchTerm = "";
      searchInput.value = "";
      render();
    }
  });

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    if (currentView !== "home" && currentView !== "categories" && currentView !== "offers") currentView = "home";
    setActiveNav(currentView);
    render();
  });

  document.getElementById("clearSearch").addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    render();
    searchInput.focus();
  });

  document.getElementById("menuButton").addEventListener("click", openDrawer);

  modalBackdrop.addEventListener("click", event => {
    if (event.target !== modalBackdrop) return;
    closeAllModals();
    closeDrawer();
  });

  // Progressive Web App: offline shell, installation prompt, and iOS instructions.
  let deferredInstallPrompt = null;

  function isIOSDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isPWAInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  }

  function updatePWAInstallButton() {
    const button = document.querySelector("[data-install-app]");
    if (!button) return;
    if (isPWAInstalled()) {
      button.innerHTML = `${icon("checkCircle")} Aplicación instalada`;
      button.disabled = true;
      button.classList.add("is-installed");
      return;
    }
    button.disabled = false;
    button.classList.remove("is-installed");
    const label = isIOSDevice() ? "Cómo instalar en iPhone" : "Instalar aplicación";
    button.innerHTML = `${icon("download")} ${label}`;
  }

  async function installPWA() {
    if (isPWAInstalled()) {
      showToast("De Moda ya está instalada en este dispositivo.");
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updatePWAInstallButton();
      if (result && result.outcome === "accepted") {
        showToast("Instalación iniciada. Busca De Moda en tus aplicaciones.");
      } else {
        showToast("Puedes instalar De Moda cuando quieras desde el menú.");
      }
      closeDrawer();
      return;
    }

    if (isIOSDevice()) {
      window.alert("Para instalar De Moda en iPhone o iPad:\n\n1. Abre esta página en Safari.\n2. Pulsa el botón Compartir.\n3. Selecciona ‘Añadir a pantalla de inicio’.\n4. Confirma con ‘Añadir’.\n\nLa instalación requiere que el sitio esté publicado con HTTPS.");
      return;
    }

    showToast("Para instalarla, abre el sitio con Chrome o Edge desde HTTPS o localhost.");
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updatePWAInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updatePWAInstallButton();
    showToast("De Moda se instaló correctamente.");
  });

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(registration => console.info("PWA activa. Service worker registrado:", registration.scope))
        .catch(error => console.warn("No se pudo registrar el service worker:", error));
    }, { once: true });
  }
  registerServiceWorker();

  // Try the JSON catalog first. If opened directly from disk, use the local fallback array.
  async function init() {
    try {
      const response = await fetch("data/products.json");
      if (!response.ok) throw new Error("No se pudo leer products.json");
      products = await response.json();
    } catch (error) {
      console.info("Usando catálogo de respaldo para apertura local.", error.message);
      products = Array.isArray(window.DE_MODA_PRODUCTS_FALLBACK) ? window.DE_MODA_PRODUCTS_FALLBACK : [];
    }
    cart = Array.isArray(cart) ? cart : [];
    favorites = Array.isArray(favorites) ? favorites : [];
    orders = Array.isArray(orders) ? orders : [];
    updateCounters();
    render();
  }

  init();
})();