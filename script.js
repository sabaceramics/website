// --- NUOVO CONFIGURAZIONE: LINK AL FILE JSON DI GITHUB ---
// Questo link punta alla versione sempre aggiornata dei tuoi dati
const DATA_URL = "https://gist.githubusercontent.com/sabaceramics/ce64a2dbe9ad6ff86f6d5f03681c2cc6/raw/prodotti_etsy.json";

// --- CONFIGURAZIONE CATALOGO ---
let allProductsData = [];     // Contiene tutti i dati scaricati
let currentFilteredData = []; // Contiene i dati filtrati
let currentPage = 1;
const ITEMS_PER_PAGE = 24;    // Numero di prodotti per pagina

async function init() {
    
    // --- MODIFICA: PULIZIA URL FACEBOOK/INSTAGRAM ---
    // Se l'URL contiene parametri di tracciamento (fbclid), li rimuoviamo visivamente
    if (window.location.search.includes('fbclid')) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('fbclid'); // Cancella il codice sporco
        // Aggiorna la barra degli indirizzi senza ricaricare la pagina
        window.history.replaceState(null, '', cleanUrl.toString());
    }
    // ------------------------------------------------

    try {
        // MODIFICA 1: Cache Busting (Aggiunto '?t=' + orario per forzare sempre dati freschi)
        const response = await fetch(DATA_URL + '?t=' + new Date().getTime());
        
        if (!response.ok) throw new Error("Errore nel caricamento dei dati JSON");
        
        const rawJson = await response.json();

        // 2. ADATTAMENTO DATI (Il trucco magico)
        const adaptedData = rawJson.map(item => {
            const newItem = {
                TITLE: item.title,
                DESCRIPTION: item.description,
                SKU: item.sku,
                URL: item.url
            };

            // Mappa l'array di immagini in colonne IMAGE1, IMAGE2...
            if (item.images && Array.isArray(item.images)) {
                item.images.forEach((imgUrl, index) => {
                    newItem[`IMAGE${index + 1}`] = imgUrl;
                });
            }
            return newItem;
        });

        console.log("Dati Etsy caricati con successo via JSON:", adaptedData);

        // 3. Routing
        if (window.location.pathname.includes('product.html')) {
            renderProductDetail(adaptedData);
        } else if (window.location.pathname.includes('catalog.html')) {
            // Siamo nel catalogo: salviamo i dati e inizializziamo
            allProductsData = adaptedData;
            currentFilteredData = allProductsData; 
            renderCatalog();
        } 
        
        // Inizializza lo slider se siamo in Home
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === "") {
            initDynamicSlider();
        }

    } catch (e) { console.error("Errore critico:", e); }
}

// Funzione di supporto per creare lo slug SEO
function createSlug(text) {
    if (!text) return "";
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
        if (!item.TITLE || !item.IMAGE1 || !item.SKU) return;
        
        const titleSlug = createSlug(item.TITLE).substring(0, 50);
        const sku = item.SKU.trim();
        
        const card = document.createElement('a');
        card.href = `product.html?sku=${sku}&name=${titleSlug}`;
        card.className = 'product-card'; 
        
        card.innerHTML = `<img src="${item.IMAGE1.trim()}" alt="${item.TITLE}">`;
        grid.appendChild(card);
    });

    // 3. Renderizziamo i controlli Paginazione
    renderPaginationControls(paginationContainer);
    
    // 4. Scroll in alto
    const filterSection = document.querySelector('.catalog-filters:last-of-type');
    if (filterSection) {
        const headerOffset = document.querySelector('.sticky-nav').offsetHeight || 0;
        const elementPosition = filterSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset - 10; 
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
}

function renderPaginationControls(container) {
    const totalPages = Math.ceil(currentFilteredData.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) return; 

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
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const cat = e.target.getAttribute('data-category').toLowerCase();
        
        // FILTRA I DATI
        if (cat === 'all') {
            currentFilteredData = allProductsData;
        } else {
            currentFilteredData = allProductsData.filter(item => {
                const searchText = (item.TITLE + " " + (item.DESCRIPTION || "")).toLowerCase();
                const root = cat.endsWith('s') ? cat.slice(0, -1) : cat;
                return searchText.includes(root);
            });
        }

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
            if (Math.abs(diff) > 50) { 
                if (diff > 0) callback(1);  
                else callback(-1);          
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
    
    // MODIFICA 2: Gestione "Prodotto non trovato" (in Inglese)
    if (!item) {
        document.getElementById('product-detail-content').innerHTML = `
            <div style="text-align: center; padding: 80px 20px;">
                <h2 style="margin-bottom: 20px; font-family: 'Cormorant Garamond', serif;">Item not found</h2>
                <p>This piece might have been sold or removed from our collection.</p>
                <a href="catalog.html" class="contact-btn" style="display:inline-block; margin-top:30px; text-decoration:none; color:black; border:1px solid black; padding: 10px 20px;">RETURN TO CATALOG</a>
            </div>
        `;
        return; // Ferma tutto il resto per evitare errori
    }

    if (!document.getElementById('js-product-title')) return;

    // --- DA QUI IN POI TUTTO UGUALE ---
    let desc = item.DESCRIPTION || ""; 
    let cleanDesc = desc.replace(/&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const cleanTitle = `${item.TITLE} | Saba Ceramics`;
    const shortDesc = cleanDesc.substring(0, 160);

    document.title = cleanTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", shortDesc);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", cleanTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", shortDesc);
    
    if (item.IMAGE1) {
        document.querySelector('meta[property="og:image"]')?.setAttribute("content", item.IMAGE1.trim());
    }

    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMAGE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    document.getElementById('js-product-title').textContent = item.TITLE;
    document.getElementById('js-product-desc').innerText = cleanDesc; 

    // --- LOGICA BOTTONE ETSY (USA URL DIRETTO) ---
    const ctaBtn = document.querySelector('.contact-btn');
    if (ctaBtn) {
        const directLink = (item.URL || "").trim();
        
        if (directLink) {
            ctaBtn.href = directLink;
            ctaBtn.textContent = "VIEW ON ETSY SHOP";
            ctaBtn.target = "_blank";
        } else {
            ctaBtn.href = "https://www.etsy.com/shop/SabaCeramicArt";
            ctaBtn.textContent = "VISIT ETSY SHOP";
        }
    }
    
    // CARICAMENTO FOTO
    const mainPhoto = document.getElementById('js-main-photo');
    const bgPhoto = document.getElementById('js-main-photo-bg');
    if (mainPhoto && images.length > 0) {
        mainPhoto.src = images[0];
        mainPhoto.alt = item.TITLE;
        if (bgPhoto) bgPhoto.src = images[0]; 
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
                bgImg.src = mainImg.src;
                bgImg.style.opacity = '1';

                mainImg.style.transition = 'none';
                mainImg.style.opacity = '0';
                mainImg.src = nextPhotoUrl;

                setTimeout(() => {
                    mainImg.style.transition = 'opacity 0.1s ease-in-out';
                    mainImg.style.opacity = '1';
                }, 50);
            }
        };

        applyFade('js-main-photo', 'js-main-photo-bg');
        applyFade('js-lightbox-img', 'js-lightbox-img-bg');

        document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    };

    const changeSlide = (dir) => {
        currentIdx = (currentIdx + dir + images.length) % images.length;
        updateGallery(currentIdx, images);
    };

    const openLightbox = () => {
        const lb = document.getElementById('js-lightbox');
        const lbImg = document.getElementById('js-lightbox-img');
        const lbBgImg = document.getElementById('js-lightbox-img-bg'); 
        
        if (lb && lbImg) {
            lb.style.display = "flex";
            lbImg.src = images[currentIdx];
            if (lbBgImg) lbBgImg.src = images[currentIdx];
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
            if (e.target.id === 'js-lightbox' || 
                e.target.classList.contains('lightbox-wrapper') ||
                e.target.classList.contains('cross-fade-container-lb')) {
                closeLightbox();
            }
        };
    }

    document.onkeydown = function(e) {
        if (e.key === "ArrowLeft") changeSlide(-1);
        else if (e.key === "ArrowRight") changeSlide(1);
        else if (e.key === "Escape") closeLightbox();
    };
}

init();

// --- GESTIONE MENU & SLIDER (INVARIATA) ---
document.addEventListener('DOMContentLoaded', () => {
    const catalogBtn = document.getElementById('catalog');
    if (catalogBtn) {
        catalogBtn.addEventListener('click', function(e) {
            if (window.location.pathname.includes('catalog.html')) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    const homeBtn = document.getElementById('home');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            const isHomePage = window.location.pathname.endsWith('/') || 
                               window.location.pathname.includes('index.html') ||
                               window.location.pathname === "";
            if (isHomePage) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                history.pushState(null, null, window.location.pathname);
            }
        });
    }

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

// --- SLIDER HOME ---
function initDynamicSlider() {
    const track = document.getElementById('js-slider-track');
    const container = document.getElementById('js-slider-container');
    if (!track || !container) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let startY;
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

    const start = (e) => {
        isDown = true;
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        startX = pageX - container.offsetLeft;
        startY = pageY;
        scrollLeft = container.scrollLeft;
    };

    const end = () => { isDown = false; };

    const move = (e) => {
        if (!isDown) return;
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        const x = pageX - container.offsetLeft;
        const walk = (x - startX) * 2;
        const diffX = Math.abs(pageX - startX);
        const diffY = Math.abs(pageY - startY);

        if (diffX > diffY) {
            if (e.cancelable) e.preventDefault();
            container.scrollLeft = scrollLeft - walk;
        } else {
            isDown = false; 
        }
    };

    container.addEventListener('mousedown', start);
    window.addEventListener('mouseup', end);
    container.addEventListener('mousemove', move);
    container.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end);
    container.addEventListener('touchmove', move, { passive: false }); 

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
