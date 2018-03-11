(defsystem "adoc-chunker"
    :version "0.1"
    :author "wshito"
    :depends-on (:alexandria)
;    :depends-on (:lquery)
    :components ((:module "src"
                          :components ((:file "main")))))
