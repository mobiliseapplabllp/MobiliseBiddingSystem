export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="bg-bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">eS</span>
          </div>
          <span className="font-semibold text-text-primary">eSourcing</span>
          <span className="text-text-muted text-sm ms-2">Supplier Portal</span>
        </div>
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
