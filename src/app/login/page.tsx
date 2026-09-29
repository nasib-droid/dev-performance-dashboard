import Image from "next/image";
import { login } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--sand-10)" }}>
      <form
        action={login}
        className="card w-full max-w-sm"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <Image src="/logo.svg" alt="Hotsourced" width={36} height={36} className="mb-4" />
        <h1 className="page-title-main mb-1">Dev Performance</h1>
        <p className="breadcrumb mb-6">Sign in to view the dashboard</p>

        <div className="input-group mb-5">
          <label className="input-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            className={`input ${error ? "input-error" : ""}`}
          />
          {error && <span className="input-error-msg">Incorrect password.</span>}
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Log in
        </button>
      </form>
    </div>
  );
}
