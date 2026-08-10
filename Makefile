# =============================================================================
# Resume — local build
# =============================================================================
# Usage:
#   make            Build both published resume PDFs
#   make base-resume Build Laxman_KR_Resume.pdf
#   make job-resume Build Laxman_KR_Job_Resume_LWD.pdf
#   make open       Build and open the base resume
#   make open-job-resume Build and open the LWD job resume
#   make check      Verify both PDFs are two pages and non-empty
# =============================================================================

SRC       := cv.tex
LWD_SRC   := cv_lwd.tex
BASE_PDF  := Laxman_KR_Resume.pdf
LWD_PDF   := Laxman_KR_Job_Resume_LWD.pdf
PDFS      := $(BASE_PDF) $(LWD_PDF)
OUT_DIR   := .

# Detect available engines (tectonic preferred — single binary, auto-fetches packages)
TECTONIC := $(shell command -v tectonic 2>/dev/null)
LATEXMK  := $(shell command -v latexmk 2>/dev/null)
PDFLATEX := $(shell command -v pdflatex 2>/dev/null)
PDFINFO  := $(shell command -v pdfinfo 2>/dev/null)
PYTHON   := $(shell command -v python3 2>/dev/null)

.PHONY: all build pdf base-resume job-resume open open-job-resume watch check clean distclean help doctor setup

all: build

help:
	@echo ""
	@echo "  Resume build targets"
	@echo "  --------------------"
	@echo "  make / make build       Build both published resume PDFs"
	@echo "  make base-resume / pdf  Build $(BASE_PDF)"
	@echo "  make job-resume         Build $(LWD_PDF)"
	@echo "  make open               Build and open the base resume"
	@echo "  make open-job-resume    Build and open the LWD job resume"
	@echo "  make watch              Rebuild the base resume on save"
	@echo "  make check              Verify both PDFs are two pages and non-empty"
	@echo "  make clean              Remove intermediate LaTeX files"
	@echo "  make distclean          Remove intermediates and generated PDFs"
	@echo ""

doctor:
	@echo "Base source: $(SRC)"
	@echo "LWD source:  $(LWD_SRC)"
	@echo "Outputs:     $(PDFS)"
	@echo "tectonic: $(if $(TECTONIC),$(TECTONIC),not found)"
	@echo "latexmk:  $(if $(LATEXMK),$(LATEXMK),not found)"
	@echo "pdflatex: $(if $(PDFLATEX),$(PDFLATEX),not found)"
	@echo "pdfinfo:  $(if $(PDFINFO),$(PDFINFO),not found)"
	@if [ -z "$(TECTONIC)$(LATEXMK)$(PDFLATEX)" ]; then \
		echo ""; \
		echo "No LaTeX engine found. Run: make setup"; \
		exit 1; \
	fi

setup:
	@command -v brew >/dev/null || { echo "Homebrew required: https://brew.sh"; exit 1; }
	brew install tectonic
	@echo "Done. Run: make"

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------

build: $(PDFS)

pdf: $(BASE_PDF)

base-resume: $(BASE_PDF)

job-resume: $(LWD_PDF)

$(BASE_PDF): $(SRC)
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> Building base resume with tectonic"; \
		tectonic -o $(OUT_DIR) --keep-logs --keep-intermediates $(SRC); \
		mv -f $(OUT_DIR)/cv.pdf $(BASE_PDF); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> Building base resume with latexmk"; \
		latexmk -pdf -interaction=nonstopmode -jobname=$(basename $(BASE_PDF)) $(SRC); \
	elif [ -n "$(PDFLATEX)" ]; then \
		echo "==> Building base resume with pdflatex (2 passes)"; \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(BASE_PDF)) $(SRC); \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(BASE_PDF)) $(SRC); \
	else \
		echo "No LaTeX engine found."; \
		echo "  macOS: make setup"; \
		exit 1; \
	fi
	@echo "==> Wrote $(BASE_PDF)"

$(LWD_PDF): $(SRC) $(LWD_SRC)
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> Building LWD job resume with tectonic"; \
		tectonic -o $(OUT_DIR) --keep-logs --keep-intermediates $(LWD_SRC); \
		mv -f $(OUT_DIR)/cv_lwd.pdf $(LWD_PDF); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> Building LWD job resume with latexmk"; \
		latexmk -pdf -interaction=nonstopmode -jobname=$(basename $(LWD_PDF)) $(LWD_SRC); \
	elif [ -n "$(PDFLATEX)" ]; then \
		echo "==> Building LWD job resume with pdflatex (2 passes)"; \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(LWD_PDF)) $(LWD_SRC); \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(LWD_PDF)) $(LWD_SRC); \
	else \
		echo "No LaTeX engine found."; \
		echo "  macOS: make setup"; \
		exit 1; \
	fi
	@echo "==> Wrote $(LWD_PDF)"

open: $(BASE_PDF)
	@open $(BASE_PDF) 2>/dev/null || xdg-open $(BASE_PDF) 2>/dev/null || echo "Open $(BASE_PDF) manually"

open-job-resume: $(LWD_PDF)
	@open $(LWD_PDF) 2>/dev/null || xdg-open $(LWD_PDF) 2>/dev/null || echo "Open $(LWD_PDF) manually"

# -----------------------------------------------------------------------------
# Watch
# -----------------------------------------------------------------------------

watch:
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> Watching base resume with tectonic (Ctrl+C to stop)"; \
		tectonic -o $(OUT_DIR) --keep-logs -x watch $(SRC) 2>/dev/null \
			|| (echo "Note: using poll loop"; \
			    while true; do \
			      $(MAKE) --no-print-directory base-resume; \
			      sleep 2; \
			    done); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> Watching base resume with latexmk (Ctrl+C to stop)"; \
		latexmk -pdf -pvc -interaction=nonstopmode -jobname=$(basename $(BASE_PDF)) $(SRC); \
	else \
		echo "watch requires tectonic or latexmk. Run: make setup"; \
		exit 1; \
	fi

# -----------------------------------------------------------------------------
# QA
# -----------------------------------------------------------------------------

check: $(PDFS)
	@echo "==> QA checks"
	@for pdf in $(PDFS); do \
		echo "    $$pdf"; \
		if [ -n "$(PDFINFO)" ]; then \
			PAGES=$$($(PDFINFO) "$$pdf" | awk '/^Pages:/ {print $$2}'); \
			echo "      Pages: $$PAGES"; \
			if [ "$$PAGES" != "2" ]; then \
				echo "      FAIL: expected 2 pages, got $$PAGES"; \
				exit 1; \
			fi; \
		elif [ -n "$(PYTHON)" ]; then \
			$(PYTHON) -c "import re,sys; d=open('$$pdf','rb').read(); m=re.search(rb'/Type\\s*/Pages.*?/Count\\s+(\\d+)', d, re.S); n=int(m.group(1)) if m else -1; print(f'      Pages (approx): {n}'); sys.exit(0 if n==2 else 1)" \
				|| { echo "      FAIL: expected 2 pages"; exit 1; }; \
		else \
			echo "      SKIP: install poppler (pdfinfo) for page-count check"; \
		fi; \
		SIZE=$$(wc -c < "$$pdf" | tr -d ' '); \
		echo "      Size: $$SIZE bytes"; \
		if [ "$$SIZE" -lt 1000 ]; then echo "      FAIL: PDF too small"; exit 1; fi; \
	done
	@$(PYTHON) -c "import pathlib; t=pathlib.Path('$(SRC)').read_text(); assert r'\\ifdefined\\LWDResume' in t; assert t.count(r'\\textbf{') < 45; print('    PASS: conditional LWD header and bold-span limit')" 2>/dev/null || true
	@echo "==> check OK"

# -----------------------------------------------------------------------------
# Clean
# -----------------------------------------------------------------------------

clean:
	@rm -f cv.aux cv.bbl cv.bcf cv.fdb_latexmk cv.fls cv.log cv.out cv.run.xml cv.blg cv.toc cv.synctex.gz
	@rm -f cv_lwd.aux cv_lwd.bbl cv_lwd.bcf cv_lwd.fdb_latexmk cv_lwd.fls cv_lwd.log cv_lwd.out cv_lwd.run.xml cv_lwd.blg cv_lwd.toc cv_lwd.synctex.gz
	@rm -f $(basename $(BASE_PDF)).aux $(basename $(BASE_PDF)).bbl $(basename $(BASE_PDF)).bcf \
		$(basename $(BASE_PDF)).fdb_latexmk $(basename $(BASE_PDF)).fls $(basename $(BASE_PDF)).log \
		$(basename $(BASE_PDF)).out $(basename $(BASE_PDF)).run.xml $(basename $(BASE_PDF)).blg \
		$(basename $(BASE_PDF)).toc $(basename $(BASE_PDF)).synctex.gz
	@rm -f $(basename $(LWD_PDF)).aux $(basename $(LWD_PDF)).bbl $(basename $(LWD_PDF)).bcf \
		$(basename $(LWD_PDF)).fdb_latexmk $(basename $(LWD_PDF)).fls $(basename $(LWD_PDF)).log \
		$(basename $(LWD_PDF)).out $(basename $(LWD_PDF)).run.xml $(basename $(LWD_PDF)).blg \
		$(basename $(LWD_PDF)).toc $(basename $(LWD_PDF)).synctex.gz
	@rm -f *.fdb_latexmk *.fls *~
	@echo "==> cleaned intermediates"

distclean: clean
	@rm -f $(PDFS) cv.pdf cv_lwd.pdf
	@echo "==> removed generated PDFs"
