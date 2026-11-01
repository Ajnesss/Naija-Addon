FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY manifest.json ./
COPY src ./src
COPY data ./data
EXPOSE 7000
USER node
CMD ["npm", "start"]
