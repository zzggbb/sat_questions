# $< first prerequesite
# $@ target

SCRAPE_FILES := $(wildcard scrapes/*.json)
HTML_FILES := $(SCRAPE_FILES:scrapes/%.json=html/%.html)

.PHONY: all clean

all: $(HTML_FILES)

clean:
	rm -f html/*.html

html/%.html: scrapes/%.json
	@python3 generate_html.py $< > $@ 2>/dev/null
	@echo "generated $< -> $@"
