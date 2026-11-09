import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Six Shifts · Junior Astronaut Mission Trainer",
  description:
    "Explore a lunar outpost in first person with WASD. Manage ten survival days, food, water, oxygen, power and solar-weather risk with MICA. For ages 7–12.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
