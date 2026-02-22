.PHONY: dev

dev:
	@echo "Checking for existing processes on port 32128..."
	@lsof -ti:32128 | xargs kill -9 2>/dev/null || echo "No process found on port 32128"
	pnpm dev --port 32128
