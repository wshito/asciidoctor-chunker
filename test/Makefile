
chunk: output/html_chunk/index.html

single: output/single/user-manual.html

output/html_chunk/index.html: output/single/user-manual.html
	asciidoc-chunker output/single/user-manual.html -o output/html_chunk

output/images:
	mkdir -p output/single; cd output; \
	ln -s ../asciidoctor.org/images ./
output/single/user-manual.html: output/images
	cd asciidoctor.org/docs; \
	asciidoctor -D ../../output/single user-manual.adoc;\
	cd -

