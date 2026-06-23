FROM php:8.2-apache

# Habilitar mod_rewrite para Apache (útil para URLs limpias y CORS)
RUN a2enmod rewrite

# Copiar todo el código al directorio raíz del servidor web
COPY . /var/www/html/

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html
