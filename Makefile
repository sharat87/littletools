serve: all-parsers
	cd frontend && PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall

build: all-parsers
	cd frontend \
		&& yarn run parcel build --no-cache --no-autoinstall \
		&& cp _headers dist/

test: all-parsers
	cd frontend && yarn run jest --coverage

frontend/src/parsers/content-security-policy.js: frontend/src/grammars/content-security-policy.grammar
	cd frontend && mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator frontend/src/grammars/content-security-policy.grammar -o frontend/src/parsers/content-security-policy.js

frontend/src/parsers/json-permissive.js: frontend/src/grammars/json-permissive.grammar
	cd frontend && mkdir -p frontend/src/parsers
	cd frontend && yarn run lezer-generator frontend/src/grammars/json-permissive.grammar -o frontend/src/parsers/json-permissive.js

all-parsers: frontend/src/parsers/content-security-policy.js frontend/src/parsers/json-permissive.js
