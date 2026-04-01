module.exports = {
  apps: [
    {
      name: "7ds-codes",
      cwd: "./bots/codes-promo",
      script: "dist/index.js",
      node_args: "--env-file=.env",
    },
    {
      name: "7ds-changelog",
      cwd: "./bots/changelog",
      script: "dist/index.js",
      node_args: "--env-file=.env",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "7ds-general",
      cwd: "./bots/general",
      script: "dist/index.js",
      node_args: "--env-file=.env",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "7ds-database",
      cwd: "./bots/database",
      script: "dist/index.js",
      node_args: "--env-file=.env",
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
