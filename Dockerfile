FROM python:3.11

MAINTAINER shrikantsharat.k@gmail.com

COPY backend /backend
COPY frontend/dist-prod /static

ENV STATIC_ROOT=/static \
	PORT=80 \
	PYTHONPATH=/backend

ARG DEBIAN_FRONTEND=noninteractive

RUN apt update && \
	apt --yes install ghostscript gsfonts && \
	pip install -r /app/requirements.txt

ENTRYPOINT ["python3", "-m", "app"]
