import { createDemoSession } from '@/profile/runtime';
import { checkOrigin, respond } from '@/profile/http';
export async function POST(request: Request) {
  let token = '';
  const response = await respond(async () => {
    checkOrigin(request);
    token = createDemoSession();
    return { synthetic: true };
  });
  if (token)
    response.headers.set(
      'Set-Cookie',
      `profile_demo=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`,
    );
  return response;
}
