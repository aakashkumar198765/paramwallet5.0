interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <span className="text-4xl">⬡</span>
          <h1 className="mt-2 text-2xl font-bold">Param Wallet Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Param 5.0 Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
