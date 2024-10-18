FROM node:alpine
RUN apk add ffmpeg
RUN mkdir tidsstangsel
COPY page /tidsstangsel/page
COPY static /tidsstangsel/static
COPY uploads /tidsstangsel/uploads
COPY server.js /tidsstangsel
COPY package.json /tidsstangsel
WORKDIR /tidsstangsel
RUN npm install


