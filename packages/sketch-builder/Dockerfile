#============================
# Puppeteer runable environment
# setup all for headless chrome
#----------------------------
FROM node:10-slim as headless-chrome-environment

RUN mkdir /sketch-builder

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN yarn add puppeteer

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


WORKDIR /sketch-builder
