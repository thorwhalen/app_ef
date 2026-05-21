FROM python:3.11-slim

WORKDIR /app

# NOTE: this image installs only the third-party deps declared in
# pyproject.toml (fastapi, uvicorn). The backend also imports `ef` and `qh`,
# which are local editable packages (the embeddings package group) and are NOT
# published to PyPI — they must be made available (vendored or published)
# before the container can actually serve requests. Full container deployment
# is deferred; see app_ef issue #3.

COPY pyproject.toml .
COPY app ./app
RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
