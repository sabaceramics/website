// --- GESTIONE SPA REDIRECT (Medaglia d'Oro SEO) ---
(function() {
    var urlParams = new URLSearchParams(window.location.search);
    var redirectPath = urlParams.get('p');
    if (redirectPath) {
        window.history.replaceState(null, null, '/' + redirectPath.replace(/~and~/g, '&'));
    }
})();

const CSV_FILE = 'EtsyListingsDownload.csv';

// --- GENERAZIONE SLUG ---
function generateSlug(text) {
    if (!text) return 'product';
    return text.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error("File CSV non trovato");
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: function(results) {
                const homeView = document.getElementById('home-view');
                const productView = document.getElementById('product-view');

                if (window.location.pathname.includes('/product/')) {
                    if (homeView) homeView.style.display = 'none';
                    if (productView) productView.style.display = 'block';
                    renderProductDetail(results.data);
                } else {
                    if (homeView) homeView.style.display = 'block';
                    if (productView) productView.style.display = 'none';
                    // Ripristina il titolo originale quando l'utente torna in Home
                    document.title = "Saba Ceramics | Handcrafted Pottery";
                    renderHomeGrid(results.data);
                }
            }
        });
    } catch (e) { console.error("Errore:", e); }
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    data.forEach((item, index) => {
        if (!item.TITOLO || !item.IMMAGINE1) return;

        const descLower = (item.DESCRIZIONE || "").toLowerCase();
        let cats = [];
        if (descLower.includes('raku')) cats.push('raku');
        if (descLower.includes('saggar')) cats.push('saggar');
        if (descLower.includes('kintsugi')) cats.push('kintsugi');
        if (descLower.includes('lamp') || descLower.includes('lantern')) cats.push('lamps');
        if (descLower.includes('plate')) cats.push('plates');
        if (descLower.includes('vase')) cats.push('vases');
        if (cats.length === 0) cats.push('other');

        const card = document.createElement('a');
        const slug = generateSlug(item.TITOLO);
        
        // SKU pulito per il link (gestisce numeri e lettere)
        const sku = (item.SKU !== undefined && item.SKU !== null) ? item.SKU.toString().trim() : "pottery";
        
        card.href = `/product/${sku}/${slug}`;
        
        card.onclick = function(e) {
            e.preventDefault();
            window.history.pushState(null, null, card.href);
            init(); 
            window.scrollTo(0, 0); 
        };

        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });
}

// --- RENDER DETTAGLIO PRODOTTO ---
function renderProductDetail(data) {
    const pathParts = window.location.pathname.split('/');
    const skuFromUrl = pathParts[2];
    
    // Ricerca flessibile dello SKU nel CSV
    const item = data.find(d => d.SKU && d.SKU.toString().trim() == skuFromUrl);
    
    const container = document.getElementById('product-detail-content');
    if (!item || !container) return;

    // Titolo dinamico per la scheda del browser
    document.title = `${item.TITOLO} | Saba Ceramics`;

    let cleanDesc = (item.DESCRIZIONE || "")
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');

    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    let thumbnailsHtml = '';
    images.forEach((url, i) => {
        thumbnailsHtml += `<img src="${url}" class="thumb ${i===0?'active':''}" onclick="updateGallery(${i})">`;
    });

    container.innerHTML = `
        <div class="product-media">
            <div class="slider-wrapper" onclick="openLightbox()">
                <button class="slider-arrow prev" onclick="changeSlide(-1); event.stopPropagation();">&#10094;</button>
                <img src="${images[0]}" id="main-photo" alt="${item.TITOLO}">
                <button class="slider-arrow next" onclick="changeSlide(1); event.stopPropagation();">&#10095;</button>
            </div>
            <div class="thumbnail-container">${thumbnailsHtml}</div>
        </div>
        <div class="product-info-text">
            <h1 class="section-title" style="text-align:left; margin-top:0;">${item.TITOLO}</h1>
            <p class="product-description">${cleanDesc}</p>
            <div class="contact-btn-wrapper">
                <a href="https://linktr.ee/SABA.ceramics" target="_blank" class="contact-btn">CONTACT US FOR INFO</a>
            </div>
        </div>
        <div id="lightbox" class="lightbox" onclick="closeLightbox()">
            <span class="close-lightbox" onclick="closeLightbox()">&times;</span>
            <img class="lightbox-content" id="lightbox-img">
        </div>
    `;

    let currentIdx = 0;
    window.updateGallery = function(index) {
        currentIdx = index;
        const mainImg = document.getElementById('main-photo');
        const lbImg = document.getElementById('lightbox-img');
        if(mainImg) mainImg.src = images[currentIdx];
        if(lbImg) lbImg.src = images[currentIdx];
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    };

    window.changeSlide = function(dir) {
        currentIdx = (currentIdx + dir + images.length) % images.length;
        updateGallery(currentIdx);
    };

    window.openLightbox = function() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        if(lightbox && lightboxImg) {
            lightbox.style.display = "flex";
            lightboxImg.src = images[currentIdx];
        }
    };

    window.closeLightbox = function() {
        const lightbox = document.getElementById('lightbox');
        if(lightbox) lightbox.style.display = "none";
    };

    document.onkeydown = function(e) {
        const lb = document.getElementById('lightbox');
        if (lb && lb.style.display === "flex") {
            if (e.key === "ArrowLeft") changeSlide(-1);
            if (e.key === "ArrowRight") changeSlide(1);
            if (e.key === "Escape") closeLightbox();
        }
    };
}

// --- GESTIONE TASTO INDIETRO/AVANTI ---
window.onpopstate = function() {
    init();
};

// --- FUNZIONE PER TORNARE ALLA HOME ---
window.showHome = function(e) {
    if (e) e.preventDefault();
    window.history.pushState(null, null, '/');
    init();
    window.scrollTo(0, 0);
};

// --- FILTRAGGIO ---
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const cat = e.target.getAttribute('data-category').toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = (cat === 'all' || card.classList.contains(cat)) ? 'block' : 'none';
        });
    }
});

init();
