import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? sp.next : "/dashboard";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-teal)" }}
          >
            <span className="font-display font-bold text-xl" style={{ color: "var(--color-cream)" }}>
              U
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">UpKeep</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-mint)" }}>
            Sign in to manage your household's deadlines.
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
