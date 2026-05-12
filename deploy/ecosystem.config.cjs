// PM2 process config — two long-lived processes per deploy.
// Scripts point at the real JS entrypoints (not .bin/ shell wrappers) so
// PM2's default Node interpreter can run them.
module.exports = {
  apps: [
    {
      name: "gca-worker",
      cwd: "/opt/get-covered-assessment/repo",
      script: "apps/worker/node_modules/tsx/dist/cli.mjs",
      args: "--env-file=/opt/get-covered-assessment/repo/.env apps/worker/index.ts",
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/gca/worker-error.log",
      out_file: "/var/log/gca/worker-out.log",
      merge_logs: true,
      max_memory_restart: "1G",
    },
    {
      name: "gca-web",
      cwd: "/opt/get-covered-assessment/repo/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      env: { NODE_ENV: "production", PORT: "3002" },
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/gca/web-error.log",
      out_file: "/var/log/gca/web-out.log",
      merge_logs: true,
    },
  ],
};
