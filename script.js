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
                
                // AGGIUNTA: Inizializza lo slider se siamo in Home
                if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
                    initDynamicSlider();
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

// Rendering catalogo
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
        card.className = 'product-card'; 
        
        card.innerHTML = `<img src="${item.IMMAGINE1.trim()}" alt="${item.TITOLO}">`;
        grid.appendChild(card);
    });

    // 3. Renderizziamo i controlli Paginazione
    renderPaginationControls(paginationContainer);
    
    // 4. Scroll in alto fino ai filtri senza coprire l'header
    const filterSection = document.querySelector('.catalog-filters:last-of-type');
    if (filterSection) {
        const headerOffset = document.querySelector('.sticky-nav').offsetHeight || 0;
        const elementPosition = filterSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset - 10; // 10px margine
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
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
                const root = cat.endsWith('s') ? cat.slice(0, -1) : cat;
                return searchText.includes(root);
});
        }

        // Resetta a pagina 1 quando si cambia filtro
        currentPage = 1;
        renderCatalog();
    }
});


// --- FUNZIONE DI SUPPORTO PER SWIPE MOBILE (SOLO SOTTO 768px) ---

function enableMobileSwipe(element, callback) {
    let touchStartX = 0;
    let touchEndX = 0;

    element.addEventListener('touchstart', e => {
        if (window.innerWidth <= 768) {
            touchStartX = e.changedTouches[0].screenX;
        }
    }, { passive: true });

    element.addEventListener('touchend', e => {
        if (window.innerWidth <= 768) {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { // Sensibilità dello swipe
                if (diff > 0) callback(1);  // Swipe sinistra -> avanti
                else callback(-1);          // Swipe destra -> indietro
            }
        }
    }, { passive: true });
}

// --- LOGICA PRODOTTO ---

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

    // CARICAMENTO INIZIALE DOPPIO (Sopra e Sotto)
    const mainPhoto = document.getElementById('js-main-photo');
    const bgPhoto = document.getElementById('js-main-photo-bg');
    if (mainPhoto && images.length > 0) {
        mainPhoto.src = images[0];
        mainPhoto.alt = item.TITOLO;
        if (bgPhoto) bgPhoto.src = images[0]; // Fondamentale per il primo cambio
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
    const nextPhotoUrl = imgs[currentIdx];

    const applyFade = (mainId, bgId) => {
        const mainImg = document.getElementById(mainId);
        const bgImg = document.getElementById(bgId);

        if (mainImg && bgImg) {
            // 1. Metti l'immagine ATTUALE (quella che l'utente vede ora) nello sfondo
            // Questo crea il "cuscinetto" per non far vedere il nero
            bgImg.src = mainImg.src;

            // 2. Rendi l'immagine sopra trasparente istantaneamente
            mainImg.style.transition = 'none'; 
            mainImg.style.opacity = '0';

            // 3. Cambia la sorgente dell'immagine sopra con la NUOVA foto
            mainImg.src = nextPhotoUrl;

            // 4. Quando la nuova immagine è caricata, la facciamo riapparire sfumando
            mainImg.onload = () => {
                mainImg.style.transition = 'opacity 0.25s ease-in-out';
                mainImg.style.opacity = '1';
                // Puliamo l'evento onload per evitare loop
                mainImg.onload = null;
            };
        }
    };

    applyFade('js-main-photo', 'js-main-photo-bg');
    applyFade('js-lightbox-img', 'js-lightbox-img-bg');

    // Aggiorna le miniature
    document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
};

    const changeSlide = (dir) => {
        currentIdx = (currentIdx + dir + images.length) % images.length;
        updateGallery(currentIdx, images);
    };

    const openLightbox = () => {
        const lb = document.getElementById('js-lightbox');
        const lbImg = document.getElementById('js-lightbox-img');
        const lbBgImg = document.getElementById('js-lightbox-img-bg'); // AGGIUNTO
    
        if (lb && lbImg) {
            lb.style.display = "flex";
            lbImg.src = images[currentIdx];
        
        // Sincronizziamo subito l'immagine di sfondo del lightbox
            if (lbBgImg) {
                lbBgImg.src = images[currentIdx];
            }
        
        // Reset opacità per sicurezza, così la foto è subito visibile
            lbImg.style.opacity = '1';
    }
};

    const closeLightbox = () => {
        const lb = document.getElementById('js-lightbox');
        if (lb) lb.style.display = "none";
    };

    const lbPrev = document.getElementById('js-lb-prev');
    const lbNext = document.getElementById('js-lb-next');
    const mainPhotoImg = document.getElementById('js-main-photo');
    const closeLbBtn = document.getElementById('js-close-lightbox');
    const lightboxOverlay = document.getElementById('js-lightbox');
    const mainPrev = document.getElementById('js-prev-btn');
    const mainNext = document.getElementById('js-next-btn');
    
    if (mainPhotoImg) {
        mainPhotoImg.style.cursor = "zoom-in";
        mainPhotoImg.onclick = openLightbox;
    }

    const mainWrapper = document.querySelector('.slider-wrapper');
    const lbImgElement = document.getElementById('js-lightbox-img');
    if (mainWrapper) enableMobileSwipe(mainWrapper, changeSlide);
    if (lbImgElement) enableMobileSwipe(lbImgElement, changeSlide);
    if (mainPrev) mainPrev.onclick = (e) => { e.stopPropagation(); changeSlide(-1); };
    if (mainNext) mainNext.onclick = (e) => { e.stopPropagation(); changeSlide(1); };
    if (lbPrev) lbPrev.onclick = (e) => { e.stopPropagation(); changeSlide(-1); };
    if (lbNext) lbNext.onclick = (e) => { e.stopPropagation(); changeSlide(1); };
    if (closeLbBtn) closeLbBtn.onclick = closeLightbox;
    if (lightboxOverlay) {
        lightboxOverlay.onclick = (e) => {
            if (e.target.id === 'js-lightbox') closeLightbox();
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


// --- GESTIONE SCROLL FLUIDO PER IL MENU ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Logica per il tasto CATALOG (id="catalog")
    const catalogBtn = document.getElementById('catalog');
    if (catalogBtn) {
        catalogBtn.addEventListener('click', function(e) {
            if (window.location.pathname.includes('catalog.html')) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // 2. Logica per il tasto HOME (id="home")
    const homeBtn = document.getElementById('home');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            const isHomePage = window.location.pathname.endsWith('/') || 
                               window.location.pathname.includes('index.html') ||
                               window.location.pathname === "";

            if (isHomePage) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Opzionale: pulisce l'URL dall'ancora #top
                history.pushState(null, null, window.location.pathname);
            }
        });
    }

    // 3. Logica per il tasto ABOUT US (id="about-nav")
    const aboutBtn = document.getElementById('about-nav');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', function(e) {
            if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
                const section = document.getElementById('about');
                if (section) {
                    e.preventDefault();
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }
});


document.addEventListener('keydown', function(e) {
    // Funziona solo se siamo in catalog.html
    if (window.location.pathname.includes('catalog.html')) {
        const totalPages = Math.ceil(currentFilteredData.length / ITEMS_PER_PAGE);
        
        if (e.key === "ArrowRight") {
            if (currentPage < totalPages) {
                currentPage++;
                renderCatalog();
            }
        } else if (e.key === "ArrowLeft") {
            if (currentPage > 1) {
                currentPage--;
                renderCatalog();
            }
        }
    }
});

// --- LOGICA SLIDER DINAMICO (SOLO PER HOME) ---

function initDynamicSlider() {
    const track = document.getElementById('js-slider-track');
    const container = document.getElementById('js-slider-container');
    if (!track || !container) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let currentId = 1;
    let loadedCount = 0;

    function loadNextImage() {
        const img = document.createElement('img');
        img.src = `images/pres${currentId}.jpg`;
        
        img.onload = function() {
            track.appendChild(this);
            loadedCount++;
            currentId++;
            loadNextImage(); 
        };

        img.onerror = function() {
            if (this.src.endsWith('.jpg')) {
                this.src = `images/pres${currentId}.JPG`;
            } else {
                finalizeSlider();
            }
        };
    }

    function finalizeSlider() {
        if (loadedCount > 0) {
            track.innerHTML += track.innerHTML;
            startAutoScroll();
        }
    }

    // --- LOGICA DRAG & TOUCH UNIFICATA ---
    
    let startY; // Aggiungiamo questa variabile all'inizio dello script insieme alle altre

    const start = (e) => {
        isDown = true;
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY; // Registriamo anche la Y iniziale
        
        startX = pageX - container.offsetLeft;
        startY = pageY; // Serve per capire la direzione del movimento
        scrollLeft = container.scrollLeft;
    };

    const end = () => {
        isDown = false;
    };

    const move = (e) => {
        if (!isDown) return;
        
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        
        const x = pageX - container.offsetLeft;
        const walk = (x - startX) * 2;

        // Calcoliamo quanto ci siamo mossi in orizzontale e in verticale
        const diffX = Math.abs(pageX - startX);
        const diffY = Math.abs(pageY - startY);

        // Se il movimento è più orizzontale che verticale, muoviamo lo slider
        if (diffX > diffY) {
            if (e.cancelable) e.preventDefault(); // Blocca lo scroll pagina SOLO se scorriamo lateralmente
            container.scrollLeft = scrollLeft - walk;
        } else {
            // Se l'utente sta andando su/giù, interrompiamo il drag dello slider
            isDown = false; 
        }
    };

    // Eventi Mouse
    container.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    container.addEventListener('mousemove', move);

    // Eventi Touch (per Mobile)
    container.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end);
    container.addEventListener('touchmove', move, { passive: false }); 
    // Nota: passive: false è necessario per permettere e.preventDefault() nel movimento

    function startAutoScroll() {
        function step() {
            if (!isDown) {
                container.scrollLeft += 1;
                if (container.scrollLeft >= track.scrollWidth / 2) {
                    container.scrollLeft = 0;
                }
            }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    loadNextImage();
}










