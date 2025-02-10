const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // Enable tunneling
  isCSSEnabled: true,
});

// Configure terminal output
config.terminal = {
  ...config.terminal,
  width: 50, // Reduce width for smaller QR
  height: 30 // Reduce height for smaller QR
};

config.resolver.sourceExts = [...config.resolver.sourceExts, 'css', 'mjs'];

// Enable tunneling for remote access
config.server = {
  ...config.server,
  port: process.env.PORT || 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;