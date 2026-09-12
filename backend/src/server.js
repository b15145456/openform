import { createApp } from './app.js';
import { migrate } from './migrate.js';

const port = process.env.PORT || 3000;

migrate()
  .then(() => {
    createApp().listen(port, () => console.log(`openform backend listening on ${port}`));
  })
  .catch((e) => {
    console.error('failed to run migrations', e);
    process.exit(1);
  });
