
chunk: output/html_chunk/index.html

single: output/single/user-manual.html

# fetch the asciidoc.org site
asciidoctor.org:
	git clone https://github.com/asciidoctor/asciidoctor.org.git

# generate chunked html in output/html_chunk
output/html_chunk/index.html: output/single/user-manual.html
	asciidoc-chunker output/single/user-manual.html -o output/html_chunk

# prepare images
output/images: asciidoctor.org
	mkdir -p output/single; cd output; \
	ln -s ../asciidoctor.org/images ./

# generate single html in output/single
output/single/user-manual.html: output/images
	cd asciidoctor.org/docs; \
	asciidoctor -D ../../output/single user-manual.adoc;\
	cd -

