REPO_NAME=web-behaviour-detection
VENV_ACTIVATE= .venv/Scripts/activate
PYTHON= .venv/Scripts/python
DOCKER_TAG=anantduhan/web-behaviour-detection
PORT=8000
REPO_NAME=web-behaviour-detection

.venv:
	python3 -m venv .venv

requirements: .venv
	$(VENV_ACTIVATE); 
	pip install -U pip; 
	pip install -U pip-tools; 
	pip-compile requirements.in

install: .venv
	$(VENV_ACTIVATE); 
	pip install -r requirements.txt

kill-server:
	kill -9 `netstat -tulpn | grep $(PORT) | grep -oP "(?<=)\d+(?=\/)"`

server:
	$(VENV_ACTIVATE); 
	python server.py

build-docker:
	docker build -t $(DOCKER_TAG) .

docker-server: build-docker
	docker rm -f $(REPO_NAME) || sleep 1
	docker run -it --rm 
	--name $(REPO_NAME) 
	-p $(PORT):$(PORT) 
	$(DOCKER_TAG)

docker-server-persist: build-docker
	docker run -dit 
	--name $(REPO_NAME) 
	-p $(PORT):$(PORT) 
	--restart unless-stopped 
	$(DOCKER_TAG)

docker-update-server:
	docker rm -f $(REPO_NAME) || sleep 1
	$(MAKE) docker-server-persist

docker-logs:
	docker logs $(REPO_NAME) -f

tests:
	pytest

zip-source-code:
	git clone -l . ./temp
	rm -rf ./temp/.git
	cd ./temp && zip -9 -rFS ../web-positiviser-source.zip * && cd -
	rm -rf ./temp/