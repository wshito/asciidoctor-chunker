#
# This file is a part of Asciidoctor Chunker project.
# Copyright (c) 2018 wshito (@waterloo_jp)
#

ASCIIDOCTOR_CHUNKER_SCRIPT = ../build/asciidoctor-chunker.js

OUTPUT = output

SINGLE_DIR := $(OUTPUT)/single

SOURCE_BASE = sample
SINGLE := $(SINGLE_DIR)/$(SOURCE_BASE).html

single: $(SINGLE)

$(SINGLE_DIR):
	mkdir -p $(SINGLE_DIR)

# generate single html
$(SINGLE): $(SOURCE_BASE).adoc $(SINGLE_DIR)
	asciidoctor -D $(SINGLE_DIR) $(SOURCE_BASE).adoc;

clean:
	rm -rf $(SINGLE_OUTPUT)
