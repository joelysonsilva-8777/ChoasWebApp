import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choas | Login",
  description: "Entre na plataforma Choas",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
