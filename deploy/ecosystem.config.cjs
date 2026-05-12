// PM2 process config — two long-lived processes per deploy
module.exports = {
  apps: [
    {
      name: "gca-worker",
      cwd: "/opt/get-covered-assessment/repo/apps/worker",
      script: "../../node_modules/.bin/tsx",
      args: "--env-file=/opt/get-covered-assessment/repo/.env index.ts",
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
      script: "node_modules/.bin/next",
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
