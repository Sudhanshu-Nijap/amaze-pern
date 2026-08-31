FROM node:20-slim

# Install Python 3
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node and Python dependencies
COPY package*.json ./
COPY python_scraper/requirements.txt ./python_scraper/
RUN npm install && pip3 install --no-cache-dir --break-system-packages -r python_scraper/requirements.txt

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
