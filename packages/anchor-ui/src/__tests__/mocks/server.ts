import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with all handlers
export const server = setupServer(...handlers);

// Export helpers for test files
export const startServer = () => {
  server.listen({ onUnhandledRequest: 'error' });
};

export const stopServer = () => {
  server.close();
};

export const resetHandlers = () => {
  server.resetHandlers();
};
