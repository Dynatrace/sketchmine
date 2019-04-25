#============================
# Puppeteer runable environment
# setup all for headless chrome
#----------------------------
FROM node:10-alpine as headless-chrome-environment

RUN mkdir /sketch-builder

# install headless chrome
RUN mkdir -p /lib && \
    apk update && \
    apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk add --no-cache \
      chromium@edge \
      nss@edge \
      freetype@edge \
      harfbuzz@edge \
      ttf-freefont@edge

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Puppeteer v1.11.0 works with Chromium 72.
RUN yarn add puppeteer@1.11.0

# Add user so we don't need --no-sandbox.
# RUN addgroup -S pptruser && adduser -S -g pptruser pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser \
#     && chown -R pptruser:pptruser /sketch-builder

# # Run everything after as non-privileged user.
# USER pptruser


FROM headless-chrome-environment as sketch-builder
WORKDIR /sketch-builder

ENV PACKAGE=packages/sketch-builder

COPY ${PACKAGE}/package.json ./

RUN yarn

COPY ${PACKAGE}/src ./src
COPY ${PACKAGE}/assets ./assets
COPY ${PACKAGE}/rollup.config.js \
     ${PACKAGE}/config.json \
     ${PACKAGE}/tsconfig.json ./

# Copy root tsconfig
COPY ./tsconfig.json /
COPY ./config /config

RUN yarn build

WORKDIR /lib

RUN apk add --no-cache curl

WORKDIR /sketch-builder
