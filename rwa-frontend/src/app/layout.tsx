import Navbar from "@/src/components/Navbar";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";
export const metadata = {
  title: "RWA Platform",
  description: "Real World Asset Tokenization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Web3Provider>
          <>
            <Navbar />
            {children}
          </>
        </Web3Provider>
      </body>
    </html>
  );
}