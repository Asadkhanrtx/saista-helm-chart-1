# Builder stage
FROM python:3.9-slim AS builder

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.9-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY src/ .

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 5003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5003"]
