#!/bin/bash

arrow="$(echo -e '\xe2\x9d\xaf')"

red="$(tput setaf 1)"
yellow="$(tput setaf 3)"
cyan="$(tput setaf 6)"
bold="$(tput bold)"
normal="$(tput sgr0)"
dim=$'\e[2m'

declare title
declare command_library
declare git_repo
declare git_tag
declare config_code_analyzer
declare config_app_builder

declare COMP_VOL_NAME="SketchmineComponentsLibrary"
declare SHARED_VOL_NAME="SketchmineShared"
declare APP_VOL_NAME="SketchmineApp"
declare APP_NETWORK="SketchmineNetwork"

h2() {
	echo -e "\n\n${bold}${yellow}==>${cyan} $*${normal}\n"
}


case $1 in
  'material')
    title="\n$dim Generating the Angular Material Library"
    command_library="./node_modules/.bin/gulp build-examples-module"
    git_repo="https://github.com/angular/material2.git"
    config_code_analyzer=config.material.json
    config_app_builder=config.material.json
    ;;
  'dynatrace')
    title="\n$dim Generating the Dynatrace Angular Components"
    command_library="./node_modules/.bin/gulp barista-example:generate"
    git_repo="https://bitbucket.lab.dynatrace.org/scm/rx/angular-components.git"
    config_code_analyzer=config.json
    config_app_builder=config.json
    ;;
  '')
    echo "${red}Please provide a library name! $normal$dim(dynatrace, material)$normal"
    exit 1
    ;;
  *)
    echo -e "\n\nYour library $dim<$1>$normal is currently not supported!"
    echo -e "\nSupported libraries:\n $cyan$arrow$normal dynatrace\n $cyan$arrow$normal material"
    exit 1
esac

# check if second argument for git tag is defined
if [ "$2" ]
  then git_tag=$2
  else
    echo -e "${red}Please provide the Git-tag as second parameter!${normal}"
    exit
fi

echo "
${cyan}                                                      ${yellow}     .     '     ,
${cyan}      _        _       _               _              ${yellow}       _________
${cyan}  ___| | _____| |_ ___| |__  _ __ ___ (_)_ __   ___   ${yellow}    _ /_|_____|_\ _
${cyan} / __| |/ / _ \ __/ __| '_ \| '_ \` _ \| | '_ \ / _ \ ${yellow}       '. \   / .'
${cyan} \__ \   <  __/ || (__| | | | | | | | | | | | |  __/  ${yellow}        '.\ /.'
${cyan} |___/_|\_\___|\__\___|_| |_|_| |_| |_|_|_| |_|\___|  ${yellow}          '.'
${yellow}
 A place to scrape Diamonds${normal}"

echo -e "$title for version: $bold$cyan$git_tag\n\n$normal"

h2 "Create Volumes 💾"
echo "Create Volumes"
docker volume create --name $COMP_VOL_NAME
docker volume create --name $SHARED_VOL_NAME
docker volume create --name $APP_VOL_NAME
echo "Create Network"
docker network create -d bridge $APP_NETWORK || true

h2 "Build Components Library 📦 🔧"
docker build \
  -t sketchmine/components-library \
  . \
  -f ./config/Dockerfile \
  --build-arg GIT_TAG="$git_tag" \
  --build-arg GIT_REPO="$git_repo"

h2 "Build Code Analyzer 🔎 🔧"
docker build -t sketchmine/code-analyzer . -f ./packages/code-analyzer/Dockerfile

h2 "Build App Builder 🧰 🔧"
docker build -t sketchmine/app-builder . -f ./packages/app-builder/Dockerfile

h2 "Build Sketch Builder 💎 🔧"
docker build -t sketchmine/sketch-builder . -f ./packages/sketch-builder/Dockerfile

h2 "Generate Examples Module 🏃🏻‍"
docker run --rm \
  --name components_library \
  -e CMD="$command_library" \
  -v $COMP_VOL_NAME:/components-library \
  sketchmine/components-library \
  /bin/sh -c '$CMD'

h2 "Generate meta-information.json 🕵🏻‍"
docker run --rm \
  --name code_analyzer \
  -e CONFIG="$config_code_analyzer" \
  -v $COMP_VOL_NAME:/angular-components \
  -v $SHARED_VOL_NAME:/shared \
  sketchmine/code-analyzer \
  /bin/sh -c 'node ./lib/bin --config ${CONFIG}'

h2 "Generate examples angular application 🧰"
docker run --rm \
  --name app_builder \
  -e CONFIG="$config_app_builder" \
  -e VERSION="$git_tag" \
  -v $COMP_VOL_NAME:/angular-components \
  -v $SHARED_VOL_NAME:/shared \
  -v $APP_VOL_NAME:/app-shell \
  sketchmine/app-builder \
  /bin/sh -c '\
    yarn schematics \
      --config ${CONFIG} \
      --dependencies @dynatrace/angular-components@${VERSION} \
      --dryRun=false && \
    mkdir -p ./sketch-library/src/assets && \
    cp /shared/* ./sketch-library/src/assets/ && \
    cd ./sketch-library && \
    yarn ng build && \
    cd dist && \
    cp -R ./angular-app-shell/* /app-shell'

h2 "Start Webserver 🌍"
docker run --rm \
  -v $APP_VOL_NAME:/usr/share/nginx/html \
  --name web_server \
  --net $APP_NETWORK \
  -p 4200:80 \
  -d \
  nginx:alpine

h2 "Generate the Sketch file 💎"
docker run -it --rm \
  -e DOCKER=true \
  -e DEBUG=true \
  --cap-add=SYS_ADMIN \
  --name sketch_builder \
  --net ${APP_NETWORK} \
  -v ${APP_VOL_NAME}:/app-shell \
  -v "$(pwd)"/_library:/generated \
  sketchmine/sketch-builder \
  /bin/sh -c 'node ./lib/bin --config="config.json"'

h2 "Clean up 🧹"

echo "Stop Nginx Web Server"
docker stop web_server

echo "Remove Volumes"
docker volume rm $COMP_VOL_NAME $SHARED_VOL_NAME $APP_VOL_NAME

echo "Remove Networks"
docker network rm $APP_NETWORK
