import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock global fetch
global.fetch = jest.fn();

describe('BGG API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should include Authorization header when BGG_BEARER_TOKEN is set', async () => {
    process.env.BGG_BEARER_TOKEN = 'test-token';
    // We mock NextRequest by creating a minimal object that satisfies the code's needs
    // constructing a real NextRequest might require more polyfills in this environment
    const request = new NextRequest('http://localhost:3000/api/bgg?username=testuser');

    // Mock successful response to avoid retries/errors
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<items></items>'),
    });

    await GET(request);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('boardgamegeek.com/xmlapi2/collection'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should not include Authorization header when BGG_BEARER_TOKEN is not set', async () => {
    delete process.env.BGG_BEARER_TOKEN;
    const request = new NextRequest('http://localhost:3000/api/bgg?username=testuser');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<items></items>'),
    });

    await GET(request);

    // Get the headers from the first call
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const options = callArgs[1];

    // Check that Authorization is not in headers
    expect(options.headers).not.toHaveProperty('Authorization');
  });
});
