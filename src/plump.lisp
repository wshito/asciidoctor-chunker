#|
  This file is a part of Asciidoctor Chunker project.
  
  Copyright (c) 2018 wshito (@waterloo_jp)
|#

(in-package #:org.shirakumo.plump.dom)

;; Overwride the seralizer for an element node to print
;; the empty node with <tag></tag>
(defmethod plump:serialize-object ((node element))
    (or (plump-parser:do-tag-printers (test printer)
          (when (funcall test (tag-name node))
            (return (funcall printer node))))
        (progn
          (wrs "<" (tag-name node))
          (serialize (attributes node) *stream*)
          (wrs ">")
          (loop for child across (children node)
             do (serialize child *stream*))
          (wrs "</" (tag-name node) ">"))))
