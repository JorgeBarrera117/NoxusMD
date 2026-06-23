FROM php:8.2-apache

# Instalar Python 3 y pip, necesarios para ejecutar markitdown
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Crear un entorno virtual para Python e instalar markitdown
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install markitdown

# Habilitar mod_rewrite para Apache (CORS y URLs)
RUN a2enmod rewrite

# Permitir a Apache escuchar en el puerto dinámico de Railway
ENV PORT=80
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# Copiar todo el código al directorio raíz del servidor web
COPY . /var/www/html/

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html
