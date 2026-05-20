module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-inline-environment-variables',
      {
        include: ['API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
      }
    ]
  ]
};
