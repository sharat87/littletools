ARG PYTHON_VERSION
FROM python:${PYTHON_VERSION}

MAINTAINER shrikantsharat.k@gmail.com

COPY backend /backend
COPY frontend/dist /static

ENV STATIC_ROOT=/static \
	PORT=80 \
	PYTHONPATH=/backend

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
	apt-get install --yes ghostscript gsfonts && \
	pip install -r /backend/requirements.txt

ENTRYPOINT ["python3", "-m", "app"]
