#!/bin/bash
# colors
declare BLUE='\033[0;34m' # blue
declare LBLUE='\033[1;34m' # lightblue
declare LGRAY='\033[0;37m' # light gray
declare NC='\033[0m' # No Color
# paths
declare DIR=$(pwd)
declare DIST=${DIR}/dist
declare APPSHELL=${DIR}/config/angular-app-shell
declare TMP=_tmp
declare REPO=https://bitbucket.lab.dynatrace.org/scm/rx/angular-components.git
declare BRANCH=feat/poc-sketch

h2() {
	printf '\n\e[1;33m==>\e[37;1m %s\e[0m\n' "$*"
}

success() {
	printf '\n\e[0;32m✅  \e %s\e[0m\n\n' "$*"
}

failure() {
	printf '\n\e[0;31m❌ \e %s\e[0m\n\n' "$*"
}

printf "$(<./config/ascii-header.rtf)"
echo "\ncurrently working in: $DIR"

h2 "🔧  checkout angular components from .git"
rm -rf $TMP
echo "${LBLUE}create${NC} › ${TMP}"
mkdir $TMP
git clone --no-checkout --depth=1 -b $BRANCH $REPO $TMP

cd $TMP
git fetch origin $BRANCH
git checkout origin/$BRANCH -- tsconfig.json
git checkout origin/$BRANCH -- package.json
git checkout origin/$BRANCH -- .npmrc
git checkout origin/$BRANCH -- src/lib
git checkout origin/$BRANCH -- src/docs/components

# install dependencies for @dynatrace/dt-icontype
h2 "⚙️  Install angular components dependencies"
npm install --ignore-scripts


h2 "🗑  cleanup dist"
rm -rf $DIST

echo "${LBLUE}create${NC} › dist"
mkdir $DIST 
echo "${LBLUE}create${NC} › dist/angular-meta-parser"
mkdir $DIST/angular-meta-parser
echo "${LBLUE}create${NC} › dist/angular-library-generator"
mkdir $DIST/angular-library-generator
echo "${LBLUE}create${NC} › dist/dom-traverser"
mkdir $DIST/dom-traverser
echo "${LBLUE}create${NC} › dist/sketch-color-replacer"
mkdir $DIST/sketch-color-replacer
echo "${LBLUE}create${NC} › dist/sketch-generator"
mkdir $DIST/sketch-generator
echo "${LBLUE}create${NC} › dist/sketch-validator"
mkdir $DIST/sketch-validator

# Angular App shell instanciating
echo "${LBLUE}generate${NC} › angular-app-shell ${LGRAY}for the angular variants generator"
rm -rf $DIST/sketch-library
cp -R $APPSHELL $DIST/sketch-library
cd $DIST/sketch-library
echo "${LGRAY} install angular dependencies"
npm i || exit 1
echo "🔪  ${LGRAY}removing sample data from angular-app-shell"
rm -rf $DIST/sketch-library/src/app/examples
rm -rf $DIST/sketch-library/src/app/app.module.ts


cd $DIR

h2 "⚙️  Build the dependencies"
set -e
$DIR/node_modules/.bin/rollup -c || exit 1

success "Everything is installed 🤘🏻"
echo "now you can go ahead with "
echo "  > npm run build:dev"
echo "  > npm run test"
echo "  > npm run lint"
