# asciidoctor-chunker

Splits asciidoc book's single HTML file generated by Asciidoctor into chunks by chapters, sections, subsections, or any depth as you want!  Here is [the sample output.](http://www.seinan-gu.ac.jp/~shito/asciidoctor/html_chunks/index.html)  Each chapter can have different level of extraction depth.  See [What it does](#what-it-does) for details.

## News

- 2020/2/20  Ver 0.9 is released!  This is a complete re-write from the previous Lisp version.  **It is re-implemented in JavaScript!**  So it is super easy to setup with NodeJS!  The fine tuned split options are available.  Oh, it runs a lot faster than the previous version!😊
- 2021/2/10  Started to work on the more enhanced version in `javascript` branch.  Please wait a couple of weeks.  The new version can control any depth of sections to split.  And even more, each chapter can have different depth of extraction level.   The new version is written in JavaScript so it will be a lot easier to install!
- 2018/7/11  Locally linked files with `link` and `script` tags with relative paths are copied to the destination directory keeping the structure of the relative path.  So the custom CSS and script files should be properly copied by `asciidoctor-chunker`.

## What it dose

Asciidoctor-Chunker generates chunked HTML from a single HTML generated by Asciidoctor.

1. Splits part preambles and chapters (or any depth of section level) into separate files. Each chapter can be configured to have different depth for extractions.
1. Extracts css inside the style element into a separate file so the browser can cache and share it among all the pages.
1. Places footnotes in the file they belong to.  This also means that the multiply referred footnotes are placed in the every referrer's files and sets the link back to the referrer's id whitin the page.
1. Re-writes the relative links in order to point the appropriate chunked files.
1. Copies the local images and linked files (with `link`, `script` and `img` tags) whose paths are relative, to the directory relative to the chunked html output.  Files are only copied if they are new or modified compared to the previously copied one.
1. Adds a titlepage link in the toc and page navigation at the bottom of each page.  (The tiny navigation link is there but I haven't set the style on it yet!  Comming soon.)

Here is [the sample output](http://www.seinan-gu.ac.jp/~shito/asciidoctor/html_chunks/index.html) created from the [Asciidoctor User Manual](https://asciidoctor.org/docs/user-manual/).  The footer on the sample page is added by setting the asciidoctor attribute and is not added by asciidoctor-chunker.


## Usage

Asciidoctor-Chunker is written in JavaScript and runs with NodeJS.

1. Install [Node.js](https://nodejs.org/), the JavaScript runtime. 
1. Download the pre-built program from the [latest release](https://github.com/wshito/asciidoctor-chunker/releases/latest).  Simply run the script `asciidoctor-chunker.js` as:
    ```
    $ node asiidoctor-chunker.js [single-html-file] -o [output-directory]
    ```
   Usage discription is available with `--help` option.

`[single-html-file]` is the single HTML file generated by [Asciidoctor](https://asciidoctor.org) from the book doctype.  If the output directory is not specified, the default is `html_chunks` under the current directory.

## How to Configure the Depth of Extraction

You can list the multiple settings by connecting each specifier with a comma.  Each specifier is consisted of either a single number or collon separated two numbers.

The single number sets the default level of extraction.  The number 1 is the application's default and it extracts the the chapter evel.  The number 2 for section extraction, 3 for subsection, and so on to 6 which is the maximum section level of Asciidoctor.

The list of collon separated numbers, `chap:level`, can change the extraction depth for specific chapters, so `3:2` means chapter 3 is extracted down to 2 levels (ie. section level).  You can use hyphen to specify the range of chapters to set as `chapFrom-chapTo:level`, so `1-3:5` means chapter 1 through 5 should be extracted with the depth level 5.

Example:
```
  --depth 2          The default level 2, all the chapters and
                     sections will be extracted.
  --depth 3,1:2,8:5  The default level 3, level 2 for Chap 1,
                     level 5 for Chap 8.
  --depth 1,3-8:2    The default level 1, level 2 for Chap 3 to 8.
  --depth 3-8:3      No default is set so default level is 1, and
                     level 3 for chap3 to 8.`
```

## Example

The project contains the `example` directory where you can generate the chunked html for the [Asciidoctor User Manual](https://asciidoctor.org/docs/user-manual/) by invoking `make`.  Simply go into the `example` directory and invoke `make`.  This will clone the asciidoctor project from the github for the first time, then the chunked html will be generated under `test/output-chunk/html_chunk/` directory.  The `index.html` is the first page.

```
$ cd example
$ make
```

## License

MIT

## Developer's Memo

- Unit test uses `test/resources/output/single/sample.html` generated from `test/resources/sample.adoc`.
- `npm install cheerio commander`
- `npm install --save-dev ava webpack webpack-cli`
