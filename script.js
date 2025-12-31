(function() {
    var urlParams = new URLSearchParams(window.location.search);
    var redirectPath = urlParams.get('p');
    if (redirectPath) {
        window.history.replaceState(null, null, '/' + redirectPath.replace(/~and~/g, '&'));
    }
})();

const CSV_FILE = '/EtsyListingsDownload.csv';

function generateSlug(text) {
    if (!text) return 'product';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, dynamicTyping: false, transformHeader: h => h.trim(),
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
    } catch (e) { console.error("Errore:", e); }
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    data.forEach(item => {
        const skuValue = item.SKU || item.sku;
        if (!item.TITOLO || !item.IMMAGINE1 || !skuValue) return;
        
        // ✅ LOGICA FILTRI FLESSIBILE: Cerca nella DESCRIZIONE ignorando singolare/plurale e maiuscole
        const desc = (item.DESCRIZIONE || "").toLowerCase();
        let cats = [];
        
        if (/raku/i.test(desc)) cats.push('raku');
        if (/saggar/i.test(desc)) cats.push('saggar');
        if (/kintsugi/i.test(desc)) cats.push('kintsugi');
        
        // Cerca "lamp" o "lantern" (prende lamps, lanterns, ecc.)
        if (/lamp|lantern/i.test(desc)) cats.push('lamps');
        
        // Cerca "plate" (prende plate e plates)
        if (/plate/i.test(desc)) cats.push('plates');
        
        // Cerca "vase" (prende vase e vases)
        if (/vase/i.test(desc)) cats.push('vases');

        if (cats.length === 0) cats.push('other');

        const card = document.createElement('a');
        card.href = `/product/${skuValue}/${generateSlug(item.TITOLO)}`;
        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}">`;
        card.onclick = function(e) { 
            e.preventDefault(); 
            window.history.pushState(null, null, card.href); 
            init(); 
            window.scrollTo(0, 0); 
        };
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const skuFromUrl = window.location.pathname.split('/')[2];
    const item = data.find(d => (d.SKU || d.sku || "").toString().trim() === skuFromUrl);
    const container = document.getElementById('product-detail-content');
    if (!item) { window.history.replaceState(null, null, '/'); init(); return; }

    let images = [];
    for (let i = 1; i <= 10; i++) {
        let img = item[`IMMAGINE${i}`];
        if (img && img.trim() !== "") images.push(img.trim());
    }

    let currentIdx = 0;

    container.innerHTML = `
        <div class="product-layout">
            <div class="product-media">
                <div class="slider-wrapper" id="slider-main">
                    <button class="slider-arrow prev" id="arrow-prev">&#10094;</button>
                    <img src="${images[0]}" id="main-photo">
                    <button class="slider-arrow next" id="arrow-next">&#10095;</button>
                </div>
                <div class="thumbnail-container">
                    ${images.map((url, i) => `<img src="${url}" class="thumb ${i===0?'active':''}" data-index="${i}">`).join('')}
                </div>
            </div>
            <div class="product-info-text">
                <h1 class="section-title" style="text-align:left; margin-top:0;">${item.TITOLO}</h1>
                <p class="product-description">${item.DESCRIZIONE.replace(/\n/g, '<br>')}</p>
                <a href="https://linktr.ee/SABA.ceramics" target="_blank" class="contact-btn">CONTACT US FOR INFO</a>
            </div>
        </div>
        <div id="lightbox" class="lightbox"><span class="close-lightbox">&times;</span><img class="lightbox-content" id="lb-img"></div>
    `;

    function updateGallery(idx) {
        currentIdx = idx;
        document.getElementById('main-photo').src = images[currentIdx];
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
        if(document.getElementById('lightbox').style.display === 'flex') {
            document.getElementById('lb-img').src = images[currentIdx];
        }
    }

    // Eventi Click
    document.getElementById('arrow-prev').onclick = (e) => { e.stopPropagation(); updateGallery((currentIdx - 1 + images.length) % images.length); };
    document.getElementById('arrow-next').onclick = (e) => { e.stopPropagation(); updateGallery((currentIdx + 1) % images.length); };
    document.querySelectorAll('.thumb').forEach(t => t.onclick = () => updateGallery(parseInt(t.dataset.index)));
    
    // Lightbox
    document.getElementById('slider-main').onclick = () => {
        document.getElementById('lb-img').src = images[currentIdx];
        document.getElementById('lightbox').style.display = 'flex';
    };
    document.querySelector('.close-lightbox').onclick = () => document.getElementById('lightbox').style.display = 'none';

    // ✅ TASTIERA (Frecce Destra/Sinistra e ESC per chiudere)
    document.onkeydown = function(e) {
        if (document.getElementById('product-view').style.display === 'block') {
            if (e.key === "ArrowLeft") updateGallery((currentIdx - 1 + images.length) % images.length);
            if (e.key === "ArrowRight") updateGallery((currentIdx + 1) % images.length);
            if (e.key === "Escape") document.getElementById('lightbox').style.display = 'none';
        }
    };
}

window.onpopstate = () => init();
window.showHome = (e) => { if(e) e.preventDefault(); window.history.pushState(null, null, '/'); init(); window.scrollTo(0,0); };
init();

