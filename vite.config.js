import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dashboardAggregator } from './server_aggregator.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dashboard-aggregator',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/dashboard-summary') {
            try {
              const data = await dashboardAggregator();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {}
  },
})
