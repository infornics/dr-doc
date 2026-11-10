import { Header } from "@/components/layout";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
