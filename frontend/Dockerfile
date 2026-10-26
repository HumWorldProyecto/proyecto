FROM node:24.20.0-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build && mkdir -p node_modules/.vite-temp && chown -R node:node node_modules/.vite-temp
USER node
EXPOSE 4173
# Preview is for local academic demonstrations, not an internet production server.
CMD ["npm", "run", "preview", "--", "--port", "4173"]
