// Compatibility for cached versions of the former comparison page.
const target=new URL('../',import.meta.url);
target.search=location.search;
target.hash=location.hash;
location.replace(target.href);
