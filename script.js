function renderProductDetail(data) {
    // --- Lettura SKU dall'URL tipo /product/19/slug ---
    let sku = null;
    const pathParts = window.location.pathname.split('/'); // ['', 'product', '19', 'slug']
    if (pathParts.length >= 3 && pathParts[1] === 'product') {
        sku = pathParts[2]; // prende '19'
    }

    const item = data.find(d => d.SKU === sku); // trova il prodotto corretto
    const container = document.getElementById('product-detail-content');
    if (!item || !container) return;

    // --- PULIZIA DESCRIZIONE ---
    let cleanDesc = (item.DESCRIZIONE || "")
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');

    // --- IMMAGINI ---
    let images = [];
    for (let i = 1; i <= 10; i++) {
        const url = item[`IMMAGINE${i}`];
        if (url && url.trim() !== "") images.push(url.trim());
    }

    // --- GENERAZIONE THUMBNAILS ---
    let thumbnailsHtml = '';
    images.forEach((url, i) => {
        thumbnailsHtml += `<img src="${url}" class="thumb ${i===0?'active':''}" onclick="updateGallery(${i})">`;
    });

    // --- HTML DETTAGLIO PRODOTTO ---
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

    // --- GALLERY / LIGHTBOX ---
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
        if(lightbox && lightboxImg) {
            lightbox.style.display = "flex";
            lightboxImg.src = images[currentIdx];
        }
    };

    window.closeLightbox = function() {
        const lightbox = document.getElementById('lightbox');
        if(lightbox) lightbox.style.display = "none";
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
