from wiki_dump_extractor import date_utils, page_utils
import zlib
import json


def find_dates_in_pages(pages_and_index):
    def extract_and_compress_dates(text):
        text = page_utils.remove_appendix_sections(text)
        text = page_utils.remove_comments_and_citations(text)
        dates, _errors = date_utils.extract_dates(text)
        json_data = json.dumps([d.to_dict() for d in dates])
        return zlib.compress(json_data.encode())

    pages, _ = pages_and_index
    return {pg.title: extract_and_compress_dates(pg.text) for pg in pages}


def find_links_in_pages(index_and_pages):
    pages, index = index_and_pages

    def extract_and_compress_links(text):
        links = page_utils.extract_links(text)
        json_data = json.dumps(links).encode()
        return zlib.compress(json_data)

    return [(pg.title.encode(), extract_and_compress_links(pg.text)) for pg in pages]


def parse_infoboxes(batch_and_index):
    pages, index = batch_and_index

    def process_page(page):
        data, _ = page_utils.parse_infobox(page.text)
        if not data:
            return None
        json_data = json.dumps(data)
        return zlib.compress(json_data.encode())

    records = [
        (page.title.encode(), data)
        for page in pages
        if not page.redirect_title and page.text
        if (data := process_page(page)) is not None
    ]
    return records
