serve: fix-tachyons-star-zoom
	PORT="$${PORT:-3060}" yarn run parcel --no-autoinstall "$$PWD/src/index.html"

build: fix-tachyons-star-zoom
	yarn run parcel build --no-cache --no-autoinstall src/index.html

test: fix-tachyons-star-zoom
	yarn run jest

netlify: fix-tachyons-star-zoom
	yarn run parcel build --no-autoinstall src/index.html

fix-tachyons-star-zoom:
	@if grep -F -m1 -q "*zoom:" node_modules/tachyons/css/tachyons.css; then \
		out="$$(sed "s/\*zoom:/zoom:/" node_modules/tachyons/css/tachyons.css)"; \
		echo "$$out" > node_modules/tachyons/css/tachyons.css; \
	fi
