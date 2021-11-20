# README for chrome extension development

## overview

    Artwork/
    Extension/      Chrome extension source code
    Promotional/    Chrome web store promotional
    Releases/
    sandbox/

## package extension

    //shell
    google-chrome --pack-extension=./Extension --pack-extension-key=./Extension.pem

    //gui
    chrome browser -> extension program

    code -a '/home/axe/.config/google-chrome/Profile 5/Extensions'

## install nodejs

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
    
    source ~/.bashrc
    nvm list-remote
    nvm install v10.24.1 && nvm use v10.24.1 && node -v
    nvm install v12.22.1 && nvm use v12.22.1 && node -v

## package

    npm install