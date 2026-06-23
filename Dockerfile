FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy the Python backend files
COPY ./laboratorio_ia /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the dynamic port provided by Railway
EXPOSE $PORT

# Start the FastAPI server
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
