(defsystem "asciidoc-chunker"
    :version "0.1"
    :author "wshito"
    :depends-on (:alexandria
                 :lquery
                 :uiop
                 :cl-fad)
    :components ((:module "src"
                          :components ((:file "main" :depends-on ("plump"))
                                       (:file "plump")))))
