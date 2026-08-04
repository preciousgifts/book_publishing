import logging
import contextvars
import time
import json
import asyncio
from typing import Dict, List

# Context variable to track the current projectId in execution context
project_id_var = contextvars.ContextVar("project_id", default="")

# In-memory store for active SSE clients
# maps projectId -> list of asyncio.Queue
log_subscribers: Dict[str, List[asyncio.Queue]] = {}

# Historical logs store
# maps projectId -> list of log dicts
log_history: Dict[str, List[dict]] = {}

class ProjectLogHandler(logging.Handler):
    """
    A custom logging handler that routes logs to specific projectId queues.
    Supports real-time SSE streaming.
    """
    def emit(self, record):
        try:
            project_id = project_id_var.get()
            if not project_id:
                return

            log_time = time.strftime("%H:%M:%S", time.localtime(record.created))
            msg = record.getMessage()

            # Colorize output for system console/stdout
            color = ""
            if "LLM-ROUTER" in msg or "LLM" in msg:
                color = "\033[94m" # Blue
            elif "WRITER" in msg:
                color = "\033[92m" # Green
            elif "EDITOR" in msg:
                color = "\033[95m" # Magenta
            elif "CRITIQUE" in msg or "AUDIT" in msg:
                color = "\033[93m" # Yellow
            
            # Print styled log to stdout for the server console
            if color:
                print(f"[{log_time}] {color}{msg}\033[0m")
            else:
                print(f"[{log_time}] {msg}")

            # Prepare structured log payload
            log_entry = {
                "timestamp": log_time,
                "level": record.levelname,
                "message": msg
            }

            # Add to project log history
            if project_id not in log_history:
                log_history[project_id] = []
            log_history[project_id].append(log_entry)

            # Broadcast to any active SSE subscribers
            if project_id in log_subscribers:
                for queue in log_subscribers[project_id]:
                    # Put log entry into subscriber queue safely in event loop
                    try:
                        loop = asyncio.get_running_loop()
                        loop.call_soon_threadsafe(queue.put_nowait, log_entry)
                    except Exception:
                        pass
        except Exception:
            self.handleError(record)

def setup_logging():
    """
    Sets up global logging configurations and adds the ProjectLogHandler handler.
    """
    root = logging.getLogger()
    
    # Avoid duplicate handlers
    for h in root.handlers:
        if isinstance(h, ProjectLogHandler):
            return
            
    handler = ProjectLogHandler()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
