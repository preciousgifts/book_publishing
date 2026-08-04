import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "127.0.0.1")

# KDP Trim Specs (all dimensions in inches)
# Default margins are set with gutter allowance (inside margin larger than outside)
KDP_TRIM_SPECS = {
    "6x9": {
        "width": 6.0,
        "height": 9.0,
        "margins": {
            "top": 0.75,
            "bottom": 0.75,
            "inside": 0.875,  # 0.75 + 0.125 gutter
            "outside": 0.5
        }
    },
    "5.5x8.5": {
        "width": 5.5,
        "height": 8.5,
        "margins": {
            "top": 0.75,
            "bottom": 0.75,
            "inside": 0.875,
            "outside": 0.5
        }
    },
    "5x8": {
        "width": 5.0,
        "height": 8.0,
        "margins": {
            "top": 0.75,
            "bottom": 0.75,
            "inside": 0.75,
            "outside": 0.5
        }
    }
}

def get_trim_spec(trim_size: str) -> dict:
    """
    Returns KDP trim specs for the given size. Falls back to 6x9 if size is not found.
    """
    return KDP_TRIM_SPECS.get(trim_size, KDP_TRIM_SPECS["6x9"])
