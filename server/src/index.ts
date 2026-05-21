import { createApp } from './app';

const port = Number(process.env.PORT) || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`Board Game Score Tracker API listening on http://localhost:${port}`);
});
