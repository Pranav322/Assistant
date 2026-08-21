from trafilatura import extract


def extract_html_main_content(html: str) -> str:
    """Return a page's main textual content, sans nav/footer/ads.

    Returns empty string when nothing usable is found so the caller can
    fall back to a whole-document conversion.
    """
    if not html or not html.strip():
        return ""
    text = extract(
        html,
        include_comments=False,
        include_tables=True,
        with_metadata=False,
        favor_precision=True,
    )
    if text is None:
        return ""
    return text.strip()
