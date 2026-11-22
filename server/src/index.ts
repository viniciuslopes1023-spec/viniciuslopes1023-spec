import { config } from './config';
import { createApp } from './app';
import { startScanner } from './services/scanner';

const app = createApp();
startScanner();

app.listen(config.port, () => {
  console.log(`GRINGA server listening on http://localhost:${config.port}`);
});
