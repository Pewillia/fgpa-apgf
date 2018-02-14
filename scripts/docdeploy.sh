#!/bin/bash

set -e

echo "run documentation generation"
if [ "$TRAVIS_REPO_SLUG" == "jolevesq/fgpa-apgf" ]; then
    npm run doc

    echo "run doc over"

    openssl aes-256-cbc -k "$PW" -out ~/.ssh/id_rsa -in devkey.enc -d
    # this section assumes the id_rsa key has already been decrypted
    # devdeploy.sh should run before this script
    echo -e "Host *\n\tStrictHostKeyChecking no\n" > ~/.ssh/config
    chmod 600 ~/.ssh/id_rsa
    eval `ssh-agent -s`
    ssh-add ~/.ssh/id_rsa

    git clone --depth=1 git@github.com:fgpv-vpgf/fgpa-apgf.github.io.git ghdocs
    mkdir -p ghdocs/fgpa-apgf/v0.1.0
    rsync -av --delete ../docbuild/ ghdocs/fgpa-apgf/v0.1.0/
    bash scripts/make_doc_index.sh ghdocs/fgpa-apgf/ > ghdocs/fgpa-apgf/index.html

    cd ghdocs
    git add fgpa-apgf/v0.1.0
    git add fgpa-apgf/index.html
    git config user.email "glitch.chatbot@gmail.com"
    git config user.name "Glitch Bot"
    git commit -m "Docs for fgpa@v0.1.0"
    git push
    cd ..
    rm -rf ghdocs
fi
