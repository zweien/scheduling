const appDir = process.env.VPS_APP_DIR || '/opt/scheduling';

module.exports = {
  apps: [
    {
      name: 'scheduling',
      cwd: appDir,
      script: '/bin/bash',
      args: [
        '-lc',
        'set -a && source ./.env.production && set +a && npm run start -- --hostname 127.0.0.1 --port "${S_PORT:-3018}"',
      ],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        S_PORT: '3018',
      },
      env_production: {
        NODE_ENV: 'production',
        S_PORT: '3018',
      },
      error_file: `${appDir}/logs/pm2-error.log`,
      out_file: `${appDir}/logs/pm2-out.log`,
      time: true,
    },
  ],
};
