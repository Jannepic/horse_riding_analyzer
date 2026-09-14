/** Sign-in page; the form lives in its own component because it reads search params. */

import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <Nav />
          <main className="p-8 text-sm text-muted">lädt…</main>
        </>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
