#!/bin/sh
echo "Starting stream..."
caddy run --config /etc/caddy/Caddyfile
cd ../../srv/landsvagsteater/tidsstangsel/stream
ffmpeg -re -stream_loop -1 -i ../audio/tidsstangsel.mp3 -f hls -hls_time 3 -hls_list_size 2 -hls_flags delete_segments -strftime 1 -hls_segment_filename 'tidsstangsel-%Y%m%d-%s.ts' ./tidsstangsel.m3u8 
