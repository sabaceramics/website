const CSV_FILE = 'EtsyListingsDownload.csv';

// FUNZIONE AGGIUNTA: Serve solo per l'URL pulito
function generateSlug(text) {
    if (!text) return 'product';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error("File CSV non trovato");
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, skipEmptyLines: true, delimiter: ";",
            complete: function(results) {
                if (window.location.pathname.includes('product.html')) {
                    renderProductDetail(results.data);
                } else {
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
        if (descLower.includes('plate') || descLower.includes('piatto')) cats.push('plates');
        if (descLower.includes('vase') || descLower.includes('vaso')) cats.push('vases');

        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-categories', cats.join(' '));

        // --- UNICA MODIFICA: URL SEO ---
        const slug = generateSlug(item.TITOLO);
        const sku = (item.SKU && item.SKU.trim() !== "") ? item.SKU.trim() : "pottery";
        const seoUrl = `product.html?sku=${sku}&name=${slug}&id=${index}`;

        card.innerHTML = `
            <a href="${seoUrl}" class="product-link">
                <img src="${item.IMMAGINE1}" alt="${item.TITOLO}" loading="lazy">
                <div class="product-info">
                    <h3>${item.TITOLO}</h3>
                </div>
            </a>
        `;
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const item = data[id];
    const container = document.getElementById('product-detail-content');

    if (!item || !container) {
        if(container) container.innerHTML = "<p>Product not found.</p>";
        return;
    }

    let images = [];
    for (let i = 1; i <= 10; i++) {
        if (item[`IMMAGINE${i}`]) images.push(item[`IMMAGINE${i}`]);
    }

    let currentIdx = 0;

    // STRUTTURA COPIATA DAL TUO BACKUP
    container.innerHTML = `
        <div class="product-media">
            <div class="main-image-container">
                <img id="main-img" src="${images[0]}" alt="${item.TITOLO}" onclick="openLightbox()">
                ${images.length > 1 ? `
                    <button class="nav-btn prev" onclick="changeSlide(-1)">&#10094;</button>
                    <button class="nav-btn next" onclick="changeSlide(1)">&#10095;</button>
                ` : ''}
            </div>
            <div class="thumbnail-grid">
                ${images.map((img, i) => `<img src="${img}" class="thumb ${i===0?'active':''}" onclick="updateGallery(${i})" alt="thumbnail">`).join('')}
            </div>
        </div>
        <div class="product-details">
            <h1>${item.TITOLO}</h1>
            <div class="description">${item.DESCRIZIONE.replace(/\n/g, '<br>')}</div>
            <a href="https://wa.me/393294020926?text=Interested in: ${encodeURIComponent(item.TITOLO)} (SKU: ${item.SKU})" 
               class="buy-button" target="_blank">Inquire on WhatsApp</a>
        </div>
        <div id="lightbox" class="lightbox" onclick="closeLightbox()"><span class="close-lightbox">&times;</span><img id="lightbox-img" src="" alt="Full view"></div>
    `;

    window.updateGallery = function(idx) {
        currentIdx = idx;
        const mainImg = document.getElementById('main-img');
        if(mainImg) mainImg.src = images[currentIdx];
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
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

    window.closeLightbox = function() {
        const lb = document.getElementById('lightbox');
        if(lb) lb.style.display = "none";
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

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const cat = e.target.getAttribute('data-category').toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            if (cat === 'all') card.style.display = 'block';
            else {
                const itemCats = card.getAttribute('data-categories').split(' ');
                card.style.display = itemCats.includes(cat) ? 'block' : 'none';
            }
        });
    }
});

init();
