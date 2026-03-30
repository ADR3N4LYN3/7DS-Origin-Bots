module.exports = {
  apps: [
    {
      name: "7ds-codes",
      cwd: "./bots/codes-promo",
      script: "dist/index.js",
      node_args: "--env-file=.env",
    },
  ],
};
