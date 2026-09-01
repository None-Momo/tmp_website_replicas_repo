#!/bin/bash
set -e

# OPENAI_API_KEY is optional (injected into config.ini when present). Without
# it the app starts in LLM-disabled mode: the static study sites and MORPH
# telemetry work normally and the LLM endpoints return 503.
# DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL are deprecated aliases kept so old
# deployments keep starting; OPENAI_* names are the primary configuration.
if [ -z "$OPENAI_API_KEY" ] && [ -n "$DEEPSEEK_API_KEY" ]; then
  echo "Warning: DEEPSEEK_API_KEY is deprecated; set OPENAI_API_KEY instead."
  OPENAI_API_KEY="$DEEPSEEK_API_KEY"
fi
if [ -z "$OPENAI_API_KEY" ]; then
  echo "No OPENAI_API_KEY set: starting in LLM-disabled mode (static sites and telemetry only)."
fi

CONFIG_DIR="/app/website_playground_server"
CONFIG_FILE="$CONFIG_DIR/config.ini"
BASE_URL="${OPENAI_BASE_URL:-${DEEPSEEK_BASE_URL:-https://api.openai.com/v1}}"
MODEL="${OPENAI_MODEL:-gpt-4o-mini}"

# Write config.ini from environment
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_FILE" << EOF
[settings]
environment=py312
openai_api=${OPENAI_API_KEY}
openai_base_url=${BASE_URL}
model=${MODEL}
EOF
echo "Written config.ini (openai_base_url=${BASE_URL}, model=${MODEL})"

# Nginx listen port: cloud-provided PORT, defaulting to 3000 for local Docker
PORT="${PORT:-3000}"
sed -i "s/3000 default_server;/${PORT} default_server;/g" /etc/nginx/sites-available/default
echo "nginx will listen on port ${PORT}"

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
