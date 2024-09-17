default: prettier optipng

navigation:
	@for f in $(shell ls *.html); do ./replace_nav.sh $${f}; done


prettier: navigation
	prettier -w .

optipng:
	optipng images/*.png favicon.png

.PHONY: default prettier optipng navigation
