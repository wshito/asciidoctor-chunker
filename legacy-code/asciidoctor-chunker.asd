#|
  This file is a part of Asciidoctor Chunker project.
  Copyright (c) 2018 wshito (@waterloo_jp)
|#

(defsystem "asciidoctor-chunker"
    :version "0.1"
    :author "wshito"
    :depends-on (:alexandria
                 :lquery
                 :uiop
                 :cl-fad)
    :components ((:module "src"
                          :components ((:file "main" :depends-on ("plump"))
                                       (:file "plump")))))
