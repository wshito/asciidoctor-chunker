(defsystem "asciidoc-chunker"
    :version "0.1"
    :author "wshito"
    :depends-on (:alexandria
                 :lquery)
    :components ((:module "src"
                          :components ((:file "main")))))
