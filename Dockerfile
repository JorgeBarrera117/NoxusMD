FROM php:8.2-cli

# Instalar Python 3 y pip, necesarios para ejecutar markitdown
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Crear un entorno virtual para Python e instalar markitdown
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install markitdown

# Copiar todo el código al directorio raíz del servidor
COPY . /app
WORKDIR /app

# Iniciar el servidor web interno de PHP usando el puerto dinámico de Railway
CMD php -S 0.0.0.0:$PORT
