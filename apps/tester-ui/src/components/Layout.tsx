import { SettingsPanel } from "@/components/SettingsPanel";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="font-bold text-2xl">CommonForms Tester</h1>
          <p className="text-muted-foreground text-sm">
            PDF Form Field Detection Testing UI
          </p>
        </div>
        <SettingsPanel />
      </div>
    </header>
  );
}

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
