module.exports = {
  apps: [
    {
      name: '2100-api',
      cwd: __dirname,
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
    {
      name: '2100-web',
      cwd: `${__dirname}/frontend`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3001',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
