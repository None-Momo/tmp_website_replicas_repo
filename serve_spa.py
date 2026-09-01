from __future__ import annotations

import http.server
import os
import socketserver
from pathlib import Path


ROOT = Path(__file__).resolve().parent / "websites_playground" / "build"
PORT = int(os.environ.get("FAKE_WEBSITE_PORT", "3001"))


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        translated_path = Path(self.translate_path(self.path))
        is_asset_path = self.path.startswith(("/static/", "/scraped_data/", "/photos/"))
        if not translated_path.exists() and not is_asset_path:
            self.path = "/index.html"
        return super().send_head()


if __name__ == "__main__":
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), SpaHandler) as httpd:
        print(f"Fake websites serving at http://127.0.0.1:{PORT}", flush=True)
        httpd.serve_forever()
