export const metadata = {
  title: "Monroy QMS",
  description: "Enterprise Quality Management System"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <b>Monroy QMS</b>
          <span style={{ marginLeft: 12 }}>
            <a href="/dashboard">Dashboard</a>{" | "}
            <a href="/assets">Assets</a>{" | "}
            <a href="/inspections">Inspections</a>{" | "}
            <a href="/ncr">NCR</a>{" | "}
            <a href="/login">Login</a>
          </span>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
