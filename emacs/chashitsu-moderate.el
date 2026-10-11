;;; chashitsu-moderate.el --- Approve pieces from /roji  -*- lexical-binding: t; -*-

;;; Commentary:

;; The pieces guests make in the /roji workshop wait in my inbox (worker/)
;; until I look at them. This lists them with their pictures. Approving
;; one adds it to src/data/pieces.json and commits that; the next build
;; of the site puts it on the shelf.
;;
;;   M-x chashitsu-moderate     the list
;;     a    approve the piece at point
;;     r    reject it
;;     RET  look at it large, with its card
;;     g    ask the inbox again
;;     q    close
;;
;;   (chashitsu-mode-line-mode 1)   N in the mode line while pieces wait
;;
;; The token is read from ~/.authinfo.gpg:
;;   machine roji-inbox.<account>.workers.dev login roji password <ADMIN_TOKEN>
;; See worker/README.md for the rest.

;;; Code:

(require 'auth-source)
(require 'json)
(require 'url)
(require 'url-http)

(defvar url-http-response-status)
(defvar url-http-content-type)

(defgroup chashitsu nil
  "The guests' pieces from the /roji tea garden."
  :group 'applications)

(defcustom chashitsu-inbox-url ""
  "The Worker's address, e.g. https://roji-inbox.<account>.workers.dev."
  :type 'string)

(defcustom chashitsu-repo "~/Dokumenty/GitHub/sw.szymon-wilczek.me/"
  "The site's repository, where src/data/pieces.json lives."
  :type 'directory)

(defcustom chashitsu-poll-seconds 900
  "How often the mode line asks the inbox how many pieces wait."
  :type 'integer)

(defconst chashitsu--clays ["buff" "red" "dark" "white"])
(defconst chashitsu--glazes ["tenmoku" "shino" "ame" "seiji" "ruri" "oribe" "shu"])

(defvar chashitsu--waiting nil
  "How many pieces waited when the inbox was last asked, or nil.")

(defun chashitsu--token ()
  "The admin token for the inbox's host, from auth-source."
  (let* ((host (url-host (url-generic-parse-url chashitsu-inbox-url)))
          (found (car (auth-source-search :host host :user "roji" :max 1)))
          (secret (plist-get found :secret)))
    (unless secret
      (user-error "No token for %s in auth-source (login roji)" host))
    (if (functionp secret) (funcall secret) secret)))

(defun chashitsu--request (method path)
  "Send METHOD to PATH on the inbox; return the parsed reply, or its text."
  (when (string-empty-p chashitsu-inbox-url)
    (user-error "Set `chashitsu-inbox-url' first"))
  (let* ((url-request-method method)
          (url-request-extra-headers
            `(("Authorization" . ,(concat "Bearer " (chashitsu--token)))))
          (url-request-data (and (equal method "POST") ""))
          (buf (url-retrieve-synchronously
                 (concat (string-trim-right chashitsu-inbox-url "/") path) t t 20)))
    (unless buf (error "The inbox did not answer"))
    (with-current-buffer buf
      (unwind-protect
        (let ((status url-http-response-status))
          (goto-char (point-min))
          (re-search-forward "\r?\n\r?\n" nil 'move)
          (let ((body (decode-coding-string
                        (buffer-substring-no-properties (point) (point-max)) 'utf-8)))
            (unless (and status (< status 300))
              (error "The inbox said %s: %s" status (string-trim body)))
            (if (string-prefix-p "application/json" (or url-http-content-type ""))
              (chashitsu--parse body)
              body)))
        (kill-buffer buf)))))

(defun chashitsu--parse (s)
  (json-parse-string s :object-type 'alist :array-type 'array
    :null-object :null :false-object :false))

(defun chashitsu--pending ()
  "The pieces waiting in the inbox."
  (let ((list (chashitsu--request "GET" "/admin/pending")))
    (setq chashitsu--waiting (length list))
    (force-mode-line-update t)
    list))

(defun chashitsu--pieces-file ()
  (expand-file-name "src/data/pieces.json" chashitsu-repo))

(defun chashitsu--add (piece)
  "Add PIECE to pieces.json, one piece to a line, and commit it."
  (let* ((file (chashitsu--pieces-file))
          (old (with-temp-buffer
                 (insert-file-contents file)
                 (chashitsu--parse (buffer-string))))
          (all (append old (list piece)))
          (name (alist-get 'name piece))
          (default-directory (file-name-as-directory chashitsu-repo)))
    (with-temp-file file
      (insert "[\n"
        (mapconcat (lambda (p)
                     (concat "  " (json-serialize p :null-object :null
                                    :false-object :false)))
          all ",\n")
        "\n]\n"))
    (unless (zerop (call-process "git" nil nil nil "add" "src/data/pieces.json"))
      (error "git add failed"))
    (unless (zerop (call-process "git" nil nil nil "commit" "-q" "-m"
                     (format "tea: %s's piece on the shelf" name)))
      (error "git commit failed"))
    (length all)))

(defun chashitsu--words (piece)
  "What the card under PIECE says, as in pottery.ts."
  (let* ((h (alist-get 'H piece))
          (glaze (alist-get 'glaze piece))
          (kind (cond ((< h 20) "plate")
                  ((eq (alist-get 'handle piece) t) "cup")
                  ((< h 50) "bowl")
                  (t "yunomi"))))
    (list (format "%s · %s clay" kind (aref chashitsu--clays (alist-get 'clay piece)))
      (if (and glaze (not (eq glaze :null)))
        (format "%s glaze" (aref chashitsu--glazes (alist-get 'c glaze)))
        "unglazed")
      (if (not (memq (alist-get 'kin piece) '(nil :null)))
        "cracked in the kiln, mended in gold"
        "fired twice in the climbing kiln"))))

(defun chashitsu--image (entry scale)
  (when (image-type-available-p 'svg)
    (create-image (encode-coding-string (alist-get 'svg entry) 'utf-8)
      'svg t :scale scale :ascent 'center)))

(defun chashitsu--insert (entry)
  "Insert ENTRY, one waiting piece, with its picture and its words."
  (let ((start (point))
         (piece (alist-get 'piece entry))
         (img (chashitsu--image entry 0.6)))
    (if img (insert-image img "[piece]") (insert "[piece]"))
    (insert "  "
      (propertize (alist-get 'name piece) 'face 'bold)
      (propertize (format "  #%d · %s\n" (alist-get 'id entry)
                    (substring (alist-get 'at entry) 0 10))
        'face 'shadow))
    (dolist (w (chashitsu--words piece))
      (insert "    " w "\n"))
    (insert "\n")
    (put-text-property start (point) 'chashitsu entry)))

(defun chashitsu--at-point ()
  (or (get-text-property (point) 'chashitsu)
    (user-error "No piece here")))

(defun chashitsu-refresh ()
  "Ask the inbox again."
  (interactive)
  (let ((inhibit-read-only t)
         (list (chashitsu--pending))
         (line (line-number-at-pos)))
    (erase-buffer)
    (insert (propertize "陶 " 'face 'bold)
      (if (> (length list) 0)
        (format "%d waiting · a approve · r reject · RET look · g again\n\n"
          (length list))
        "nothing waiting.\n"))
    (mapc #'chashitsu--insert list)
    (goto-char (point-min))
    (forward-line (1- line))))

(defun chashitsu-approve ()
  "Approve the piece at point: onto the shelf in pieces.json, committed."
  (interactive)
  (let* ((entry (chashitsu--at-point))
          (name (alist-get 'name (alist-get 'piece entry))))
    (when (y-or-n-p (format "Put %s's piece on the shelf? " name))
      (let* ((piece (chashitsu--request
                      "POST" (format "/admin/%d/approve" (alist-get 'id entry))))
              (n (chashitsu--add piece)))
        (chashitsu-refresh)
        (message "%s's piece is on the shelf (%d there now); push when you like" name n)))))

(defun chashitsu-reject ()
  "Reject the piece at point; the inbox forgets it."
  (interactive)
  (let* ((entry (chashitsu--at-point))
          (name (alist-get 'name (alist-get 'piece entry))))
    (when (yes-or-no-p (format "Reject %s's piece for good? " name))
      (chashitsu--request "POST" (format "/admin/%d/reject" (alist-get 'id entry)))
      (chashitsu-refresh)
      (message "Rejected."))))

(defun chashitsu-look ()
  "Show the piece at point large, with everything on its card."
  (interactive)
  (let* ((entry (chashitsu--at-point))
          (piece (alist-get 'piece entry))
          (img (chashitsu--image entry 1.4)))
    (with-current-buffer (get-buffer-create "*chashitsu piece*")
      (let ((inhibit-read-only t))
        (erase-buffer)
        (if img (insert-image img) (insert "[no SVG support]"))
        (insert "\n\n" (propertize (alist-get 'name piece) 'face 'bold) "\n")
        (dolist (w (chashitsu--words piece)) (insert w "\n"))
        (insert (format "made %s · %d strokes of paint · signed in %d strokes\n"
                  (alist-get 'made piece)
                  (length (alist-get 'paint piece))
                  (length (alist-get 'sign piece)))))
      (special-mode)
      (goto-char (point-min))
      (pop-to-buffer (current-buffer)))))

(defvar-keymap chashitsu-moderate-mode-map
  :parent special-mode-map
  "a" #'chashitsu-approve
  "r" #'chashitsu-reject
  "g" #'chashitsu-refresh
  "RET" #'chashitsu-look
  "n" #'chashitsu-next
  "p" #'chashitsu-previous)

(defun chashitsu-next ()
  "Go to the next piece."
  (interactive)
  (let ((here (get-text-property (point) 'chashitsu))
         (next (next-single-property-change (point) 'chashitsu)))
    (when (and here next) (setq next (next-single-property-change next 'chashitsu)))
    (when (and next (not here) (null (get-text-property next 'chashitsu)))
      (setq next (next-single-property-change next 'chashitsu)))
    (if next (goto-char next) (message "That was the last."))))

(defun chashitsu-previous ()
  "Go to the previous piece."
  (interactive)
  (let ((prev (previous-single-property-change (point) 'chashitsu)))
    (when (and prev (null (get-text-property prev 'chashitsu)))
      (setq prev (previous-single-property-change prev 'chashitsu)))
    (if prev (goto-char prev) (message "That was the first."))))

(define-derived-mode chashitsu-moderate-mode special-mode "陶"
  "The guests' pieces waiting for the host.
\\{chashitsu-moderate-mode-map}"
  (setq-local revert-buffer-function (lambda (&rest _) (chashitsu-refresh))))

;;;###autoload
(defun chashitsu-moderate ()
  "List the pieces waiting in the /roji inbox."
  (interactive)
  (with-current-buffer (get-buffer-create "*chashitsu*")
    (chashitsu-moderate-mode)
    (chashitsu-refresh)
    (pop-to-buffer (current-buffer))))

(defvar chashitsu--timer nil)

(defun chashitsu--poll ()
  "Ask quietly how many pieces wait, for the mode line."
  (condition-case nil
    (chashitsu--pending)
    (error (setq chashitsu--waiting nil))))

(defconst chashitsu--lighter
  '(:eval (when (and chashitsu--waiting (> chashitsu--waiting 0))
            (propertize (format " 陶 %d" chashitsu--waiting)
              'help-echo "Pieces waiting in the /roji inbox: mouse-1 to look"
              'mouse-face 'mode-line-highlight
              'local-map (make-mode-line-mouse-map
                           'mouse-1 #'chashitsu-moderate)))))

;;;###autoload
(define-minor-mode chashitsu-mode-line-mode
  "Show 陶 N in the mode line while N pieces wait for the host."
  :global t
  (when chashitsu--timer (cancel-timer chashitsu--timer))
  (setq chashitsu--timer nil)
  (setq global-mode-string (delete chashitsu--lighter (or global-mode-string '(""))))
  (when chashitsu-mode-line-mode
    (add-to-list 'global-mode-string chashitsu--lighter t)
    (setq chashitsu--timer
      (run-with-idle-timer 5 nil
        (lambda ()
          (chashitsu--poll)
          (setq chashitsu--timer
            (run-at-time chashitsu-poll-seconds
              chashitsu-poll-seconds
              #'chashitsu--poll)))))))

(provide 'chashitsu-moderate)
;;; chashitsu-moderate.el ends here
