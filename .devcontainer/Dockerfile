FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Install additional tools
RUN apt-get update && apt-get install -y \
    jq \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright dependencies for all browsers
# This installs system dependencies needed by Playwright browsers
RUN npx playwright install-deps

# Install Playwright browsers
# On ARM64 (Apple Silicon), Chromium may have issues - Firefox and WebKit work better
# We install all browsers and let the config choose which to use
RUN npx playwright install firefox webkit
# Try to install Chromium, but don't fail if it doesn't work on ARM64
RUN npx playwright install chromium || echo "Chromium install failed (may be ARM64 issue) - using Firefox/WebKit instead"

# Install Claude Code CLI (if available)
RUN npm install -g @anthropic-ai/claude-code || echo "Claude Code CLI not available"

# Install Codex CLI (if available)
RUN npm install -g @openai/codex || echo "Codex CLI not available"

# Create scripts directory
RUN mkdir -p /usr/local/bin/ai-tools
