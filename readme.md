![CI](https://github.com/anantduhan/web-behaviour-detection/workflows/CI/badge.svg) ![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/anantduhan/web-behaviour-detection?label=dockerhub&logo=docker)

# Web Positiviser:
Use sentiment analysis to reduce negative content visibility to make your web more positive.

## What does this do?
A browser extension that finds negative elements on the page and makes them less visible:
- Negativity is calculated using either inin-browserule-based logic or an **optional** deep learning model running locally in the background (in a docker container).
- The user controls various options (negativity threshold, restyling options) via the options menu:
    - Visibility is reduced by adjusting transparency, or by hiding the element completely.
    - Colours can be added for inspection, or for examining the positivity.
    - Settings can be saved per site or globally.
    - An overall positivity score per page is displayed.

## Sentiment "Scoring" options:

1. Use `Vader (JS)` or `AFINN (JS)` in the drop-down for browser side, rule-based calculations.

2. For the `FlairNLP (Py)` option a local python inference server needs to be running:
    Running in docker (simplest if you have docker)

    > Please wait a few seconds after starting to be ready to serve requests.

    Run interactively once (e.g to try it out):
    - Start: `docker run -p 8000:8000 -it --rm anantduhan/web-behaviour-detection`

    - Stop just Ctrl+C in the terminal where you're running it.

    Run in detached and persistent mode (e.g. for actual usage):
    - Start: `docker run -p 8000:8000 -dit --restart unless-stopped --name web-behaviour-detection anantduhan/web-behaviour-detection`

    - Stop: `docker rm -f web-positiviser`.


    Local python (e.g. for development)

    1. Clone repo.
    2. `make install` to create a local virtual environment and install dependencies in it. 
    3. `make server` to run the server. 


## Using local extension

### Build
Building instructions

- Clone and go to the `extension/` folder:
- To install in the local environment: `npm install`
- Building: `npm start` for development, `npm run build` for packaging into a zip file.

### Load browser extension into Chrome or Firefox:
Chrome

- Extensions -> Enable "developer mode" -> 
"Load unpacked extensions" -> Navigate to `/extension/dist` folder in this project.
- To update (on code changes): go to extension details and press update / reload.
- Docs: [Chrome docs](https://developer.chrome.com/extensions/getstarted#manifest)

Firefox

- To load for development (will be removed after browser close, but easier to reload on code change):
    - Go to `about:debugging` -> This Firefox -> "Load Temporary Add-on.." -> 
    Navigate to `/extension/dist` -> select manifest file.
    - Press "Reload" to update on code changes.
- To load for continuous usage (persistent after closing):
    - Go to `about: config` and set `xpinstall.signatures.required` to False to be able to load a local extension.
    - Run `npm run-script build` to package the extensions into a zip file.
    - Go to `about:addons` -> "gear" icon -> "Install add-on from file.." -> 
    Navigate to `/extension/` folder in this project -> choose `web-positiviser.zip`.
    - To update (on code changes): repeat the previous two steps.
- Docs: [Firefox docs](https://extensionworkshop.com/documentation/develop/testing-persistent-and-restart-features/)

## Credits and references:

- Python (DL-based) sentiment analysis model and package: [flair NLP](https://github.com/flairNLP/flair)
- JS sentiment analysis packages:
    - [vaderSentiment](https://github.com/cjhutto/vaderSentiment) (called JS-Vader in options menu)
    - [AFINNSentiment](https://github.com/thisandagain/sentiment ) (called JS-AFINN in options menu)
- Backend API framework: [fastapi](https://github.com/tiangolo/fastapi)
- Initial code for browser extension functionality copied from [Trump-Filter](https://github.com/RobSpectre/Trump-Filter)