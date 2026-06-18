FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libasound2 \
    libxshmfence1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


COPY . .

EXPOSE 5000

CMD ["npm","start"]