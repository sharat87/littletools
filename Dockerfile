FROM alpine

MAINTAINER shrikantsharat.k@gmail.com

RUN apk update && \
	apk add ghostscript ghostscript-fonts && \
	rm -rf /var/cache/apk/*

ADD littletools-docker /littletools

ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/littletools"]
