FROM containrrr/watchtower:1.7.1 AS watchtower

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata nodejs

COPY --from=watchtower /watchtower /watchtower
COPY docker/watchtower-entrypoint.sh /watchtower-entrypoint.sh

RUN chmod +x /watchtower-entrypoint.sh

ENTRYPOINT ["/watchtower-entrypoint.sh"]
CMD ["--http-api-update", "neutralpress-web"]
