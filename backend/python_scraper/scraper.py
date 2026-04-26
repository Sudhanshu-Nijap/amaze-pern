import requests
from bs4 import BeautifulSoup
import re, html, json, sys
from urllib.parse import urlparse, urlunparse, urlencode
import os
from dotenv import load_dotenv

load_dotenv()
# ScraperAPI Key
SCRAPERAPI_KEY = os.environ.get("SCRAPERAPI_KEY")
AFFILIATE_TAG = "sudhanshu0eb-21"  

def get_scraperapi_url(url):
    """Returns the ScraperAPI proxy URL."""
    return f"http://api.scraperapi.com?api_key={SCRAPERAPI_KEY}&url={url}"

def extract_asin(url):
    """Extracts ASIN from an Amazon product URL."""
    match = re.search(r"(?:dp|gp/product)/([A-Z0-9]{10})", url)
    return match.group(1) if match else None

def normalize_url(url):
    """Removes tracking parameters from the Amazon URL."""
    parsed_url = urlparse(url)
    clean_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path, "", "", ""))
    return clean_url

def add_affiliate_tag(url):
    """Appends the Amazon affiliate tag to the product URL."""
    parsed_url = urlparse(url)
    query_params = {"tag": AFFILIATE_TAG}
    affiliate_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path, "", urlencode(query_params), ""))
    return affiliate_url

def amazon_scraper(url):
    """Scrapes product details from Amazon using requests."""
    try:
        scraperapi_url = get_scraperapi_url(url)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            # Try ScraperAPI first
            response = requests.get(scraperapi_url, headers=headers, timeout=20)
            if response.status_code == 401:
                # Fallback to direct request
                response = requests.get(url, headers=headers, timeout=20)
            response.raise_for_status()
        except:
            # Final attempt direct
            response = requests.get(url, headers=headers, timeout=20)
            response.raise_for_status()

        html_source = html.unescape(response.text)
        soup = BeautifulSoup(html_source, "html.parser")

        # Extract ASIN
        asin = extract_asin(url)

        # Extract product title
        title_tag = soup.find("span", {"id": "productTitle"})
        title = title_tag.get_text(strip=True) if title_tag else "No title found"

        # Extract product price
        price_tag = soup.find("span", class_="a-price-whole")
        price = price_tag.get_text(strip=True) if price_tag else "Price not available"

        # Extract product rating
        rating_tag = soup.find("span", {"class": "a-icon-alt"})
        rating = rating_tag.get_text(strip=True) if rating_tag else "Rating not available"

        # Extract product image URL
        image_tag = soup.find("img", {"id": "landingImage"})
        image_url = image_tag['src'] if image_tag else "Image URL not available"

        # Extract additional product details
        product_info = {}
        product_info_table = soup.find("table", {"id": "productDetails_techSpec_section_1"})
        if product_info_table:
            rows = product_info_table.find_all("tr")
            for row in rows:
                th = row.find("th")
                td = row.find("td")
                if th and td:
                    key = th.get_text(strip=True)
                    value = td.get_text(strip=True)
                    product_info[key] = re.sub(r'\u200e', '', value)

        # Alternative extraction if first method fails
        if not product_info:
            detail_bullets = soup.find("div", {"id": "detailBullets_feature_div"})
            if detail_bullets:
                items = detail_bullets.find_all("span", class_="a-list-item")
                for item in items:
                    text = item.get_text(strip=True).split(":", 1)
                    if len(text) == 2:
                        key, value = text
                        product_info[key.strip()] = value.strip()

        # Stock availability check
        out_of_stock = soup.find(string=re.compile(r"Currently unavailable|Out of stock", re.IGNORECASE))
        add_to_cart = soup.find("input", {"id": "add-to-cart-button"})
        buy_now = soup.find("input", {"id": "buy-now-button"})

        stock_status = not bool(out_of_stock) if (add_to_cart or buy_now) else True

        # Convert to affiliate link
        product_url = add_affiliate_tag(normalize_url(url))

        return {
            "asin": asin,
            "title": title,
            "current_price": price,
            "rating": rating,
            "image_url": image_url,
            "product_info": product_info,
            "stock_status": stock_status,
            "url": product_url
        }

    except Exception as e:
        return {"error": f"An error occurred: {e}"}

