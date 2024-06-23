default: prettier optipng

prettier:
	prettier -w .

optipng:
	optipng images/*.png favicon.png

.PHONY: default prettier optipng
