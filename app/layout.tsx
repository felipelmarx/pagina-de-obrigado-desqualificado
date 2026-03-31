import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parabéns! Próximo Passo - Desafio de Breathwork",
  description: "Seu acesso ao Desafio de 5 Dias de Breathwork está ativo!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
