#
# This file is a part of Asciidoctor Chunker project.
# Copyright (c) 2018 wshito (@waterloo_jp)
#

ASCIIDOCTOR_CHUNKER = node ../../dist/asciidoctor-chunker.js -depth 2:4,3:2

OUTPUT = output

SINGLE_DIR = $(OUTPUT)/single
CHUNK_DIR = $(OUTPUT)/html_chunks

SOURCE_BASE = sample
SINGLE_HTML := $(SINGLE_DIR)/$(SOURCE_BASE).html
HIGHLIGHT := $(SINGLE_DIR)/highlight

single: $(SINGLE_HTML)

chunk: $(CHUNK_DIR)/index.html

$(CHUNK_DIR)/index.html: $(SINGLE_HTML)
	$(ASCIIDOCTOR_CHUNKER) $< -o $(CHUNK_DIR)

$(HIGHLIGHT): | $(SINGLE_DIR)
	cd $(SINGLE_DIR) ;\
	ln -s ../../highlight ./ ;\
	cd -

$(SINGLE_DIR):
	mkdir -p $(SINGLE_DIR)


# generate single html
$(SINGLE_HTML): $(SOURCE_BASE).adoc $(SINGLE_DIR) $(HIGHLIGHT)
	asciidoctor -D $(SINGLE_DIR) $(SOURCE_BASE).adoc;

clean:
	rm -rf $(OUTPUT)
