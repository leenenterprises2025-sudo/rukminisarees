/**
 * Rukmini Sarees - Product Engine & Google Sheet Sync
 * Handles live Google Sheet fetching, offline JSON fallback, category filtering,
 * product card rendering, quick view modals, and 1-click WhatsApp order generation.
 */

class ProductCatalog {
  constructor() {
    this.products = [];
    this.activeFilter = "All";
    this.targetCategory = null;
    this.gridElement = document.getElementById("productsGrid");
    this.featuredGridElement = document.getElementById("featuredProductsGrid");
    this.filterBarElement = document.getElementById("filterBar");
    this.modalElement = document.getElementById("productModal");

    if (this.gridElement) {
      this.targetCategory = this.gridElement.getAttribute("data-category");
    }

    this.init();
  }

  async init() {
    this.injectModal();
    this.showSkeletonLoading();

    try {
      this.products = await this.loadProducts();
      this.render();
    } catch (err) {
      console.warn("Could not load products from Google Sheet. Falling back to local catalog.", err);
      this.products = await this.loadFallback();
      this.render();
    }
  }

  // Inject Quick View Modal into DOM if not present
  injectModal() {
    if (!document.getElementById("productModal")) {
      const modalHtml = `
        <div id="productModal" class="modal-overlay">
          <div class="modal-dialog">
            <button class="modal-close" id="modalCloseBtn" aria-label="Close dialog">&times;</button>
            <div class="modal-body" id="modalBody">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      this.modalElement = document.getElementById("productModal");

      // Close handlers
      document.getElementById("modalCloseBtn")?.addEventListener("click", () => this.closeModal());
      this.modalElement.addEventListener("click", (e) => {
        if (e.target === this.modalElement) this.closeModal();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.closeModal();
      });
    }
  }

  showSkeletonLoading() {
    if (!this.gridElement) return;
    this.gridElement.innerHTML = `
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
    `;
  }

  // Load products: checks sessionStorage cache -> Google Sheet -> local JSON
  async loadProducts() {
    const config = window.RUKMINI_CONFIG || {};

    // 1. Check Session Cache
    const cacheKey = "rukmini_products_cache";
    const cacheTimeKey = "rukmini_products_cache_time";
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);

    const maxAgeMs = (config.cacheExpiryMinutes || 10) * 60 * 1000;
    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime, 10) < maxAgeMs)) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // 2. Fetch from Google Sheet if Sheet ID is provided
    if (config.googleSheetId && config.googleSheetId.trim() !== "") {
      try {
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/gviz/tq?tqx=out:json`;
        const response = await fetch(sheetUrl);
        const text = await response.text();
        
        // Parse Google's setResponse wrapper
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        const parsedGoogle = JSON.parse(text.substring(jsonStart, jsonEnd));
        
        const sheetProducts = this.parseGoogleSheet(parsedGoogle);
        if (sheetProducts && sheetProducts.length > 0) {
          sessionStorage.setItem(cacheKey, JSON.stringify(sheetProducts));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          console.log(`[Rukmini Sarees] Successfully synced ${sheetProducts.length} live products from Google Sheets!`);
          return sheetProducts;
        } else {
          console.warn("[Rukmini Sarees] Google Sheet connected! (0 product rows found yet below headers, displaying default catalog).");
        }
      } catch (err) {
        console.error("[Rukmini Sarees] Google Sheet fetch error. Loading fallback catalog.", err);
      }
    }

    // 3. Fallback to local data/products.json
    return await this.loadFallback();
  }

  async loadFallback() {
    const fallbackUrl = (window.RUKMINI_CONFIG && window.RUKMINI_CONFIG.fallbackDataUrl) || "data/products.json";
    const resp = await fetch(fallbackUrl);
    return await resp.json();
  }

  // Parse Google Visualization API table into clean Product objects
  parseGoogleSheet(googleJson) {
    if (!googleJson || !googleJson.table) return [];

    let cols = (googleJson.table.cols || []).map(c => (c.label || "").trim());
    let rows = googleJson.table.rows || [];

    // If cols have empty labels, extract header names from row 0
    if (cols.every(c => c === "") && rows.length > 0 && rows[0].c) {
      cols = rows[0].c.map(c => (c && c.v !== null && c.v !== undefined ? String(c.v).trim() : ""));
      rows = rows.slice(1); // skip row 0 since it is the header row
    } else if (rows.length > 0 && rows[0].c) {
      // If row 0 contains header names like 'Product_ID' or 'Category', skip it
      const row0Values = rows[0].c.map(c => (c && c.v !== null ? String(c.v).trim().toLowerCase() : ""));
      if (row0Values.some(val => val === "product_id" || val === "category" || val.includes("product_name"))) {
        rows = rows.slice(1);
      }
    }

    const findIndex = (name) => {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cols.findIndex(col => col.toLowerCase().replace(/[^a-z0-9]/g, "").includes(cleanName));
    };

    const idIdx = findIndex("id") !== -1 ? findIndex("id") : 0;
    const catIdx = findIndex("category") !== -1 ? findIndex("category") : 1;
    const subIdx = findIndex("subcategory") !== -1 ? findIndex("subcategory") : 2;
    const nameIdx = findIndex("name") !== -1 ? findIndex("name") : 3;
    const priceIdx = findIndex("price") !== -1 ? findIndex("price") : 4;
    const origPriceIdx = findIndex("original") !== -1 ? findIndex("original") : 5;
    const fabricIdx = findIndex("fabric") !== -1 ? findIndex("fabric") : 6;
    const colorIdx = findIndex("color") !== -1 ? findIndex("color") : 7;
    const badgeIdx = findIndex("badge") !== -1 ? findIndex("badge") : 8;
    const imgIdx = findIndex("image") !== -1 ? findIndex("image") : 9;
    const descIdx = findIndex("desc") !== -1 ? findIndex("desc") : 10;
    const stockIdx = findIndex("stock") !== -1 ? findIndex("stock") : 11;
    const featIdx = findIndex("featured") !== -1 ? findIndex("featured") : 12;

    const products = [];

    rows.forEach((r, i) => {
      const getVal = (idx) => {
        if (!r.c || idx === -1 || !r.c[idx]) return "";
        return r.c[idx].v !== null && r.c[idx].v !== undefined ? String(r.c[idx].v).trim() : "";
      };

      const name = getVal(nameIdx);
      if (!name) return; // Skip empty rows

      // Skip row if it is accidentally a header repeat
      if (name.toLowerCase() === "product_name" || name.toLowerCase() === "product name") return;

      const inStock = getVal(stockIdx).toUpperCase();
      if (inStock === "NO" || inStock === "FALSE" || inStock === "OUT OF STOCK") return; // Hide out of stock items

      let priceVal = getVal(priceIdx);
      if (priceVal && !priceVal.startsWith("₹")) {
        const num = parseFloat(priceVal.replace(/[^0-9.]/g, ""));
        priceVal = !isNaN(num) ? `₹${num.toLocaleString('en-IN')}` : `₹${priceVal}`;
      }

      let origPriceVal = getVal(origPriceIdx);
      if (origPriceVal) {
        if (!origPriceVal.startsWith("₹")) {
          const num = parseFloat(origPriceVal.replace(/[^0-9.]/g, ""));
          origPriceVal = !isNaN(num) ? `₹${num.toLocaleString('en-IN')}` : `₹${origPriceVal}`;
        }
      } else {
        origPriceVal = null;
      }

      products.push({
        id: getVal(idIdx) || `RS-PROD-${i + 1}`,
        category: (getVal(catIdx) || "sarees").toLowerCase().replace(/\s+/g, "-"),
        subcategory: getVal(subIdx) || "General",
        name: name,
        price: priceVal || "₹0",
        originalPrice: origPriceVal,
        fabric: getVal(fabricIdx) || "Handloom Silk",
        color: getVal(colorIdx) || "Multi",
        badge: getVal(badgeIdx) || null,
        image: getVal(imgIdx) || "logo.jpg",
        description: getVal(descIdx) || "Authentic collection from Rukmini Sarees, Prasadampadu, Vijayawada.",
        blousePiece: "Included (Unstitched 0.8m)",
        inStock: "YES",
        featuredHome: (getVal(featIdx).toUpperCase() === "YES" || getVal(featIdx).toUpperCase() === "TRUE") ? "YES" : "NO"
      });
    });

    return products;
  }

  // Render Category Page Products & Filter Pills
  render() {
    // 1. Render Catalog Page if #productsGrid exists
    if (this.gridElement && this.targetCategory) {
      const categoryProducts = this.products.filter(p => p.category === this.targetCategory);
      this.renderFilterPills(categoryProducts);
      this.renderProductCards(categoryProducts);
    }

    // 2. Render Homepage Featured edit if #featuredProductsGrid exists
    if (this.featuredGridElement) {
      const featured = this.products.filter(p => p.featuredHome === "YES" || p.badge === "BRIDAL BESTSELLER").slice(0, 4);
      this.renderFeaturedCards(featured);
    }
  }

  // Render Subcategory Filter Pills
  renderFilterPills(categoryProducts) {
    if (!this.filterBarElement) return;

    // Collect unique subcategories
    const subcats = ["All", ...new Set(categoryProducts.map(p => p.subcategory).filter(Boolean))];

    this.filterBarElement.innerHTML = subcats.map(sub => `
      <button class="filter-pill ${sub === this.activeFilter ? 'active' : ''}" data-subcat="${sub}">
        ${sub}
      </button>
    `).join("");

    this.filterBarElement.querySelectorAll(".filter-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        this.activeFilter = pill.getAttribute("data-subcat");
        this.filterBarElement.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.renderProductCards(categoryProducts);
      });
    });
  }

  // Render Product Cards Grid
  renderProductCards(categoryProducts) {
    if (!this.gridElement) return;

    const filtered = this.activeFilter === "All"
      ? categoryProducts
      : categoryProducts.filter(p => p.subcategory === this.activeFilter);

    if (filtered.length === 0) {
      this.gridElement.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #fff; border: 1px solid var(--line); border-radius: 8px;">
          <h3 style="color: var(--wine); font-size: 24px;">New Collection Arriving Soon!</h3>
          <p style="color: var(--muted); margin: 8px 0 20px;">We are currently updating our ${this.activeFilter} catalog.</p>
          <a class="btn gold" href="https://wa.me/917981688516?text=Hi%20Rukmini%20Sarees%2C%20do%20you%20have%20${encodeURIComponent(this.activeFilter)}%20options%20in%20stock%3F" target="_blank">
            Ask on WhatsApp
          </a>
        </div>
      `;
      return;
    }

    this.gridElement.innerHTML = filtered.map(p => this.createCardHtml(p)).join("");
    this.attachCardEvents();
  }

  // Render Featured Cards on Homepage
  renderFeaturedCards(featuredProducts) {
    if (!this.featuredGridElement) return;
    this.featuredGridElement.innerHTML = featuredProducts.map(p => this.createCardHtml(p)).join("");
    this.attachCardEvents();
  }

  // Create single product card HTML
  createCardHtml(p) {
    const waText = encodeURIComponent(
`✨ *Rukmini Sarees - Product Enquiry* ✨
-------------------------------------
*Product:* ${p.name}
*Item Code:* ${p.id}
*Price:* ${p.price}
*Fabric:* ${p.fabric}
-------------------------------------
Hello Rukmini Sarees team, is this currently available in your Prasadampadu store? Please share photos and availability.`
    );

    const waUrl = `https://wa.me/917981688516?text=${waText}`;

    return `
      <article class="product product-catalog-card" data-id="${p.id}">
        <div class="product-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='logo.jpg';">
          ${p.badge ? `<span class="tag">${p.badge}</span>` : ''}
          <button class="quickview-overlay-btn" data-id="${p.id}">🔍 Quick View</button>
        </div>
        <div class="product-body">
          <div class="product-subcat">${p.subcategory}</div>
          <h3 class="product-title">${p.name}</h3>
          <div class="product-fabric">🧵 ${p.fabric}</div>
          
          <div class="product-pricing">
            <span class="price-current">${p.price}</span>
            ${p.originalPrice ? `<span class="price-original">${p.originalPrice}</span>` : ''}
          </div>

          <div class="product-card-actions">
            <a class="btn-card-wa" href="${waUrl}" target="_blank">
              <span>💬</span> Order on WhatsApp
            </a>
            <button class="btn-card-details" data-id="${p.id}">Details</button>
          </div>
        </div>
      </article>
    `;
  }

  // Attach click listeners for Quick View & Details modals
  attachCardEvents() {
    document.querySelectorAll(".quickview-overlay-btn, .btn-card-details").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const prod = this.products.find(p => p.id === id);
        if (prod) this.openModal(prod);
      });
    });
  }

  // Open Quick View Modal
  openModal(prod) {
    const modalBody = document.getElementById("modalBody");
    if (!modalBody) return;

    const waText = encodeURIComponent(
`✨ *Rukmini Sarees - Order Enquiry* ✨
-------------------------------------
*Product:* ${prod.name}
*Code:* ${prod.id}
*Price:* ${prod.price}
*Fabric:* ${prod.fabric}
*Color:* ${prod.color}
-------------------------------------
Hello Rukmini Sarees, please confirm availability and delivery for this piece.`
    );

    const waUrl = `https://wa.me/917981688516?text=${waText}`;

    modalBody.innerHTML = `
      <div class="modal-grid">
        <div class="modal-media">
          <img src="${prod.image}" alt="${prod.name}" onerror="this.src='logo.jpg';">
          ${prod.badge ? `<span class="tag" style="top:12px; left:12px;">${prod.badge}</span>` : ''}
        </div>
        <div class="modal-details">
          <div class="eyebrow" style="margin-bottom:8px;">${prod.subcategory.toUpperCase()} · ${prod.id}</div>
          <h2>${prod.name}</h2>
          
          <div class="modal-pricing">
            <span class="price-current" style="font-size:24px;">${prod.price}</span>
            ${prod.originalPrice ? `<span class="price-original" style="font-size:16px;">${prod.originalPrice}</span>` : ''}
            <span class="status-badge" style="margin-left:12px;"><span class="dot"></span> In Stock (Prasadampadu Store)</span>
          </div>

          <p class="modal-desc">${prod.description}</p>

          <table class="modal-specs-table">
            <tr>
              <td>Fabric Weave:</td>
              <td><strong>${prod.fabric}</strong></td>
            </tr>
            <tr>
              <td>Color Palette:</td>
              <td><strong>${prod.color}</strong></td>
            </tr>
            <tr>
              <td>Blouse Piece / Dimensions:</td>
              <td><strong>${prod.blousePiece || "Included"}</strong></td>
            </tr>
            <tr>
              <td>Wash & Care:</td>
              <td>Dry Clean Recommended</td>
            </tr>
            <tr>
              <td>Store Landmark:</td>
              <td>Near Kasturibhai School, Prasadampadu</td>
            </tr>
          </table>

          <div class="modal-actions">
            <a class="btn" style="background:#25d366; color:#fff; width:100%; justify-content:center; font-size:13px;" href="${waUrl}" target="_blank">
              <span>💬</span> Order or Inquire via WhatsApp
            </a>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <a class="btn light" style="flex:1; justify-content:center; font-size:12px;" href="tel:+917981688516">
                📞 Call Store: +91 79816 88516
              </a>
              <a class="btn secondary" style="flex:1; justify-content:center; font-size:12px;" href="contact.html">
                📍 Get Store Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalElement.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    if (this.modalElement) {
      this.modalElement.classList.remove("active");
      document.body.style.overflow = "";
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.rukminiCatalog = new ProductCatalog();
});
