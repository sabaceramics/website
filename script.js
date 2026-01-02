const CSV_FILE = 'EtsyListingsDownload.csv';

// --- CONFIGURAZIONE CATALOGO ---
let allProductsData = [];    
let currentFilteredData = []; 
let currentPage = 1;
const ITEMS_PER_PAGE = 24;   

// --- CONFIGURAZIONE PRODOTTO E LIGHTBOX ---
let currentProductImages = []; // Array per contenere le foto del prodotto corrente
let currentImageIndex = 0;     // Indice della foto visualizzata

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
                // Gestione Pagine
                if (window.location.pathname.includes('product.html')) {
                    renderProductDetail(results.data);
                } else if (window.location.pathname.includes('catalog.html')) {
                    allProductsData = results.data;
                    currentFilteredData = allProductsData; 
                    renderCatalog();
                } 
                
                // Slider Home
                if (document.getElementById('js-slider-track')) {
                    initHomeSlider(results.data);
                }
            }
        });

        setupNavigation(); // Attiva la logica per il tasto Home e Highlight

    } catch (error) {
        console.error("Errore:", error);
    }
}

// --- LOGICA NAVIGAZIONE (PUNTO 3) ---
function setupNavigation() {
    // Gestione Highlight link attivo
    const navLinks = document.querySelectorAll('nav a');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Logica Scroll Top per Home
        if (href === 'index.html' || href === '/') {
            link.addEventListener('click', (e) => {
                // Se siamo già in index.html, previeni il reload e scrolla su
                if (currentPath.endsWith('index.html') || currentPath === '/') {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // Active state style
        if (href === 'index.html' && (currentPath.endsWith('index.html') || currentPath === '/')) {
            link.classList.add('active');
        } else if (href.includes('catalog.html') && currentPath.includes('catalog.html')) {
            link.classList.add('active');
        }
    });
}

// --- CATALOGO ---
function renderCatalog() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToShow = currentFilteredData.slice(start, end);

    itemsToShow.forEach(product => {
        if (!product.IMMAGINE1) return;
        const card = document.createElement('a');
        card.href = `product.html?sku=${product.SKU}`; 
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.IMMAGINE1}" alt="${product.TITOLO}" loading="lazy">
        `;
        grid.appendChild(card);
    });

    renderPagination();
    setupFilters();
}

function setupFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            
            const category = btn.dataset.category.toLowerCase();
            if (category === 'all') {
                currentFilteredData = allProductsData;
            } else {
                currentFilteredData = allProductsData.filter(p => {
                    const text = (p.TITOLO + " " + p.TAG + " " + p.DESCRIZIONE).toLowerCase();
                    return text.includes(category);
                });
            }
            currentPage = 1;
            renderCatalog();
        });
    });
}

function renderPagination() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(currentFilteredData.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.className = 'page-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderCatalog(); window.scrollTo(0,0); };
    container.appendChild(prevBtn);

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderCatalog(); window.scrollTo(0,0); };
    container.appendChild(nextBtn);
}

// --- DETTAGLIO PRODOTTO ---
function renderProductDetail(data) {
    const params = new URLSearchParams(window.location.search);
    const sku = params.get('sku');
    const product = data.find(p => p.SKU === sku);

    if (!product) {
        document.getElementById('js-product-title').textContent = 'Product not found';
        return;
    }

    // Popola testi
    document.getElementById('js-product-title').textContent = product.TITOLO;
    document.getElementById('js-product-desc').textContent = product.DESCRIZIONE;

    // Raccogli immagini
    currentProductImages = [];
    for (let i = 1; i <= 10; i++) {
        if (product[`IMMAGINE${i}`]) {
            currentProductImages.push(product[`IMMAGINE${i}`]);
        }
    }

    // Setup Slider
    const mainImg = document.getElementById('js-main-photo');
    const thumbContainer = document.getElementById('js-thumb-container');
    
    // Mostra prima immagine
    updateMainImage(0);

    // Genera miniature
    thumbContainer.innerHTML = '';
    currentProductImages.forEach((imgUrl, index) => {
        const thumb = document.createElement('img');
        thumb.src = imgUrl;
        thumb.className = index === 0 ? 'thumb active' : 'thumb';
        thumb.onclick = () => updateMainImage(index);
        thumbContainer.appendChild(thumb);
    });

    // Eventi frecce slider normale
    document.getElementById('js-prev-btn').onclick = () => changeImage(-1);
    document.getElementById('js-next-btn').onclick = () => changeImage(1);

    // --- SETUP LIGHTBOX (PUNTO 1) ---
    // Cliccando la foto principale si apre il lightbox
    mainImg.onclick = () => openLightbox();
    
    // Eventi chiusura lightbox
    document.getElementById('js-close-lightbox').onclick = closeLightbox;
    document.getElementById('js-lightbox').onclick = (e) => {
        if(e.target.id === 'js-lightbox') closeLightbox();
    };

    // Eventi tastiera (Frecce e ESC)
    document.addEventListener('keydown', handleKeyboard);
}

function updateMainImage(index) {
    currentImageIndex = index;
    const mainImg = document.getElementById('js-main-photo');
    mainImg.src = currentProductImages[currentImageIndex];

    // Aggiorna stato miniature
    const thumbs = document.querySelectorAll('.thumb');
    thumbs.forEach((t, i) => {
        if (i === index) t.classList.add('active');
        else t.classList.remove('active');
    });
}

function changeImage(direction) {
    let newIndex = currentImageIndex + direction;
    if (newIndex < 0) newIndex = currentProductImages.length - 1;
    if (newIndex >= currentProductImages.length) newIndex = 0;
    updateMainImage(newIndex);
    
    // Se il lightbox è aperto, aggiorniamo anche quello
    const lightbox = document.getElementById('js-lightbox');
    if (lightbox.style.display === 'flex') {
        document.getElementById('js-lightbox-img').src = currentProductImages[newIndex];
    }
}

// --- FUNZIONI LIGHTBOX ---
function openLightbox() {
    const lightbox = document.getElementById('js-lightbox');
    const lightboxImg = document.getElementById('js-lightbox-img');
    
    lightboxImg.src = currentProductImages[currentImageIndex];
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Blocca scroll pagina sotto
}

function closeLightbox() {
    const lightbox = document.getElementById('js-lightbox');
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto'; // Riabilita scroll
}

function handleKeyboard(e) {
    const lightbox = document.getElementById('js-lightbox');
    // Le frecce funzionano sia per lo slider normale che per il lightbox
    if (e.key === 'ArrowLeft') changeImage(-1);
    if (e.key === 'ArrowRight') changeImage(1);
    
    // ESC chiude solo se il lightbox è aperto
    if (e.key === 'Escape' && lightbox.style.display === 'flex') {
        closeLightbox();
    }
}

// --- SLIDER HOME ---
function initHomeSlider(data) {
    const track = document.getElementById('js-slider-track');
    const container = document.getElementById('js-slider-container');
    
    // Mescola e prendi 10 immagini
    const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    shuffled.forEach(item => {
        if(item.IMMAGINE1) {
            const img = document.createElement('img');
            img.src = item.IMMAGINE1;
            track.appendChild(img);
        }
    });

    // Duplica per loop infinito
    const clone = track.innerHTML;
    track.innerHTML += clone;

    // Drag Logic
    let isDown = false;
    let startX;
    let scrollLeft;

    const start = (e) => {
        isDown = true;
        container.classList.add('active');
        startX = (e.pageX || e.touches[0].pageX) - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    };

    const end = () => {
        isDown = false;
        container.classList.remove('active');
    };

    const move = (e) => {
        if (!isDown) return;
        const x = (e.pageX || e.touches[0].pageX) - container.offsetLeft;
        const walk = (x - startX) * 2; 
        
        const diffX = Math.abs((e.pageX || e.touches[0].pageX) - startX);
        
        // Su mobile, se stiamo scrollando orizzontalmente, preveniamo lo scroll pagina
        if(e.type === 'touchmove' && diffX > 10) {
           if(e.cancelable) e.preventDefault();
        }
        
        container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    container.addEventListener('mousemove', move);

    container.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end);
    container.addEventListener('touchmove', move, { passive: false });

    // Auto Scroll
    function autoScroll() {
        if (!isDown) {
            container.scrollLeft += 1;
            if (container.scrollLeft >= track.scrollWidth / 2) {
                container.scrollLeft = 0;
            }
        }
        requestAnimationFrame(autoScroll);
    }
    requestAnimationFrame(autoScroll);
}

// Avvio
init();
