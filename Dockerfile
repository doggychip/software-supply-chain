# Docker Official Node 24 image, distributed through Amazon ECR Public.
# Pin the verified manifest so a mutable tag cannot change this release.
FROM public.ecr.aws/docker/library/node:24@sha256:be23f54a88d34e8824c741b19b91064094f92c1c97b194144bfc8b50d67258e2

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy runtime files explicitly; credentials, local caches and notes stay out.
COPY server.js fmp-data.js issuer-data.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.js"]
