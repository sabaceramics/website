const CSV_FILE = 'EtsyListingsDownload.csv';

async function init() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) throw new Error("File CSV non trovato");
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true, 
            skipEmptyLines: true, 
            delimiter: ",", // Se il tuo CSV usa il punto e virgola, cambia qui in ";"
            quoteChar: '"',
            transformHeader: function(h) {
                return h.replace(/^\ufeff/, '').replace(/"/g, '').trim().toUpperCase();
            },
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

// Funzione di supporto per creare lo slug SEO
function createSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Rimuove accenti
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')     // Spazi diventano trattini
        .replace(/[^\w-]+/g, '')  // Rimuove caratteri speciali
        .replace(/--+/g, '-');    // Evita trattini doppi
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    data.forEach((item) => {
        if (!item.TITOLO || !item.IMMAGINE1 || !item.SKU) return;  
        const titleSlug = createSlug(item.TITOLO).substring(0, 50);
        const fullId = `${titleSlug}-sku-${item.SKU.trim()}`;
        const card = document.createElement('a');
        card.href = `product.html?id=${fullId}`;
        const titleLower = item.TITOLO.toLowerCase();
        let cats = [];
        if (titleLower.includes('raku')) cats.push('raku');
        if (titleLower.includes('saggar')) cats.push('saggar');
        if (titleLower.includes('kintsugi')) cats.push('kintsugi');
        if (titleLower.includes('vases')) cats.push('vases');
        if (cats.length === 0) cats.push('other');
        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const fullId = params.get('id'); // Es: "vaso-raku-sku-5"
    if (!fullId) return;
    const skuFromUrl = fullId.split('-sku-').pop();
    const item = data.find(product => product.SKU && product.SKU.trim() === skuFromUrl);
    if (!item || !document.getElementById('js-product-title')) return;
    let desc = item.DESCRIZIONE || ""; 
    let cleanDesc = desc.replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    // 2. Inserimento Dati nell'HTML (DOM Manipulation)
    document.getElementById('js-product-title').textContent = item.TITOLO;
    document.getElementById('js-product-desc').innerText = cleanDesc; 

    const mainPhoto = document.getElementById('js-main-photo');
    mainPhoto.src = images[0];
    mainPhoto.alt = item.TITOLO;

    // Miniature
    const thumbContainer = document.getElementById('js-thumb-container');
    thumbContainer.innerHTML = ''; 
    
    images.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = url;
        img.className = `thumb ${index === 0 ? 'active' : ''}`;
        img.onclick = () => updateGallery(index, images); 
        thumbContainer.appendChild(img);
    });

    // 3. Setup Event Listeners
    let currentIdx = 0;

    const updateGallery = (index, imgs) => {
        currentIdx = index;
        const mainImg = document.getElementById('js-main-photo');
        const lbImg = document.getElementById('js-lightbox-img');
        
        if (mainImg) mainImg.src = imgs[currentIdx];
        if (lbImg) lbImg.src = imgs[currentIdx];
        
        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    };

    const changeSlide = (dir) => {
        currentIdx = (currentIdx + dir + images.length) % images.length;
        updateGallery(currentIdx, images);
    };

    const openLightbox = () => {
        const lb = document.getElementById('js-lightbox');
        const lbImg = document.getElementById('js-lightbox-img');
        lb.style.display = "flex";
        lbImg.src = images[currentIdx];
    };

    const closeLightbox = () => {
        document.getElementById('js-lightbox').style.display = "none";
    };

    document.getElementById('js-btn-prev').onclick = (e) => { e.stopPropagation(); changeSlide(-1); };
    document.getElementById('js-btn-next').onclick = (e) => { e.stopPropagation(); changeSlide(1); };
    
    document.getElementById('js-slider-wrapper').onclick = openLightbox;
    document.getElementById('js-close-lightbox').onclick = closeLightbox;
    document.getElementById('js-lightbox').onclick = (e) => {
        if(e.target.id === 'js-lightbox') closeLightbox();
    };

    document.onkeydown = function(e) {
        const lb = document.getElementById('js-lightbox');
        if (lb && lb.style.display === "flex") {
            if (e.key === "ArrowLeft") changeSlide(-1);
            if (e.key === "ArrowRight") changeSlide(1);
            if (e.key === "Escape") closeLightbox();
        }
    };
}

// Gestore Filtri Home
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

