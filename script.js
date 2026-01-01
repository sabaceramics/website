const CSV_FILE = 'EtsyListingsDownload.csv';

// --- CONFIGURAZIONE CATALOGO ---
let allProductsData = [];    // Contiene tutti i dati del CSV
let currentFilteredData = []; // Contiene i dati dopo aver applicato il filtro
let currentPage = 1;
const ITEMS_PER_PAGE = 24;   // Numero di prodotti per pagina

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
            transformHeader: function(h) {
                return h.replace(/^\ufeff/, '').replace(/"/g, '').trim().toUpperCase();
            },
            complete: function(results) {
                // Routing semplice in base alla pagina
                if (window.location.pathname.includes('product.html')) {
                    renderProductDetail(results.data);
                } else if (window.location.pathname.includes('catalog.html')) {
                    // Siamo nel catalogo: salviamo i dati e inizializziamo
                    allProductsData = results.data;
                    currentFilteredData = allProductsData; // All'inizio vediamo tutto
                    renderCatalog();
                } 
                // Se siamo in index.html non facciamo nulla (o future logiche)
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

// --- NUOVA LOGICA CATALOGO CON PAGINAZIONE ---

function renderCatalog() {
    const grid = document.getElementById('product-grid');
    const paginationContainer = document.getElementById('pagination-controls');
    
    if (!grid) return;
    grid.innerHTML = '';
    paginationContainer.innerHTML = '';

    // 1. Calcoliamo quali prodotti mostrare in base alla pagina
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = currentFilteredData.slice(start, end);

    // 2. Renderizziamo le card
    paginatedItems.forEach((item) => {
        if (!item.TITOLO || !item.IMMAGINE1 || !item.SKU) return;
        
        const titleSlug = createSlug(item.TITOLO).substring(0, 50);
        const sku = item.SKU.trim();
        
        const card = document.createElement('a');
        card.href = `product.html?sku=${sku}&name=${titleSlug}`;
        card.className = 'product-card'; // Nota: le classi filtro non servono più qui, filtriamo sui dati
        
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });

    // 3. Renderizziamo i controlli Paginazione
    renderPaginationControls(paginationContainer);
    
    // Scroll in alto quando cambia pagina
    if(window.scrollY > 400) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationControls(container) {
    const totalPages = Math.ceil(currentFilteredData.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) return; // Se c'è una sola pagina, nascondiamo i bottoni

    const prevBtn = document.createElement('button');
    prevBtn.innerText = "< PREV";
    prevBtn.className = "page-btn";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderCatalog();
        }
    };

    const nextBtn = document.createElement('button');
    nextBtn.innerText = "NEXT >";
    nextBtn.className = "page-btn";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderCatalog();
        }
    };

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
}

// Gestore Filtri Catalogo
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('filter-btn')) {
        // Aggiorna stile bottoni
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const cat = e.target.getAttribute('data-category').toLowerCase();
        
        // FILTRA I DATI
        if (cat === 'all') {
            currentFilteredData = allProductsData;
        } else {
            currentFilteredData = allProductsData.filter(item => {
                const searchText = (item.TITOLO + " " + (item.DESCRIZIONE || "")).toLowerCase();
                if (cat === 'vases') return searchText.includes('vas'); // Logica speciale per vasi
                return searchText.includes(cat);
            });
        }

        // Resetta a pagina 1 quando si cambia filtro
        currentPage = 1;
        renderCatalog();
    }
});

// --- LOGICA PRODOTTO (Invariata) ---

function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const skuFromUrl = params.get('sku'); 
    if (!skuFromUrl) return;
    const item = data.find(product => product.SKU && product.SKU.trim() === skuFromUrl);
    if (!item || !document.getElementById('js-product-title')) return;

    let desc = item.DESCRIZIONE || ""; 
    let cleanDesc = desc.replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const cleanTitle = `${item.TITOLO} | Saba Ceramics`;
    const shortDesc = cleanDesc.substring(0, 160);

    document.title = cleanTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", shortDesc);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", cleanTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", shortDesc);
    if (item.IMMAGINE1) {
        document.querySelector('meta[property="og:image"]')?.setAttribute("content", item.IMMAGINE1.trim());
    }

    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    document.getElementById('js-product-title').textContent = item.TITOLO;
    document.getElementById('js-product-desc').innerText = cleanDesc; 

    const mainPhoto = document.getElementById('js-main-photo');
    if (mainPhoto && images.length > 0) {
        mainPhoto.src = images[0];
        mainPhoto.alt = item.TITOLO;
    }

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

    document.onkeydown = function(e) {
        const lb = document.getElementById('js-lightbox');
        if (lb && lb.style.display === "flex") {
            if (e.key === "ArrowLeft") changeSlide(-1);
            if (e.key === "ArrowRight") changeSlide(1);
            if (e.key === "Escape") closeLightbox();
        }
    };
}

init();
