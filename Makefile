serve: grammars
	PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall "src/index.html"

build:
	yarn run parcel build --no-cache --no-autoinstall src/index.html
	cp src/_headers dist/

test:
	yarn run jest

src/scripts/parsers/content-security-policy.js: src/scripts/grammars/content-security-policy.grammar
	mkdir -p src/scripts/parsers
	yarn run lezer-generator src/scripts/grammars/content-security-policy.grammar -o src/scripts/parsers/content-security-policy.js

src/scripts/parsers/json-permissive.js: src/scripts/grammars/json-permissive.grammar
	mkdir -p src/scripts/parsers
	yarn run lezer-generator src/scripts/grammars/json-permissive.grammar -o src/scripts/parsers/json-permissive.js

grammars: src/scripts/parsers/content-security-policy.js src/scripts/parsers/json-permissive.js
