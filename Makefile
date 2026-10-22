# =============================================================================
# Resume — local build
# =============================================================================
# Usage:
#   make            Show available targets
#   make build      Build every resume PDF into dist/
#   make laxman     Build dist/Laxman_KR_Resume.pdf
#   make sraya      Build dist/Sraya_Rajan_Resume.pdf
#   make open       Build and open the Laxman resume
#   make watch      Rebuild the Laxman resume on save
#   make check      Verify PDFs are non-empty and two pages
#   make doctor     Show sources and detected LaTeX engines
#   make setup      Install tectonic via Homebrew (macOS)
#   make clean      Remove build intermediates (keeps PDFs)
#   make distclean  Remove intermediates and PDFs
# =============================================================================

SRC_DIR    := resumes
OUT_DIR    := dist

LAXMAN_SRC := $(SRC_DIR)/laxman-kr/cv.tex
SRAYA_SRC  := $(SRC_DIR)/sraya-rajan/cv.tex
LAXMAN_PDF := $(OUT_DIR)/Laxman_KR_Resume.pdf
SRAYA_PDF  := $(OUT_DIR)/Sraya_Rajan_Resume.pdf
PDFS       := $(LAXMAN_PDF) $(SRAYA_PDF)
ASSETS     := assets/claude-certified-developer-foundations.png

# Detect available engines (tectonic preferred — single binary, auto-fetches packages)
TECTONIC := $(shell command -v tectonic 2>/dev/null)
LATEXMK  := $(shell command -v latexmk 2>/dev/null)
PDFLATEX := $(shell command -v pdflatex 2>/dev/null)
PYTHON   := $(shell command -v python3 2>/dev/null)

.DEFAULT_GOAL := help
.PHONY: all build help laxman sraya open watch check doctor setup clean distclean

# Compile $(1) with whichever engine is installed, then move the result to $(2).
# $(3) is the label used in progress output.
define compile
	@mkdir -p $(OUT_DIR)
	@if [ -n "$(TECTONIC)" ]; then \
		echo "==> $(3): tectonic"; \
		tectonic -o $(OUT_DIR) --keep-logs $(1); \
		mv -f $(OUT_DIR)/$(basename $(notdir $(1))).pdf $(2); \
	elif [ -n "$(LATEXMK)" ]; then \
		echo "==> $(3): latexmk"; \
		latexmk -pdf -interaction=nonstopmode -outdir=$(OUT_DIR) \
			-jobname=$(basename $(notdir $(2))) $(1); \
	elif [ -n "$(PDFLATEX)" ]; then \
		echo "==> $(3): pdflatex (2 passes)"; \
		pdflatex -interaction=nonstopmode -output-directory=$(OUT_DIR) \
			-jobname=$(basename $(notdir $(2))) $(1) >/dev/null; \
		pdflatex -interaction=nonstopmode -output-directory=$(OUT_DIR) \
			-jobname=$(basename $(notdir $(2))) $(1) >/dev/null; \
	else \
		echo "No LaTeX engine found. macOS: make setup"; \
		exit 1; \
	fi
	@echo "==> Wrote $(2)"
endef

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

help:
	@echo ""
	@echo "  make build       Build all resume PDFs into $(OUT_DIR)/"
	@echo "  make laxman      Build $(LAXMAN_PDF)"
	@echo "  make sraya       Build $(SRAYA_PDF)"
	@echo "  make open        Build and open the Laxman resume"
	@echo "  make watch       Rebuild the Laxman resume on save"
	@echo "  make check       Verify PDFs are non-empty and two pages"
	@echo "  make doctor      Show sources and detected LaTeX engines"
	@echo "  make setup       Install tectonic via Homebrew (macOS)"
	@echo "  make clean       Remove build intermediates (keeps PDFs)"
	@echo "  make distclean   Remove intermediates and PDFs"
	@echo ""

doctor:
	@echo "Laxman source: $(LAXMAN_SRC)"
	@echo "Sraya source:  $(SRAYA_SRC)"
	@echo "Outputs:       $(PDFS)"
	@echo "tectonic: $(if $(TECTONIC),$(TECTONIC),not found)"
	@echo "latexmk:  $(if $(LATEXMK),$(LATEXMK),not found)"
	@echo "pdflatex: $(if $(PDFLATEX),$(PDFLATEX),not found)"
	@if [ -z "$(TECTONIC)$(LATEXMK)$(PDFLATEX)" ]; then \
		echo ""; \
		echo "No LaTeX engine found. Run: make setup"; \
		exit 1; \
	fi

setup:
	@command -v brew >/dev/null || { echo "Homebrew required: https://brew.sh"; exit 1; }
	brew install tectonic
	@echo "Done. Run: make build"

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------

all: build

build: $(PDFS)

laxman: $(LAXMAN_PDF)

sraya: $(SRAYA_PDF)

$(LAXMAN_PDF): $(LAXMAN_SRC) $(ASSETS)
	$(call compile,$(LAXMAN_SRC),$(LAXMAN_PDF),Laxman resume)

$(SRAYA_PDF): $(SRAYA_SRC)
	$(call compile,$(SRAYA_SRC),$(SRAYA_PDF),Sraya resume)

open: $(LAXMAN_PDF)
	@open $(LAXMAN_PDF) 2>/dev/null || xdg-open $(LAXMAN_PDF) 2>/dev/null \
		|| echo "Open $(LAXMAN_PDF) manually"

watch:
	@echo "==> Watching $(LAXMAN_SRC) (Ctrl+C to stop)"
	@while true; do \
		$(MAKE) --no-print-directory -s $(LAXMAN_PDF) || true; \
		sleep 2; \
	done

# -----------------------------------------------------------------------------
# QA
# -----------------------------------------------------------------------------

check: $(PDFS)
	@echo "==> QA checks"
	@if [ -n "$(PYTHON)" ]; then \
		$(PYTHON) scripts/check_pdf.py $(PDFS); \
	else \
		echo "python3 is required for make check"; \
		exit 1; \
	fi
	@echo "==> check OK"

# -----------------------------------------------------------------------------
# Clean
# -----------------------------------------------------------------------------

clean:
	@rm -f $(OUT_DIR)/*.aux $(OUT_DIR)/*.bbl $(OUT_DIR)/*.bcf $(OUT_DIR)/*.blg \
		$(OUT_DIR)/*.fdb_latexmk $(OUT_DIR)/*.fls $(OUT_DIR)/*.log \
		$(OUT_DIR)/*.out $(OUT_DIR)/*.run.xml $(OUT_DIR)/*.synctex.gz \
		$(OUT_DIR)/*.toc $(OUT_DIR)/*.xdv
	@rm -f *~
	@echo "==> cleaned intermediates"

distclean: clean
	@rm -rf $(OUT_DIR)
	@echo "==> removed $(OUT_DIR)/"
