#|
  This file is a part of Asciidoctor Chunker project.
  Copyright (c) 2018 wshito (@waterloo_jp)
|#

(in-package :cl-user)

(defpackage :asciidoctor-chunker
  (:use :cl)
  (:export :main))

(in-package :asciidoctor-chunker)

;; Default output directory.  This is overwritten if outdir is
;; specified in the argument of main function.
(defparameter *outdir* "html_chunks/")

;; Simple condition handler which catches any signals
;; and print the condition object.
(defmacro try (try-expr &key return-from)
  `(handler-case ,try-expr
     (t (err) (format t "~a" err)
       ,(if return-from `(return-from ,return-from)))))

;; 1. setup (new dom and output directory)
;; 2. Write out <style> elements to css files.
;; 3. Copy local image files if modified.
;; 4. Create a hastable of id (key) and chapter number (value).
;; 5. Write out each chapter
;;    (1) Re-write the links that starts with <a href="#" and
;;        referring outside of the current chapter (sect1).
;;    (2) Delete footnotes if there are no referer in the current chapter.
(defun main (filename &optional outdir)
  (let* ((doc (new-dom filename))
         (out (if (null doc) (return-from main)
                  (if (null outdir) *outdir* outdir)))
         (*outdir* (if (alexandria:ends-with-subseq "/" out) out
                       (concatenate 'string out "/")))
         (srcdir (uiop/pathname:pathname-directory-pathname filename)))
    (try (ensure-directories-exist *outdir*) :return-from main)
    (process-css doc)
    (copy-images doc srcdir)
    (multiple-value-bind (ht chap-num chap-index) (create-id-database doc)
      (process-chapters filename chap-num ht chap-index))))

;;; ==========================================
;;;         Initialization Process
;;; ==========================================

(defun new-dom (filename)
  "Returns the DOM root of the given file."
  (try
   (with-open-file (stream filename :direction :input)
     (lquery:$ (initialize stream)))))

    

;;; ==========================================
;;;         CSS extraction
;;; ==========================================

(defun process-css (root-node)
  (format t "ASCIIDOCTOR-CHUNKER: Extracting style elements....~%")
  (loop with styles = (lquery:$ root-node "style")
     and fname = nil
     for node across styles
     for i = 0 then (1+ i)
     do
       (setf fname (format nil "style~a.css" i))
       (print-text (lquery-funcs:text node) (make-path fname))
       (lquery-funcs:replace-with node (make-css-link fname))))

;; private
(defun make-css-link (filename)
  (format nil "<link rel='stylesheet' href='~a' type='text/css' />" filename))


;;; ===================================================
;;;        Copying Images
;;; ===================================================

(defun copy-images (doc index-dir)
  "Copy local image files if modified or new."
  (format t "ASCIIDOCTOR-CHUNKER: Copying local images....~%")
  (mapcar (lambda (x)
            (let* ((dest (make-path x)) ; path to the output dir
                   (src-path (concatenate 'string
                                          (namestring index-dir) x)))
              (try (ensure-directories-exist dest))
              (try (if (> (file-write-date src-path)
                          (if (uiop/filesystem:file-exists-p dest)
                              (file-write-date dest) 0))
                       (cl-fad:copy-file src-path dest :overwrite t))))) ; copy to dest
          (get-local-images doc)))

(defun get-local-images (node)
  "Returns a list of paths of local images.  The path is relative to the document root adoc file."
  (let ((imgs (lquery:$ node "img" (attr "src"))))
    (loop for path across imgs
       when (and (not (string= (subseq path 0 4) "http"))
                 (uiop/pathname:relative-pathname-p path))
       collect path)))

;;; ==========================================
;;;       Chapter extraction
;;; ==========================================

(defun create-id-database (doc)
  "Returns the hashtable of (key, val)=(id, chap-num), the number of chapters, and the list of chapter indeces."
  (loop with ht = (make-hash-table :test #'equal)
     with chap-index = nil
     with with-prev-chap = nil ; this ele belongs to the prev chap if true
     for ch across (get-chapters doc)
     for index = 0 then (1+ index) ; index of chap vector
     for n = 0 then (1+ n)         ; chapter number
     do
       ;; (format t "~a~%~%" (get-ids ch))
       (mapcar (lambda (x) ; key=id, value=chapter number
                 (setf (gethash x ht) n))
               (get-ids ch))
       (if with-prev-chap ; create a list of chapter range
           (setf (car chap-index) (append (car chap-index) (list index)))
           (setf chap-index (cons (list index) chap-index)))
       (if (lquery-funcs:is ch "h1") ; set the flag for iteration
           (progn (decf n) (setf with-prev-chap t))
           (setf with-prev-chap nil))
     finally (return (values ht (1+ n) (reverse chap-index)))))

;; test create-id-database
; (let ((ht (create-id-database (new-dom *adoc*))))
;   (maphash #'(lambda (k v) (format t "Ch.~a: ~a~%" v k)) ht))

(defun process-chapters (filename chap-nums ids chap-index)
  ;; (format t "~a~%" chap-index)
  (loop
     for i from 0 below chap-nums
     for index = chap-index then (cdr index)
     do (write-chapter (new-dom filename) i ids index)))

;; num: chapter number to be written out
;; ids: hashtable (key, val)=(id, chapnum)
;; index: the car of index is the chapter range list,
;;        e.g. if the current chapter consists of 2nd, 3rd, 4th nodes
;;        of chapter nodes vector, then index = ((3 4 5) ....)
(defun write-chapter (doc num ids index)
  (format t "ASCIIDOCTOR-CHUNKER: Processing Chap ~a ....~%" num)
  (let* ((chaps (get-chapters doc))
         (chap-range (car index))
         (fname (make-path (if (zerop num) "index.html"
                               (format nil "chap~a.html" num))))
         (div (lquery-funcs:append
               (lquery:parse-html "<div id='content'></div>")
               (lquery-funcs:slice chaps ; extract current chaps
                                   (first chap-range)
                                   (1+ (car (last chap-range)))))))
    ;; (format t "~a~%" chap-range)
    (lquery-funcs:replace-with (get-chap-container doc) div)
    (rewrite-links (get-links doc) num ids)
    (remove-footnotes doc num ids)
    (print-node doc fname)))

;;;;; How to append a child node
;; (let ((container (lquery:parse-html "<div id='content'></div>"))
;;       (child (lquery:parse-html "<p>child node</p>")))
;;   (lquery-funcs:append container child)
;;   (lquery-funcs:serialize container *standard-output*))

(defun remove-footnotes (doc chap-num ids)
  "Removes the footnotes at the bottom of the page if the referer is not in this page."
  (let* ((fnotes (get-footnotes doc))
         (len (fill-pointer fnotes))
         (rems (get-removing-footnotes fnotes chap-num ids))
         (rem-len (fill-pointer rems)))
    (if (= len rem-len)
        (lquery-funcs:remove (get-node-with-id doc "div" "footnotes"))
        (when (> rem-len 0) (lquery-funcs:remove rems)))))

;; fnotes: the vector of <div class="footnote" id="_footnote_xx"> nodes.
;; ids: the hashtable of (key, val)=(id, chap-num)
(defun get-removing-footnotes (fnotes chap-num ids)
  "Returns the footnote nodes that does not belong the the chapter."
  (lquery:$ fnotes
            (filter (lambda (ele)
                      (let ((href (aref (lquery:$ ele "a" (attr "href")) 0)))
                        (or
                         ;; Refering other pages such as
                         ;;   chap1.html#_footnoteref1_
                         (not (equal #\# (char href 0)))
                         ;; the rest is not used if links are properly
                         ;; re-written 
                         (not (= chap-num
                                 (gethash (subseq href 1) ids)))))))))

(defun get-footnotes (node)
  "Returns the vector of <div class='footnote' id='_foonote_xx'> that contains the anchor to the referer."
  (lquery:$ node "div" (filter (lambda (ele)
                                 (equal (lquery-funcs:attr ele "class")
                                        "footnote")))))

(defun rewrite-links (nodes chap-num ids)
  "Re-write the links that points outside of the chapter."
  (loop with num = 0 and url = nil
     for link across nodes
     do
       (setf url (lquery-funcs:attr link "href"))
       (unless (alexandria:starts-with-subseq "#_footnote_" url) ;skip footnotes
         (setf num (gethash (subseq url 1) ids)) ; url starts with #
         (when num
           (unless (= chap-num num)
             (lquery-funcs:attr link :href
                                (if (zerop num)
                                    (format nil "index.html~a" url)
                                    (format nil "chap~a.html~a" num url))))))))
;;;;; How to rewrite href link
;; (let* ((doc (lquery:parse-html
;;              "<html><a href='http://dummy.com'>Dummy</a></html>"))
;;        (a (lquery:$ doc "a")))
;;   (lquery-funcs:attr a :href "#abc")
;;   (lquery-funcs:serialize doc *standard-output*))


(defun get-chap-container (doc)
  (get-node-with-id doc "div" "content"))

(defun get-header (doc)
  (get-node-with-id doc "div" "header"))

(defun get-chapters (doc)
  "Returns the vector of chapter nodes under the <div id='content'>"
  (lquery-funcs:children (get-chap-container doc)))
  

(defun get-links (node)
  "Returns the vector of anchors <a> under the given node.  Only the anchors whose href is starting with # pointing to inside of the document are returned."
  (lquery:$ node "a"
            (filter (lambda (ele)
                      (let ((url (lquery-funcs:attr ele "href")))
                        (when url ; in case <a> has no href attr
                          (string= #\# (char url 0))))))))
    
(defun get-ids (node &optional res)
  "Returns the list of all the ids under the given node."
  (if (null node) res
      (let* ((id (lquery-funcs:attr node "id"))
             (chlds (lquery:$ node (children)))
             (res2 (if id (cons id res) res)))
        (if (= (fill-pointer chlds) 0) res2 ; no children
            (append res2                    ; with children
                    (loop for child across chlds
                       append
                         (get-ids child)))))))


;;; ==================================================
;;;           Utilities
;;; ==================================================

;; private
(defun print-node (node &optional filename)
  "Prints a node to either standard output for to the file."
  (if (null filename)
      (lquery-funcs:serialize node *standard-output*)
      (with-open-file (stream
                       filename
                       :direction :output
                       :if-exists :supersede)
        (lquery-funcs:serialize node stream))))

(defun print-text (str &optional filename)
  "Prints strings to either standard output for to the file."
  (if (null filename)
      (format *standard-output* "~a" str)
      (with-open-file (stream
                       filename
                       :direction :output
                       :if-exists :supersede)
        (format stream "~a" str))))

;; private
(defun make-path (filename)
  "Returns the pathname prefixed with the output directory."
  (concatenate 'string *outdir* filename))

(defun get-node-with-id (node ele-name id)
  "Returns a vector of a node with the element name and id."
  (lquery:$ node ele-name
            (filter (lambda (ele) (string=
                                   (lquery-funcs:attr ele "id")
                                   id)))))

;; test for get-ids
; (get-ids (aref (get-chapters (new-dom *adoc*)) 4))

;; (defparameter *adoc1* "/Users/shito/Documents/git-repositories/intro-lisp/output/index.html")
;; (defparameter *adoc2* "/Users/shito/Documents/git-repositories/lisp/asciidoctor-chunker/test/output/single/user-manual.html")
;; (defparameter *adoc3* "/Users/shito/Documents/git-repositories/lisp/asciidoctor-chunker/issue/chap22.html")
;; (main *adoc*)
