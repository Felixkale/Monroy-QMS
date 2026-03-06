import { AuthProvider } from "@/components/AuthContext";
import "./globals.css";

export const metadata = {
  title: "Monroy QMS",
  description: "Quality Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
