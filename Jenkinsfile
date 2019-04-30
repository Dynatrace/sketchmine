pipeline {
  agent {
    node {
      label 'default'
    }
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    COMP_VOL_NAME = 'SketchmineComponentsLibrary'
    SHARED_VOL_NAME = 'SketchmineShared'
    APP_VOL_NAME = 'SketchmineApp'
    APP_NETWORK = 'SketchmineNetwork'
    GIT_REPO = 'https://bitbucket.lab.dynatrace.org/scm/rx/angular-components.git'
    FEATURE_BRANCH_PREFIX = 'feat/library-update-version'
    VERBOSE = 'true'
  }

  stages {

    stage('Install dependencies 📦') {
      steps {
        nodejs(nodeJSInstallationName: 'Node 10.x') {
          ansiColor('xterm') {
            sh 'yarn install --registry http://artifactory.lab.dynatrace.org/artifactory/api/npm/registry-npmjs-org'
            sh 'yarn bootstrap'
          }
        }
      }
    }

    stage('Clone the global ressources 🧸') {

      steps {
        checkout changelog: false, poll: false, scm: [
          $class: 'GitSCM',
          branches: [[name: '*/master']],
          doGenerateSubmoduleConfigurations: false,
          extensions: [
            [$class: 'RelativeTargetDirectory', relativeTargetDir: 'ux-global-resources'],
          ],
          submoduleCfg: [],
          userRemoteConfigs: [[
            credentialsId: 'Buildmaster',
            name: 'origin',
            url: 'https://bitbucket.lab.dynatrace.org/scm/ux/global-resources.git'
          ]]
        ]
      }
    }

    stage('Build ⚒') {
      steps {
        nodejs(nodeJSInstallationName: 'Node 10.x') {
          ansiColor('xterm') {
            sh 'yarn build'
          }
        }
      }
    }

    stage('Publish Validation Interface 👩🏼‍🏫') {
      when {
        branch 'master'
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'kraken-validation-s3', passwordVariable: 'AWS_SECRET', usernameVariable: 'AWS_KEY')]) {
          dir('packages/build') {
            nodejs(nodeJSInstallationName: 'Node 10.x') {
              sh 'yarn deploy --id=$AWS_KEY --secret=$AWS_SECRET --dir="../sketch-validation-interface/dist/sketch-plugin-interface"'
            }
          }
        }
      }
    }

    stage('🔨 Get angular-components version') {
      steps {

        dir('packages/build') {
          nodejs(nodeJSInstallationName: 'Node 10.x') {
            sh 'yarn get-latest-tag -r=RX -p=angular-components -f="../../VERSION"'
          }
        }

        script {
          def version = sh(returnStdout: true, script: "cat ./VERSION");
          env.VERSION = version;
        }

        sh 'echo "\n💎 Library Version:\t$VERSION"'
      }
    }

    stage('Prepare Volumes 💾') {
      steps {
        sh '''
          echo "Create Volumes"
          docker volume create --name ${COMP_VOL_NAME}
          docker volume create --name ${SHARED_VOL_NAME}
          docker volume create --name ${APP_VOL_NAME}

          echo "Create Network"
          docker network create -d bridge ${APP_NETWORK} || true
        '''
      }
    }

    stage('Build 🐳 🏙') {
      steps {

        script {
          def version = sh(returnStdout: true, script: "cat ./VERSION");
          env.VERSION = version;
        }

        sh '''
          docker build -t sketchmine/components-library . -f ./config/Dockerfile --build-arg GIT_TAG=${VERSION} --build-arg GIT_REPO=${GIT_REPO}
          docker build -t sketchmine/code-analyzer . -f ./packages/code-analyzer/Dockerfile
          docker build -t sketchmine/app-builder . -f ./packages/app-builder/Dockerfile
          docker build -t sketchmine/sketch-builder . -f ./packages/sketch-builder/Dockerfile
          docker build -t sketchmine/sketch-validator . -f ./packages/sketch-validator-nodejs-wrapper/Dockerfile
        '''
      }
    }

    stage('Prepare Examples 👩🏼‍🔧') {
      steps {
        sh '''
          docker run --rm \
            --name components_library \
            -v ${COMP_VOL_NAME}:/components-library \
            sketchmine/components-library \
            /bin/sh -c './node_modules/.bin/gulp barista-example:generate'
        '''
      }
    }

    stage('Generate meta-information.json 🕵🏻‍') {
      steps {
        sh '''
           docker run --rm \
            --name code_analyzer \
            -v ${COMP_VOL_NAME}:/angular-components \
            -v ${SHARED_VOL_NAME}:/shared \
            sketchmine/code-analyzer \
            /bin/sh -c 'node ./lib/bin --config="config.json"'
        '''
      }
    }

    stage('Generate examples angular application 🧰') {
      steps {

        script {
          def version = sh(returnStdout: true, script: "cat ./VERSION");
          env.VERSION = version;
        }

        sh '''
          docker run --rm \
            --name app_builder \
            -e VERSION=${VERSION} \
            -v ${COMP_VOL_NAME}:/angular-components \
            -v ${SHARED_VOL_NAME}:/shared \
            -v ${APP_VOL_NAME}:/app-shell \
            sketchmine/app-builder \
            /bin/sh -c '\
              yarn schematics --config="config.json" --dependencies @dynatrace/angular-components@${VERSION} --dryRun=false && \
              mkdir -p ./sketch-library/src/assets && \
              cp /shared/* ./sketch-library/src/assets/ && \
              cd ./sketch-library && \
              yarn ng build && \
              cd dist && \
              cp -R ./angular-app-shell/* /app-shell'
        '''
      }
    }

    stage('Start Webserver 🌍') {
      steps {
        sh '''
           docker run --rm \
            -v ${APP_VOL_NAME}:/usr/share/nginx/html \
            --name web_server \
            --net ${APP_NETWORK} \
            -p 4200:80 \
            -d \
            nginx:alpine
        '''
      }
    }

    stage('Generate the Sketch file 💎') {
      steps {
        sh '''
          echo "create ./_library for out dir of the generated file"
          mkdir _library

          docker run --rm \
            -e DOCKER=true \
            --cap-add=SYS_ADMIN \
            --name sketch_builder \
            --net ${APP_NETWORK} \
            -v ${APP_VOL_NAME}:/app-shell \
            -v $(pwd)/ux-global-resources:/global-resources \
            -v $(pwd)/_library:/generated \
            sketchmine/sketch-builder \
            /bin/sh -c 'node ./lib/bin --config="config.json"'
        '''
      }
    }

    stage('🚀 update or make PR with the generated library 💎') {
      when {
        branch 'master'
      }

      steps {

        script {
          def version = sh(returnStdout: true, script: "cat ./VERSION");
          env.VERSION = version;
        }

        // get the branchname of an existing one or create one
        dir('packages/build') {
          nodejs(nodeJSInstallationName: 'Node 10.x') {
            sh '''
              yarn get-branch-name \
                --prefix ${FEATURE_BRANCH_PREFIX} \
                --version ${VERSION} \
                --cwd="../../ux-global-resources" \
                --file="../../BRANCH"
            '''
          }
        }

        script {
          def branchName = sh(returnStdout: true, script: "cat ./BRANCH");
          env.FEAT_BRANCH_NAME = branchName;
        }

        sh 'echo "\nBranch Name for changes:\t$FEAT_BRANCH_NAME"'

        dir('ux-global-resources') {
          sh 'cp ../_library/library.sketch ./components-library.sketch'
        }

        ansiColor('xterm') {
          withCredentials([
            usernamePassword(credentialsId: 'Buildmaster-encoded',
            passwordVariable: 'GIT_PASS',
            usernameVariable: 'GIT_USER')
          ]) {

            dir('packages/build') {
              nodejs(nodeJSInstallationName: 'Node 10.x') {
                sh '''
                  yarn commit-pr \
                    --user $GIT_USER \
                    --password $GIT_PASS \
                    -v ${VERSION} \
                    -b ${FEAT_BRANCH_NAME} \
                    --cwd="../../ux-global-resources"
                '''
              }
            }
          }
        }
      }
    }
  }

  post {
    always {
      cleanWs()
      sh '''
        echo "Stop Nginx Web Server"
        docker stop web_server

        echo "Remove Volumes"
        docker volume rm ${COMP_VOL_NAME} ${SHARED_VOL_NAME} ${APP_VOL_NAME}

        echo "Remove Networks"
        docker network rm ${APP_NETWORK}
      '''
    }
  }
}
