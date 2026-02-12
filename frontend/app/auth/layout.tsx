export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Orizn RAG
          </p>
          <h1 className="heading text-3xl">Welcome back</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
