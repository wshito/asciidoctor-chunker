# This file is a part of Asciidoctor Chunker project.
# Copyright (c) 2021 Wataru Shito (@waterloo_jp)

# make zip
#   creates the release archive as asciidoctor-chunker_vX.X.X.zip
# make clean
#   removes asciidoctor-chunker_vX.X.X
#   and asciidoctor-chunker_vX.X.X.zip


VERSION = $(shell grep version package.json | cut -d '"' -f 4)

DIR := asciidoctor-chunker_v$(VERSION)

SCRIPT := $(DIR)/asciidoctor-chunker.js

SOURCES := src/*.mjs src/css/*.css .json

zip: $(DIR).zip

$(DIR).zip: $(SCRIPT) $(DIR)/README.md $(DIR)/LICENSE
	zip -r $@ $(DIR)

dist/asciidoctor-chunker.js: $(SOURCES)
	npm run build

$(SCRIPT): dist/asciidoctor-chunker.js $(DIR) $(DIR)/README.md $(DIR)/LICENSE
	cp -f $< $@
	@echo Distribution package for v$(VERSION) is ready!


$(DIR):
	mkdir $(DIR)

$(DIR)/README.md: README.md $(DIR)
$(DIR)/LICENSE: LICENSE $(DIR)
$(DIR)/%: % $(DIR)
	cp -f $< $@

clean:
	rm -rf $(DIR) $(DIR).zip