serve:
	PORT="$${PORT:-3060}" yarn parcel --no-autoinstall src/index.html

build:
	time yarn parcel build --no-autoinstall src/index.html

test:
	time yarn jest

ci:
	yarn install --frozen-lockfile
	yarn parcel build --no-autoinstall src/index.html
