import sys
import json
from scraper import amazon_scraper

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
    url = sys.argv[1]
    result = amazon_scraper(url)
    print(json.dumps(result))
