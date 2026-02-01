import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GlassCard } from "../components/common/GlassCard";
import { useAppStore } from "../store/useAppStore";

interface LoginPageProps {
  auth: { login: () => void };
}

export function LoginPage({ auth }: LoginPageProps) {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin === (settings?.pin ?? "1234")) {
      auth.login();
      navigate("/app/dashboard");
    } else {
      setError("Invalid pin. Try 1234 for the demo.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <GlassCard className="w-full max-w-md p-8">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Confectioner Cabinet
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your admin pin to unlock your order room.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
          {error ? (
            <p className="text-xs text-rose-500">{error}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Unlock workspace
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
