import { createApp } from './app';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST ?? '0.0.0.0';
const app = createApp();

// Bind to 0.0.0.0 (not the default ::, which some container proxies won't
// reach) so Fly's edge proxy and iPhone-on-same-Wi-Fi both work.
app.listen(port, host, () => {
  console.log(`Board Game Score Tracker API listening on http://${host}:${port}`);
});
