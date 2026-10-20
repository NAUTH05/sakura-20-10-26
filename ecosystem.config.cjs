const path = require('node:path')

const ROOT = __dirname

/**
 * PM2 process definition for the production VPS.
 *
 * The app is served by `server/index.js` (static dist/ + /api), never by the
 * Vite dev server. Secrets are read from `.env` by the server itself; values
 * declared here are safe defaults and win over `.env` when both are present.
 */
module.exports = {
  apps: [
    {
      name: 'sakura-city',
      cwd: ROOT,
      script: 'server/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      kill_timeout: 5000,
      out_file: path.join(ROOT, 'logs', 'sakura-out.log'),
      error_file: path.join(ROOT, 'logs', 'sakura-error.log'),
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
