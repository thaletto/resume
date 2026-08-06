# =============================================================================
# Resume — local build
# =============================================================================
# Usage:
#   make            Build Laxman_KR_Resume.pdf from cv.tex
#   make open       Build and open the PDF
#   make watch      Rebuild on save (tectonic or latexmk)
#   make check      Page count + basic QA after build
#   make clean      Remove aux files
#   make distclean  Remove aux + PDF
#   make help       Show this help
# =============================================================================

SRC      := cv.tex
PDF      := Laxman_KR_Resume.pdf
OUT_DIR  := .
ENGINE   :=

# Detect available engines (tectonic preferred — single binary, auto-fetches packages)
TECTONIC := $(shell command -v tectonic 2>/dev/null)
LATEXMK  := $(shell command -v latexmk 2>/dev/null)
PDFLATEX := $(shell command -v pdflatex 2>/dev/null)
PDFINFO  := $(shell command -v pdfinfo 2>/dev/null)
PYTHON   := $(shell command -v python3 2>/dev/null)

.PHONY: all build pdf open watch check clean distclean help doctor setup

all: build

help:
	@echo ""
	@echo "  Resume build targets"
	@echo "  --------------------"
	@echo "  make / make build   Compile $(SRC) → $(PDF)"
	@echo "  make open           Build and open $(PDF)"
	@echo "  make watch          Auto-rebuild on file changes"
	@echo "  make check          Build + verify 1 page + text extract"
	@echo "  make doctor         Show which TeX tools are installed"
	@echo "  make setup          Install tectonic via Homebrew (macOS)"
	@echo "  make clean          Remove intermediate LaTeX files"
	@echo "  make distclean      Remove intermediates and $(PDF)"
	@echo ""

doctor:
	@echo "Source:  $(SRC)"
	@echo "Output:  $(PDF)"
	@echo "tectonic: $(if $(TECTONIC),$(TECTONIC),not found)"
	@echo "latexmk:  $(if $(LATEXMK),$(LATEXMK),not found)"
	@echo "pdflatex: $(if $(PDFLATEX),$(PDFLATEX),not found)"
	@echo "pdfinfo:  $(if $(PDFINFO),$(PDFINFO),not found)"
	@if [ -z "$(TECTONIC)$(LATEXMK)$(PDFLATEX)" ]; then \
		echo ""; \
		echo "No LaTeX engine found. Run:  make setup"; \
		exit 1; \
	fi

setup:
	@command -v brew >/dev/null || { echo "Homebrew required: https://brew.sh"; exit 1; }
	brew install tectonic
	@echo "Done. Run: make"

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------

build: $(PDF)

pdf: $(PDF)

$(PDF): $(SRC)
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> Building with tectonic"; \
		tectonic -o $(OUT_DIR) --keep-logs --keep-intermediates $(SRC); \
		mv -f $(OUT_DIR)/cv.pdf $(PDF); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> Building with latexmk"; \
		latexmk -pdf -interaction=nonstopmode -jobname=$(basename $(PDF)) $(SRC); \
	elif [ -n "$(PDFLATEX)" ]; then \
		echo "==> Building with pdflatex (2 passes)"; \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(PDF)) $(SRC); \
		pdflatex -interaction=nonstopmode -jobname=$(basename $(PDF)) $(SRC); \
	else \
		echo "No LaTeX engine found."; \
		echo "  macOS:  make setup"; \
		echo "  or install MacTeX / TeX Live and re-run make"; \
		exit 1; \
	fi
	@echo "==> Wrote $(PDF)"

open: $(PDF)
	@open $(PDF) 2>/dev/null || xdg-open $(PDF) 2>/dev/null || echo "Open $(PDF) manually"

# -----------------------------------------------------------------------------
# Watch (rebuild on save)
# -----------------------------------------------------------------------------

watch:
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> Watching with tectonic (Ctrl+C to stop)"; \
		tectonic -o $(OUT_DIR) --keep-logs -x watch $(SRC) 2>/dev/null \
			|| (echo "Note: using poll loop"; \
			    while true; do \
			      $(MAKE) --no-print-directory build; \
			      sleep 2; \
			    done); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> Watching with latexmk (Ctrl+C to stop)"; \
		latexmk -pdf -pvc -interaction=nonstopmode -jobname=$(basename $(PDF)) $(SRC); \
	else \
		echo "watch requires tectonic or latexmk. Run: make setup"; \
		exit 1; \
	fi

# -----------------------------------------------------------------------------
# QA
# -----------------------------------------------------------------------------

check: $(PDF)
	@echo "==> QA checks"
	@if [ -n "$(PDFINFO)" ]; then \
		PAGES=$$(pdfinfo $(PDF) | awk '/^Pages:/ {print $$2}'); \
		echo "    Pages: $$PAGES"; \
		if [ "$$PAGES" != "1" ]; then \
			echo "    FAIL: expected 1 page, got $$PAGES"; \
			exit 1; \
		fi; \
		echo "    PASS: single page"; \
	elif [ -n "$(PYTHON)" ]; then \
		$(PYTHON) -c "import re,sys; d=open('$(PDF)','rb').read(); \
		  m=re.search(rb'/Type\\s*/Pages.*?/Count\\s+(\\d+)', d, re.S); \
		  n=int(m.group(1)) if m else -1; \
		  print(f'    Pages (approx): {n}'); \
		  sys.exit(0 if n==1 else 1)" || { echo "    FAIL: not single-page (or unreadable)"; exit 1; }; \
		echo "    PASS: single page"; \
	else \
		echo "    SKIP: install poppler (pdfinfo) for page-count check"; \
	fi
	@SIZE=$$(wc -c < $(PDF) | tr -d ' '); \
		echo "    Size:  $$SIZE bytes"; \
		if [ "$$SIZE" -lt 1000 ]; then echo "    FAIL: PDF too small"; exit 1; fi
	@$(PYTHON) -c "\
import re, pathlib; \
t=pathlib.Path('$(SRC)').read_text(); \
n=t.count(r'\\textbf{'); \
print(f'    Bold spans: {n}'); \
assert n < 45, f'too much bold ({n})'" 2>/dev/null || true
	@echo "==> check OK"

# -----------------------------------------------------------------------------
# Clean
# -----------------------------------------------------------------------------

clean:
	@rm -f cv.aux cv.bbl cv.bcf cv.fdb_latexmk cv.fls cv.log cv.out cv.run.xml cv.blg cv.toc cv.synctex.gz
	@rm -f $(basename $(PDF)).aux $(basename $(PDF)).bbl $(basename $(PDF)).bcf \
		$(basename $(PDF)).fdb_latexmk $(basename $(PDF)).fls $(basename $(PDF)).log \
		$(basename $(PDF)).out $(basename $(PDF)).run.xml $(basename $(PDF)).blg \
		$(basename $(PDF)).toc $(basename $(PDF)).synctex.gz
	@rm -f *.fdb_latexmk *.fls *~
	@echo "==> cleaned intermediates"

distclean: clean
	@rm -f $(PDF) cv.pdf
	@echo "==> removed $(PDF)"
