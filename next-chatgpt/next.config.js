/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  reactStrictMode: true,
  env: {
    WEBSOCKET_HOST: process.env.WEBSOCKET_HOST || "localhost",
    WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || "8080",
    API_BASE_URL: process.env.API_BASE_URL || "http://localhost:3000",
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };

    return config;
  },
};

module.exports = nextConfig;
