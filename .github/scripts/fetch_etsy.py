import os
import requests
import json
import time

# --- CONFIGURAZIONE ---
API_KEY = os.environ.get("ETSY_API_KEY")
SHOP_ID = os.environ.get("ETSY_SHOP_ID")
OUTPUT_FILE = "prodotti_etsy.json"

if not API_KEY or not SHOP_ID:
    print("ERRORE: Mancano le chiavi API o lo Shop ID nei Secrets!")
    exit(1)

print(f"Connessione a Etsy per lo shop ID: {SHOP_ID}...")

# --- CHIAMATA A ETSY (API v3) ---
url = f"https://openapi.etsy.com/v3/application/shops/{SHOP_ID}/listings/active"

headers = {
    "x-api-key": API_KEY
}

# Chiediamo i prodotti
params = {
    "limit": 100
}

response = requests.get(url, headers=headers, params=params)

if response.status_code != 200:
    print(f"Errore API Etsy: {response.status_code} - {response.text}")
    exit(1)

data = response.json()
results = data.get("results", [])

print(f"Trovati {len(results)} prodotti attivi. Ora recupero le immagini...")

# --- TRASFORMAZIONE DATI E RECUPERO IMMAGINI ---
final_products = []

for item in results:
    listing_id = item.get("listing_id")
    
    # Creiamo l'oggetto pulito per il sito
    product = {
        "title": item.get("title"),
        "description": item.get("description"),
        "sku": str(listing_id),
        "url": item.get("url"),
        "price": item.get("price", {}).get("amount"),
        "currency": item.get("price", {}).get("currency_code"),
        "images": []
    }

    # Etsy API v3 spesso ignora "includes=Images". 
    # Facciamo una chiamata mirata per costringerli a darci le foto di questo prodotto.
    img_url = f"https://openapi.etsy.com/v3/application/listings/{listing_id}/images"
    img_response = requests.get(img_url, headers=headers)
    
    if img_response.status_code == 200:
        img_data = img_response.json()
        images = img_data.get("results", [])
        for img in images:
            # Prendiamo l'immagine grande per la massima qualità
            full_url = img.get("url_fullxfull") or img.get("url_570xN")
            if full_url:
                product["images"].append(full_url)
    else:
        print(f"Errore nel recupero immagini per il prodotto {listing_id}")

    final_products.append(product)
    
    # Piccolissima pausa di 0.2 secondi per non bombardare i server di Etsy
    time.sleep(0.2) 

# --- SALVATAGGIO FILE ---
with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
    json.dump(final_products, f, indent=4, ensure_ascii=False)

print(f"Salvataggio completato con successo in {OUTPUT_FILE}! Immagini scaricate.")
