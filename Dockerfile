FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y git ffmpeg imagemagick && \
        rm -rf /var/lib/apt/lists/*

        COPY package.json package-lock.json ./
        RUN npm ci --omit=dev

        COPY . .

        RUN mkdir -p session data lib/data

        ENV PORT=7860
        ENV NODE_ENV=production

        EXPOSE 7860

        CMD ["node", "--max-old-space-size=512", "index.js"]
        
