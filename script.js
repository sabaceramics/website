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
    } catch (e) { console.error("Errore CSV:", e); }
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    data.forEach(item => {
        if (!item.TITOLO || !item.IMMAGINE1 || !item.SKU) return;

        const desc = (item.DESCRIZIONE || "").toLowerCase();
        let cats = [];

        // ✅ LOGICA FLESSIBILE (Regex): /parola/i cerca ignorando maiuscole/minuscole
        if (/raku/i.test(desc)) cats.push('raku');
        if (/saggar/i.test(desc)) cats.push('saggar');
        if (/kintsugi/i.test(desc)) cats.push('kintsugi');
        
        // Cerca "lamp" o "lantern" (anche al plurale)
        if (/lamp|lantern/i.test(desc)) cats.push('lamps');
        
        // Cerca "plate" (anche plates)
        if (/plate/i.test(desc)) cats.push('plates');
        
        // Cerca "vase" (anche vases)
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
            window.history.pushState(null, null, card.href);
            init();
            window.scrollTo(0, 0);
        };
        grid.appendChild(card);
    });
}

// GESTIONE FILTRI E NAVIGAZIONE
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const cat = e.target.getAttribute('data-category');
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = (cat === 'all' || card.classList.contains(cat)) ? 'block' : 'none';
        });
    }

    const href = e.target.closest('a')?.getAttribute('href');
    if (href && href.startsWith('#')) {
        if (window.location.pathname !== '/') {
            e.preventDefault();
            window.history.pushState(null, null, '/');
            init();
            setTimeout(() => {
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 150);
        }
    }
});

function renderProductDetail(data) {
    const pathParts = window.location.pathname.split('/');
    const skuFromUrl = pathParts[2];
    const item = data.find(d => d.SKU && d.SKU.toString().trim() == skuFromUrl);
    
    const container = document.getElementById('product-detail-content');
    if (!item || !container) {
        window.history.pushState(null, null, '/');
        init();
        return;
    }

    document.title = `${item.TITOLO} | Saba Ceramics`;
    let cleanDesc = (item.DESCRIZIONE || "").replace(/\n/g, '<br>').replace(/&rsquo;/g, "'");

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
                <a href="https://wa.me/393294020926" target="_blank" class="contact-btn">CONTACT US FOR INFO</a>
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
        if(mainImg) mainImg.src = images[currentIdx];
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    };
    window.changeSlide = function(dir) {
        currentIdx = (currentIdx + dir + images.length) % images.length;
        updateGallery(currentIdx);
    };
    window.openLightbox = function() {
        const lb = document.getElementById('lightbox');
        const lbImg = document.getElementById('lightbox-img');
        if(lb && lbImg) { lb.style.display = "flex"; lbImg.src = images[currentIdx]; }
    };
    window.closeLightbox = function() { document.getElementById('lightbox').style.display = "none"; };
}

window.onpopstate = function() { init(); };

window.showHome = function(e) {
    if (e) e.preventDefault();
    window.history.pushState(null, null, '/');
    init();
    window.scrollTo(0, 0);
};

init();
