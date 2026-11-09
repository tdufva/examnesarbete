"""Check the three content pages, navigation and evidence-preserving crosslinks."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parents[1]/'docs'
EXPECTED=[('./','Analys 2024–2026'),('newsroom.html','Newsroom'),('historik.html','Extra Aalto/Lappland 2007–2026')]
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.nav=False;self.links=[];self.ids=[];self.assets=[];self.active=[];self.current=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='nav' and a.get('aria-label')=='Huvudnavigation':self.nav=True
        if tag=='a' and self.nav:
            self.current=[a.get('href'),'']
            if a.get('aria-current')=='page':self.active.append(a['href'])
        for key in ['href','src']:
            if a.get(key):self.assets.append(a[key])
    def handle_data(self,text):
        if self.current is not None:self.current[1]+=text
    def handle_endtag(self,tag):
        if tag=='a' and self.current is not None:self.links.append(tuple(self.current));self.current=None
        if tag=='nav':self.nav=False

for name,active in [('index.html','./'),('newsroom.html','newsroom.html'),('historik.html','historik.html')]:
    text=(ROOT/name).read_text();p=Page();p.feed(text)
    assert p.links==EXPECTED,(name,p.links)
    assert p.active==[active],(name,p.active)
    assert len(p.ids)==len(set(p.ids)),name
    assert 'Till katalogen' not in text and 'href="analys.html"' not in text,name
    for target in p.assets:
        url=urlsplit(target)
        if url.scheme or url.netloc:continue
        path=(ROOT/unquote(url.path)) if url.path else ROOT/name
        if path.is_dir():path=path/'index.html'
        assert path.exists(),(name,target)
        if url.fragment:
            linked=Page();linked.feed(path.read_text());assert unquote(url.fragment) in linked.ids,(name,target)
legacy=(ROOT/'analys.html').read_text()
assert 'location.replace' in legacy and 'http-equiv="refresh"' in legacy
assert 'assets/comparison.js' in (ROOT/'index.html').read_text()
assert 'assets/insights.js' in (ROOT/'newsroom.html').read_text()
assert 'assets/history.js' in (ROOT/'historik.html').read_text()
print('Structure validated: three content pages, identical three-link menus, active pages, internal anchors and legacy redirect.')
