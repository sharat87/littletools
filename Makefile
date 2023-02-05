serve-frontend: deps-frontend all-parsers
	cd frontend && PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall

build-frontend: deps-frontend all-parsers
	cd frontend \
		&& yarn run parcel build --detailed-report 10 --dist-dir dist-prod --no-cache --no-autoinstall

test-frontend: deps-frontend all-parsers
	cd frontend && yarn && yarn run jest --coverage

all-parsers: frontend/src/parsers/content-security-policy.js frontend/src/parsers/json-permissive.js frontend/src/parsers/cidr.js

frontend/src/parsers/content-security-policy.js: frontend/src/grammars/content-security-policy.grammar
	mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator src/grammars/content-security-policy.grammar -o src/parsers/content-security-policy.js

frontend/src/parsers/json-permissive.js: frontend/src/grammars/json-permissive.grammar
	mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator src/grammars/json-permissive.grammar -o src/parsers/json-permissive.js

frontend/src/parsers/cidr.js: frontend/src/grammars/cidr.grammar
	mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator src/grammars/cidr.grammar -o src/parsers/cidr.js

test-backend: deps-backend
	cd backend && source venv/bin/activate && pytest

deps: deps-backend deps-frontend

deps-backend: backend/venv/make_sentinel
backend/venv/make_sentinel: backend/requirements.in backend/requirements.txt
	cd backend && r="$$(sort -u requirements.in)" && echo "$$r" > requirements.in
	cd backend \
		&& source venv/bin/activate \
		&& pip-compile --resolver=backtracking requirements.in > requirements.txt \
		&& pip install -r requirements.txt
	touch backend/venv/make_sentinel

deps-frontend: frontend/node_modules/make_sentinel
frontend/node_modules/make_sentinel: frontend/package.json frontend/yarn.lock
	cd frontend && yarn install && touch node_modules/make_sentinel

fmt:
	cd backend && source venv/bin/activate && black .

certs:
	mkcert -cert-file fullchain.pem -key-file privkey.pem localhost
