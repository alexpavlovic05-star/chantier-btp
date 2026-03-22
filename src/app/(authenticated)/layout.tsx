import Sidebar from "@/components/sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Main content */}
      <main className="md:ml-[250px]">
        {/* Spacer for mobile header */}
        <div className="h-14 md:hidden" />
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
