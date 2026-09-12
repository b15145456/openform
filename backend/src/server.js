import { createApp } from './app.js';
import { migrate } from './migrate.js';
import { createAuth } from './auth/auth.js';

const port = process.env.PORT || 3000;

migrate()
  .then(() => {
    // Constructed only after migrate() has created the schema — see the
    // comment in migrate.js's bootstrapAdmin() for why ordering matters here.
    const auth = createAuth();
    createApp(auth).listen(port, () => console.log(`openform backend listening on ${port}`));
  })
  .catch((e) => {
    console.error('failed to run migrations', e);
    process.exit(1);
  });
