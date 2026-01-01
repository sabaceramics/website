const CSV_FILE = 'EtsyListingsDownload.csv';

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error("File CSV non trovato");
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, 
            skipEmptyLines: true, 
            delimiter: ",", 
            quoteChar: '"',
            newline: "", // <--- AGGIUNGI QUESTA: gestisce i ritorni a capo dentro le descrizioni
            transformHeader: function(h) {
                return h.trim().toUpperCase();
            },
            complete: function(results) {
                // Rimuove eventuali righe vuote o malformate che non hanno TITOLO
                const validData = results.data.filter(item => item.TITOLO && item.TITOLO.trim() !== "");
                
                if (window.location.pathname.includes('product.html')) {
                    renderProductDetail(validData);
                } else {
                    renderHomeGrid(validData);
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
        const titleLower = item.TITOLO.toLowerCase();
        let cats = [];
        if (titleLower.includes('raku')) cats.push('raku');
        if (titleLower.includes('saggar')) cats.push('saggar');
        if (titleLower.includes('kintsugi')) cats.push('kintsugi');
        if (titleLower.includes('lamps') || titleLower.includes('lanterns')) cats.push('lamps');
        if (titleLower.includes('plates')) cats.push('plates');
        if (titleLower.includes('vases')) cats.push('vases');
        if (cats.length === 0) cats.push('other');
        const card = document.createElement('a');
        card.href = `product.html?id=${index}`;
        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const item = data[id];
    const container = document.getElementById('product-detail-content');
    if (!item || !container) return;

    let cleanDesc = item.DESCRIZIONE.replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
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
        lightbox.style.display = "flex";
        lightboxImg.src = images[currentIdx];
    };

    window.closeLightbox = function() {
        document.getElementById('lightbox').style.display = "none";
    };

    // Supporto tastiera
    document.onkeydown = function(e) {
        const lb = document.getElementById('lightbox');
        if (lb && lb.style.display === "flex") {
            if (e.key === "ArrowLeft") changeSlide(-1);
            if (e.key === "ArrowRight") changeSlide(1);
            if (e.key === "Escape") closeLightbox();
        }
    };
}

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

