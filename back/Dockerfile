FROM python:3.13.7-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["gunicorn", "--threads", "80", "-b", "0.0.0.0:8000", "src.main:app"]
