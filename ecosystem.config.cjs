module.exports = {
  apps: [
    {
      name: "lac-lac-be-yeu",
      cwd: __dirname + "/server",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
