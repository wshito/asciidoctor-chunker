#
# This file is a part of Asciidoctor Chunker project.
# Copyright (c) 2018 wshito (@waterloo_jp)
#

ASCIIDOCTOR_CHUNKER_SCRIPT = ../roswell/asciidoctor-chunker.ros

SINGLE_DIR = output/single
CHUNK_DIR  = output/html_chunk

SINGLE := $(SINGLE_DIR)/user-manual.html
CHUNK  := $(CHUNK_DIR)/index.html

chunk: $(CHUNK)

single: $(SINGLE)

# fetch the asciidoctor.org site
asciidoctor.org:
	git clone https://github.com/asciidoctor/asciidoctor.org.git

# generate chunked html
$(CHUNK): $(SINGLE)
	$(ASCIIDOCTOR_CHUNKER_SCRIPT) $<  -o $(CHUNK_DIR)

# prepare images
output/images: asciidoctor.org
	mkdir -p output/single; cd output; \
	ln -s ../asciidoctor.org/images ./

# generate single html
$(SINGLE): output/images
	cd asciidoctor.org/docs; \
	asciidoctor -D ../../$(SINGLE_DIR) user-manual.adoc;\
	cd -

clean:
	rm -rf output
