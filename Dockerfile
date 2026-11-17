FROM node:22-bookworm-slim AS assets
WORKDIR /src
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY scripts/vendor.mjs scripts/artwork.mjs ./scripts/
COPY resources/ar ./resources/ar
RUN npm run build && npm run assets

FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev \
    && docker-php-ext-install pdo_mysql pdo_sqlite mbstring \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
COPY . .
COPY --from=assets /src/public/assets/vendor ./public/assets/vendor
COPY --from=assets /src/public/assets/cards ./public/assets/cards
COPY --from=assets /src/public/markers ./public/markers
COPY infrastructure/apache.conf /etc/apache2/sites-available/000-default.conf
RUN mkdir -p storage/logs storage/sessions storage/rate-limits public/uploads \
    && chown -R www-data:www-data storage public/uploads
EXPOSE 80
CMD ["sh", "-c", "php bin/console.php migrate && php bin/console.php seed && exec apache2-foreground"]
