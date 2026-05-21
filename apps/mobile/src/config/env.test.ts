import { isLocalhostUrl, validateMobileConfig } from './env';

describe('mobile env validation', () => {
  it('lists the required public mobile variables when missing', () => {
    const issues = validateMobileConfig({
      API_BASE_URL: '',
      IS_PRODUCTION: true,
      SUPABASE_ANON_KEY: '',
      SUPABASE_URL: '',
    });

    expect(issues.map((issue) => issue.name)).toEqual([
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'API_BASE_URL',
    ]);
  });

  it('rejects localhost API URLs for production builds', () => {
    expect(isLocalhostUrl('http://localhost:3000/api')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:3000/api')).toBe(true);
    expect(isLocalhostUrl('http://10.0.2.2:3000/api')).toBe(true);

    const issues = validateMobileConfig({
      API_BASE_URL: 'http://localhost:3000/api',
      IS_PRODUCTION: true,
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_URL: 'https://project.supabase.co',
    });

    expect(issues.some((issue) => issue.name === 'API_BASE_URL')).toBe(true);
  });
});
