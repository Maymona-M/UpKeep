import "./globals.css";

export const metadata = {
  title: "UpKeep — household obligations tracker",
  description:
    "Track the household deadlines that are easy to forget: renewals, bills, and maintenance. Reminders before it's too late.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
