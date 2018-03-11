(in-package :cl-user)

(defpackage :adoc-chunker
  (:use :cl)
  (:export :main))

(in-package :adoc-chunker)

;; Default output directory.  This is overwritten if outdir is
;; specified in the argument of main function.
(defparameter *outdir* "output/")

;; <style>エレメントをcssファイルに書き出し．
;; idデータベース（idをキー，章番号を値とするハッシュテーブル）構築
;; 章ごとにファイルの書き出し．
;; 章ごとに<a href="#"で始まるリンクのsect1外への参照をファイル名付きに書き換える．
;; 章内にfootnoteへの参照がなければ章末のfootnoteを削除する．
(defun main (filename &optional outdir)
  (let* ((doc (new-dom filename))
         (out (if (null outdir) *outdir* outdir))
         (*outdir* (if (alexandria:ends-with-subseq "/" out) out
                       (concatenate 'string out "/"))))
    (ensure-directories-exist *outdir*)
    (process-css doc)
    (process-chapters filename
                      (fill-pointer (get-chapters doc))
                      (create-id-database doc))))
;    (print-node doc (make-path "index.html"))))

;; private
(defun new-dom (filename)
  "Returns the DOM root of the given file."
  (with-open-file (stream filename :direction :input)
    (lquery:$ (initialize stream))))

;; private
(defun process-css (root-node)
  (loop with styles = (lquery:$ root-node "style")
     and fname = nil
     for node across styles
     for i = 0 then (1+ i)
     do
       (setf fname (format nil "style~a.css" i))
       (print-text (lquery-funcs:text node))
       (lquery-funcs:replace-with node (make-css-link fname))))

;; private
(defun make-css-link (filename)
  (format nil "<link rel='stylesheet' href='~a' type='text/css' />" filename))

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

(defun create-id-database (doc)
  "Returns the hashtable of (key, val)=(id, chap-num)."
  (loop with ht = (make-hash-table :test #'equal)
     for ch across (get-chapters doc)
     for n = 0 then (1+ n)
     do
       ;; (format t "~a~%~%" (get-ids ch))
       (mapcar (lambda (x) ; key=id, value=chapter number
                 (setf (gethash x ht) n))
               (get-ids ch))
     finally (return ht)))

;; test create-id-database
; (let ((ht (create-id-database (new-dom *adoc*))))
;   (maphash #'(lambda (k v) (format t "Ch.~a: ~a~%" v k)) ht))

(defun process-chapters (filename chap-nums ids)
  (loop
     for i from 0 below chap-nums
     do (write-chapter (new-dom filename) i ids)))

;; num: chapter number to be written out
;; ids: hashtable (key, val)=(id, chapnum)
(defun write-chapter (doc num ids)
  (let* ((rems (get-chapters doc))
         (chap-node (aref rems num))
         (fname (make-path (if (zerop num) "index.html"
                               (format nil "chap~a.html" num)))))
    (lquery-funcs:remove rems "div") ; remove all the chapters
    (lquery-funcs:append (get-chap-container doc) chap-node) ; append this chap
    (rewrite-links (get-links doc) num ids)
    (print-node doc fname)))

;;;;; How to append a child node
;; (let ((container (lquery:parse-html "<div id='content'></div>"))
;;       (child (lquery:parse-html "<p>child node</p>")))
;;   (lquery-funcs:append container child)
;;   (lquery-funcs:serialize container *standard-output*))

(defun rewrite-links (nodes chap-num ids)
  "Re-write the links that points outside of the chapter."
  (loop with num = 0 and url = nil
     for link across nodes
     do
       (setf url (lquery-funcs:attr link "href"))
       (unless (alexandria:starts-with-subseq "#_footnote_" url) ;skip footnotes
         (setf num (gethash (subseq url 1) ids)) ; url starts with #
         (unless (= chap-num num)
           (lquery-funcs:attr link :href
                              (if (zerop num)
                                  (format nil "index.html~a" url)
                                  (format nil "chap~a.html~a" num url)))))))
;;;;; How to rewrite href link
;; (let* ((doc (lquery:parse-html
;;              "<html><a href='http://dummy.com'>Dummy</a></html>"))
;;        (a (lquery:$ doc "a")))
;;   (lquery-funcs:attr a :href "#abc")
;;   (lquery-funcs:serialize doc *standard-output*))


(defun get-node-with-id (node ele-name id)
  "Returns a vector of a node with the element name and id."
  (lquery:$ node ele-name
            (filter (lambda (ele) (string=
                                   (lquery-funcs:attr ele "id")
                                   id)))))
(defun get-chap-container (doc)
  (get-node-with-id doc "div" "content"))

(defun get-header (doc)
  (get-node-with-id doc "div" "header"))

(defun get-chapters (node)
  "Returns the vector of chapter nodes which is the <div class='sect1'>"
  (lquery:$ node "div"
            (filter (lambda (ele) (string=
                                   (lquery-funcs:attr ele "class")
                                   "sect1")))))

(defun get-links (node)
  "Returns the vector of anchors <a> under the given node.  Only the anchors whose href is starting with # pointing to inside of the document are returned."
  (lquery:$ node "a"
            (filter (lambda (ele)
                      (string= #\# (char (lquery-funcs:attr ele "href") 0))))))
    
(defun get-ids (node &optional res)
  "Returns the list of all the ids under the given node."
  (let* ((id (lquery-funcs:attr node "id"))
         (chlds (lquery:$ node (children))))
    (if (= (fill-pointer chlds) 0)
        (if id (cons id res) res)
        (%get-ids2 chlds res))))

(defun %get-ids2 (nodes res)
  (if (= (fill-pointer nodes) 0) res
      (append (get-ids (vector-pop nodes) res)
              (%get-ids2 nodes nil))))
            


(defparameter *adoc* "/Users/shito/Documents/git-repositories/intro-lisp/output/index.html")
(defparameter *test* (asdf:system-relative-pathname :lquery "test.html"))
(main *adoc*)
