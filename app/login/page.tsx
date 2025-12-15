import { LoginPageClient } from './LoginPageClient';

// ==========================================
// MAIN LOGIN PAGE (Server Component)
// ==========================================
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginPageClient
      errorParam={params.error}
      callbackUrlParam={params.callbackUrl}
    />
  );
}
