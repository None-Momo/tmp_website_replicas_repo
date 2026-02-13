#!/bin/bash
set -e

# Require API key at runtime (injected into config.ini)
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "Error: DEEPSEEK_API_KEY environment variable is required."
  echo "Run the container with: docker run -e DEEPSEEK_API_KEY=your-key ..."
  exit 1
fi

CONFIG_DIR="/app/website_playground_server"
CONFIG_FILE="$CONFIG_DIR/config.ini"
BASE_URL="${DEEPSEEK_BASE_URL:-https://api.deepseek.com}"

# Write config.ini from environment
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_FILE" << EOF
[settings]
environment=py312
deepseek_api=${DEEPSEEK_API_KEY}
deepseek_base_url=${BASE_URL}
EOF
echo "Written config.ini (deepseek_base_url=${BASE_URL})"

# Start backend in background (uvicorn, no reload in container)
cd /app/website_playground_server
python -c "
import uvicorn
uvicorn.run('main:app', host='0.0.0.0', port=8089, log_level='info')
" &
UVICORN_PID=$!

# Brief wait for backend to bind
sleep 2

# Nginx in foreground (serves frontend + proxies /api to backend)
exec nginx -g 'daemon off;'
