FROM caddy:2.8-alpine

COPY Caddyfile /etc/caddy/Caddyfile

RUN mkdir -p /app/tidsstangsel

COPY tidsstangsel_start.sh /app/tidsstangsel
RUN chmod +x /app/tidsstangsel/tidsstangsel_start.sh

RUN mkdir -p /srv/landsvagsteater

COPY audio          /srv/landsvagsteater/audio
COPY tidsstangsel   /srv/landsvagsteater/tidsstangsel

RUN apk add ffmpeg

#RUN ffmpeg -loglevel error -re -stream_loop -1 -i /srv/landsortsteater/audio/tidsstangsel.mp3 -f hls -hls_time 3 -hls_list_size 2 -hls_flags delete_segments -strftime 1 -hls_segment_filename 'tidsstangsel-%Y%m%d-%s.ts' /srv/landsortsteater/tidsstangsel/stream/tidsstangsel.m3u8 

EXPOSE 80 443

CMD caddy run --config /etc/caddy/Caddyfile


