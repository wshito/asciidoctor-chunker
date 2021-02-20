VERSION = $(shell grep version package.json | cut -d '"' -f 4)

DIR := asciidoctor-chunker_v$(VERSION)

SCRIPT := $(DIR)/asciidoctor-chunker.js

SOURCES := src/*.mjs package.json

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