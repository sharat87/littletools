FROM scratch

MAINTAINER shrikantsharat.k@gmail.com

ADD littletools-docker /littletools

ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/littletools"]
