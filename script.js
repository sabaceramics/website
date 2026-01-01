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
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')     
        .replace(/[^\w-]+/g, '')  
        .replace(/--+/g, '-');   
}

function renderHomeGrid(data) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    data.forEach((item) => {
        if (!item.TITOLO || !item.IMMAGINE1 || !item.SKU) return;
        const titleSlug = createSlug(item.TITOLO).substring(0, 50);
        const sku = item.SKU.trim();
        const card = document.createElement('a');
        card.href = `product.html?sku=${sku}&name=${titleSlug}`;
        const searchText = (item.TITOLO + " " + (item.DESCRIZIONE || "")).toLowerCase();
        let cats = [];
        if (searchText.includes('raku')) cats.push('raku');
        if (searchText.includes('saggar')) cats.push('saggar');
        if (searchText.includes('kintsugi')) cats.push('kintsugi');
        if (searchText.includes('vas')) cats.push('vases');
        
        if (cats.length === 0) cats.push('other');
        
        card.className = `product-card ${cats.join(' ')}`;
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });
}

function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const skuFromUrl = params.get('sku'); 
    if (!skuFromUrl) return;
    const item = data.find(product => product.SKU && product.SKU.trim() === skuFromUrl);
    if (!item || !document.getElementById('js-product-title')) return;

    // 1. Preparazione e Pulizia Testi (Spostato qui sopra per poterli usare subito)
    let desc = item.DESCRIZIONE || ""; 
    let cleanDesc = desc.replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const cleanTitle = `${item.TITOLO} | Saba Ceramics`;
    const shortDesc = cleanDesc.substring(0, 160);

    // 2. LOGICA SEO & SOCIAL (Dinamica)
    document.title = cleanTitle;
    
    // Meta description classica
    document.querySelector('meta[name="description"]')?.setAttribute("content", shortDesc);
    
    // Open Graph (Social)
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", cleanTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", shortDesc);
    if (item.IMMAGINE1) {
        document.querySelector('meta[property="og:image"]')?.setAttribute("content", item.IMMAGINE1.trim());
    }

    // 3. Preparazione Immagini
    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    // 4. Inserimento Dati nell'HTML (DOM Manipulation)
    document.getElementById('js-product-title').textContent = item.TITOLO;
    document.getElementById('js-product-desc').innerText = cleanDesc; 

    const mainPhoto = document.getElementById('js-main-photo');
    if (mainPhoto && images.length > 0) {
        mainPhoto.src = images[0];
        mainPhoto.alt = item.TITOLO;
    }

    // Miniature
    const thumbContainer = document.getElementById('js-thumb-container');
    if (thumbContainer) {
        thumbContainer.innerHTML = ''; 
        images.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = url;
            img.className = `thumb ${index === 0 ? 'active' : ''}`;
            img.onclick = () => updateGallery(index, images); 
            thumbContainer.appendChild(img);
        });
    }

    // 5. Setup Galleria e Event Listeners
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
        if (lb && lbImg) {
            lb.style.display = "flex";
            lbImg.src = images[currentIdx];
        }
    };

    const closeLightbox = () => {
        const lb = document.getElementById('js-lightbox');
        if (lb) lb.style.display = "none";
    };

    // Assegnazione Click
    const btnPrev = document.getElementById('js-btn-prev');
    const btnNext = document.getElementById('js-btn-next');
    const sliderWrapper = document.getElementById('js-slider-wrapper');
    const closeLbBtn = document.getElementById('js-close-lightbox');
    const lightboxContainer = document.getElementById('js-lightbox');

    if (btnPrev) btnPrev.onclick = (e) => { e.stopPropagation(); changeSlide(-1); };
    if (btnNext) btnNext.onclick = (e) => { e.stopPropagation(); changeSlide(1); };
    if (sliderWrapper) sliderWrapper.onclick = openLightbox;
    if (closeLbBtn) closeLbBtn.onclick = closeLightbox;
    if (lightboxContainer) {
        lightboxContainer.onclick = (e) => {
            if(e.target.id === 'js-lightbox') closeLightbox();
        };
    }

    // Tastiera
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





