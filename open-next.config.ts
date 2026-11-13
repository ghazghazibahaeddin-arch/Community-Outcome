import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig();
config.buildCommand = 'NODE_ENV=production npx next build';

export default config;
