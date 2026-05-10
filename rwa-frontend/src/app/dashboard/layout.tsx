"use client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">


      {/* Main */}
      <div className="main">


        {/* Content */}
        <div className="content">
          {children}
        </div>

      </div>
    </div>
  );
}