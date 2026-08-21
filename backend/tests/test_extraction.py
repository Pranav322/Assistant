from app.services.extraction import extract_html_main_content


def test_extracts_main_content_strips_nav_and_footer():
    html = (
        "<html><body><nav>Menu link one Menu link two</nav>"
        "<article><h1>Title</h1><p>The actual useful content here.</p></article>"
        "<footer>&copy; All rights reserved</footer></body></html>"
    )
    result = extract_html_main_content(html)
    assert "actual useful content" in result
    assert "Menu link one" not in result


def test_returns_empty_string_when_nothing_extractable():
    html = "<html><body><script>var x=1;</script></body></html>"
    assert extract_html_main_content(html) == ""


def test_keeps_tables():
    html = (
        "<html><body><article><table><tr><td>a</td><td>b</td></tr>"
        "</table></article></body></html>"
    )
    result = extract_html_main_content(html)
    assert "a" in result and "b" in result
