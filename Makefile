serve:
	PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall "$$PWD/src/index.html"

build:
	yarn run parcel build --no-cache --no-autoinstall src/index.html

test:
	yarn run jest

netlify:
	yarn run parcel build --no-autoinstall src/index.html
