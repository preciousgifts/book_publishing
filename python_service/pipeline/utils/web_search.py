from duckduckgo_search import DDGS
import logging

logger = logging.getLogger(__name__)

def search_duckduckgo(query: str, max_results: int = 3) -> list:
    """
    Queries DuckDuckGo search API and returns a list of results.
    Each result is a dictionary: {"title": ..., "href": ..., "body": ...}
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return results
    except Exception as e:
        logger.error(f"DuckDuckGo search error for query '{query}': {e}")
        return []
