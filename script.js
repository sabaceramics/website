(function() {
    var urlParams = new URLSearchParams(window.location.search);
    var redirectPath = urlParams.get('p');
    if (redirectPath) {
        window.history.replaceState(null, null, '/' + redirectPath.replace(/~and~/g, '&'));
    }
})();

const CSV_FILE = 'EtsyListingsDownload.csv';

function generateSlug(text) {
    if (!text) return 'product';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: h => h.trim(),
            complete: function(results) {
                const data = results.data;
                const path = window.location.pathname;

                console.log("Percorso attuale:", path); // DEBUG

                if (path.includes('/product/')) {
                    document.getElementById('home-view').style.display = 'none';
                    document.getElementById('product-view').style.display = 'block';
                    renderProductDetail(data);
                } else {
                    document.getElementById('home-view').style.display = 'block';
                    document.getElementById('product-view').style.display = 'none';
                    document.title = "Saba Ceramics | Handcrafted Pottery";
                    renderHomeGrid(data);
                }
            }
        });
    } catch (e) { console.error("Errore Caricamento CSV:", e); }
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    data.forEach(item => {
        if (!item.TITOLO || !item.IMMAGINE1 || !item.SKU) return;

        const desc = (item.DESCRIZIONE || "").toLowerCase();
        let cats = [];
        if (/raku/i.test(desc)) cats.push('raku');
        if (/saggar/i.test(desc)) cats.push('saggar');
        if (/kintsugi/i.test(desc)) cats.push('kintsugi');
        if (/lamp|lantern/i.test(desc)) cats.push('lamps');
        if (/plate/i.test(desc)) cats.push('plates');
        if (/vase/i.test(desc)) cats.push('vases');
        if (cats.length === 0) cats.push('other');

        const card = document.createElement('a');
        const sku = item.SKU.toString().trim();
        const slug = generateSlug(item.TITOLO);
        
        card.href = `/product/${sku}/${slug}`;
        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        
        card.onclick = function(e) {
            e.preventDefault();
            console.log("Cliccato prodotto SKU:", sku); // DEBUG
            window.history.pushState(null, null, card.href);
            init(); // Forza il ricaricamento della vista
            window.scrollTo(0, 0);
        };
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const pathParts = window.location.pathname.split('/');
    const skuFromUrl = pathParts[2];
    
    console.log("Cerco nel CSV lo SKU:", skuFromUrl); // DEBUG

    const item = data.find(d => d.SKU && d.SKU.toString().trim() == skuFromUrl);
    
    const container = document.getElementById('product-detail-content');
    if (!item) {
        console.error("PRODOTTO NON TROVATO PER SKU:", skuFromUrl);
        document.getElementById('product-view').innerHTML = `<h2 style="padding:100px; text-align:center;">Prodotto non trovato (SKU: ${skuFromUrl}). <a href="/">Torna alla Home</a></h2>`;
        return;
    }

    document.title = `${item.TITOLO} | Saba Ceramics`;
    let cleanDesc = (item.DESCRIZIONE || "").replace(/\n/g, '<br>').replace(/&rsquo;/g, "'");

    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.toString().trim() !== "") images.push(url.toString().trim());
    }

    let thumbnailsHtml = '';
    images.forEach((url, i) => {
        thumbnailsHtml += `<img src="${url}" class="thumb ${i===0?'active':''}" onclick="updateGallery(${i})">`;
    });

    container.innerHTML = `
        <div class="product-layout">
            <div class="product-media-column">
                <div class="main-image-wrapper" onclick="openLightbox()">
                    <img src="${images[0]}" id="main-photo" alt="${item.TITOLO}">
                </div>
                <div class="thumbnail-grid">${thumbnailsHtml}</div>
            </div>
            <div class="product-info-column">
                <h1 class="product-page-title">${item.TITOLO}</h1>
                <div class="product-description-text">${cleanDesc}</div>
                <div class="product-action">
                    <a href="https://linktr.ee/SABA.ceramics" target="_blank" class="contact-btn">CONTACT US FOR INFO</a>
                </div>
            </div>
        </div>
        <div id="lightbox" class="lightbox" onclick="closeLightbox()">
            <span class="close-lightbox">&times;</span>
            <img class="lightbox-content" id="lightbox-img">
        </div>
    `;

    // Funzioni gallery interne
    window.updateGallery = function(index) {
        document.getElementById('main-photo').src = images[index];
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === index));
    };
    window.openLightbox = function() {
        const lb = document.getElementById('lightbox');
        document.getElementById('lightbox-img').src = document.getElementById('main-photo').src;
        lb.style.display = "flex";
    };
    window.closeLightbox = function() { document.getElementById('lightbox').style.display = "none"; };
}

// Navigazione
window.onpopstate = function() { init(); };
window.showHome = function(e) {
    if (e) e.preventDefault();
    window.history.pushState(null, null, '/');
    init();
};

init();
