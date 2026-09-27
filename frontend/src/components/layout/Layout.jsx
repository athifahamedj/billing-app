import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-6 print:block print:h-auto print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;