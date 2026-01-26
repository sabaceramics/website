import os
import requests
import json

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

# Chiediamo i prodotti e includiamo le immagini
params = {
    "limit": 100,
    "includes": "Images"
}

response = requests.get(url, headers=headers, params=params)

if response.status_code != 200:
    print(f"Errore API Etsy: {response.status_code} - {response.text}")
    exit(1)

data = response.json()
results = data.get("results", [])

print(f"Trovati {len(results)} prodotti attivi.")

# --- TRASFORMAZIONE DATI ---
final_products = []

for item in results:
    # Creiamo l'oggetto pulito per il sito
    product = {
        "title": item.get("title"),
        "description": item.get("description"),
        "sku": str(item.get("listing_id")),
        "url": item.get("url"),
        "price": item.get("price", {}).get("amount"),
        "currency": item.get("price", {}).get("currency_code"),
        "images": []
    }

    # Estraiamo le immagini (prendiamo la full size)
    images = item.get("images", [])
    for img in images:
        img_url = img.get("url_fullxfull") or img.get("url_570xN")
        if img_url:
            product["images"].append(img_url)
    
    final_products.append(product)

# --- SALVATAGGIO FILE ---
with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
    json.dump(final_products, f, indent=4, ensure_ascii=False)

print(f"Salvataggio completato in {OUTPUT_FILE}!")
