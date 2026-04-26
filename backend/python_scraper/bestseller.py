import requests
import re
import os
import sys
import json
from bs4 import BeautifulSoup
from decimal import Decimal
from urllib.parse import urlparse, urlunparse, urlencode
from dotenv import load_dotenv

load_dotenv()

SCRAPERAPI_KEY = os.environ.get("SCRAPERAPI_KEY")
AFFILIATE_TAG = "sudhanshu0eb-21"  # Or your affiliate ID

def get_scraperapi_url(url):
    return f"http://api.scraperapi.com?api_key={SCRAPERAPI_KEY}&url={url}&render=true"

def clean_price(price_str):
    cleaned_price = re.sub(r"[^\d.]", "", price_str)
    return float(Decimal(cleaned_price)) if cleaned_price else None

def normalize_url(url):
    parsed_url = urlparse(url)
    clean_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path, "", "", ""))
    return clean_url

def add_affiliate_tag(url):
    parsed_url = urlparse(url)
    query_params = {"tag": AFFILIATE_TAG}
    affiliate_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path, "", urlencode(query_params), ""))
    return affiliate_url

def scrape_amazon_bestsellers(start=0, count=8):
    url = "https://www.amazon.in/gp/bestsellers/"
    scraperapi_url = get_scraperapi_url(url)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(scraperapi_url, timeout=10)
        if response.status_code == 401:
            response = requests.get(url, headers=headers, timeout=10)
    except:
        try:
            response = requests.get(url, headers=headers, timeout=10)
        except:
            return []

    extracted_products = []
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, "html.parser")
        products = soup.find_all("div", class_="p13n-sc-uncoverable-faceout")  

        for product in products:
            title_tag = product.find("div", class_="p13n-sc-truncate") or product.find("span", class_="a-size-medium")
            title = title_tag.text.strip() if title_tag else "No title found"

            price_tag = product.find("span", class_="_cDEzb_p13n-sc-price_3mJ9Z") or product.find("span", class_="a-price-whole")
            price = clean_price(price_tag.get_text(strip=True)) if price_tag else None

            img_tag = product.find("img")
            img_url = img_tag["src"] if img_tag else None

            link_tag = product.find("a", class_="a-link-normal")
            product_url = normalize_url("https://www.amazon.in" + link_tag["href"]) if link_tag else None

            if product_url:
                product_url = add_affiliate_tag(product_url)

            if img_url and product_url and title and price is not None:
                extracted_products.append({
                    "title": title,
                    "current_price": price,
                    "image_url": img_url,
                    "product_url": product_url
                })

        return extracted_products[start : start + count]  
    return []

if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    result = scrape_amazon_bestsellers(start, count)
    print(json.dumps(result))
