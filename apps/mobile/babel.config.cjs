const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-inline-environment-variables',
      {
        include: [
          'API_BASE_URL',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY',
          'VITE_API_BASE_URL',
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_ANON_KEY',
        ],
      },
    ],
  ],
};
