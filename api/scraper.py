import requests
from bs4 import BeautifulSoup
from datetime import datetime

def scrape_ipu_notices():
    url = "http://www.ipu.ac.in/notices.php"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        notices = []
        
        # Try multiple selector strategies
        # Strategy 1: Find all links in content area
        links = soup.select("div.content a") or soup.select("table a") or soup.find_all('a', href=True)
        
        # Filter only PDF/notice links
        notice_count = 0
        for link in links:
            if notice_count >= 20:
                break
                
            title = link.get_text(strip=True)
            href = link.get('href', '')
            
            if not href or not title or len(title) < 10:
                continue
            
            # Filter for likely notices (PDFs, notice pages)
            if not any(keyword in href.lower() for keyword in ['pdf', 'notice', 'upload', 'download']):
                continue
                
            if not href.startswith('http'):
                href = f"http://www.ipu.ac.in/{href.lstrip('/')}"
            
            date_str = datetime.now().strftime("%Y-%m-%d")
            
            # Try to extract date from surrounding elements
            try:
                row = link.find_parent('tr')
                if row:
                    cols = row.find_all('td')
                    for col in cols:
                        text = col.get_text(strip=True)
                        # Look for date patterns (DD-MM-YYYY, DD/MM/YYYY, etc.)
                        if any(sep in text for sep in ['-', '/', '.']):
                            parts = text.replace('.', '-').replace('/', '-').split('-')
                            if len(parts) == 3 and all(p.isdigit() for p in parts):
                                date_str = text
                                break
            except:
                pass

            notices.append({
                "title": title[:200],  # Limit title length
                "link": href,
                "date": date_str
            })
            notice_count += 1
            
        return notices if notices else [{"title": "No notices found", "link": url, "date": datetime.now().strftime("%Y-%m-%d")}]

    except Exception as e:
        print(f"Scraper Error: {e}")
        return [{"title": f"Scraper error: {str(e)}", "link": url, "date": datetime.now().strftime("%Y-%m-%d")}]

if __name__ == "__main__":
    print(scrape_ipu_notices())
