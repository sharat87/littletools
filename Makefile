serve-frontend: all-parsers
	cd frontend && PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall

build-frontend: all-parsers
	cd frontend \
		&& yarn run parcel build --detailed-report 10 --dist-dir dist-prod --no-cache --no-autoinstall

build: build-frontend
	rm -rf backend/assets/static
	mv frontend/dist-prod backend/assets/static
	cd backend \
		&& go build \
			-o ../littletools \
			-v \
			-ldflags "-X main.Version=${VERSION-} -X main.BuildTime=$$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
			.

build-for-docker: build-frontend
	rm -rf backend/assets/static
	mv frontend/dist-prod backend/assets/static
	cd backend \
		&& CGO_ENABLED=0 GOOS=linux go build \
			-a \
			-o ../littletools-docker \
			-v \
			-ldflags "-X main.Version=${VERSION-} -X main.BuildTime=$$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
			.

test: all-parsers
	cd frontend && yarn && yarn run jest --coverage

frontend/src/parsers/content-security-policy.js: frontend/src/grammars/content-security-policy.grammar
	mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator src/grammars/content-security-policy.grammar -o src/parsers/content-security-policy.js

frontend/src/parsers/json-permissive.js: frontend/src/grammars/json-permissive.grammar
	mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator src/grammars/json-permissive.grammar -o src/parsers/json-permissive.js

all-parsers: frontend/src/parsers/content-security-policy.js frontend/src/parsers/json-permissive.js
