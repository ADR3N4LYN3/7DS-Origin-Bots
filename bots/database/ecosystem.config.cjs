module.exports = {
  apps: [
    {
      name: "7ds-database",
      script: "dist/index.js",
      cwd: __dirname,
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
