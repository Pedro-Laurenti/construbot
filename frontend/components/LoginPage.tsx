"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import {
  RiLockPasswordLine,
  RiUserLine,
  RiEyeLine,
  RiEyeOffLine,
  RiBuilding4Line,
  RiToolsLine,
  RiFileList3Line,
} from "react-icons/ri";

interface LoginPageProps {
  onLogin: () => void;
}

const FEATURES = [
  {
    icon: <RiBuilding4Line size={20} />,
    title: "Cotações de Obras",
    desc: "Receba estimativas detalhadas para sua construção.",
  },
  {
    icon: <RiToolsLine size={20} />,
    title: "Assistente Inteligente",
    desc: "Um bot guia você passo a passo no processo.",
  },
  {
    icon: <RiFileList3Line size={20} />,
    title: "Engenheiros Especializados",
    desc: "Suporte humano quando você precisar.",
  },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [tab, setTab] = useState<"credentials" | "google">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  }

  function handleGoogleLogin() {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  }

  return (
    <div className="min-h-screen flex bg-base-200">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-primary px-12 py-14 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="avatar placeholder">
              <div className="w-10 rounded-xl bg-primary-content/20 text-primary-content flex items-center justify-center">
                <RiBuilding4Line size={22} />
              </div>
            </div>
            <span className="text-primary-content text-xl font-bold tracking-tight">ConstruBot</span>
          </div>

          <h1 className="text-primary-content text-4xl font-bold leading-tight mb-4">
            Sua obra começa com uma boa cotação.
          </h1>
          <p className="text-primary-content/80 text-base leading-relaxed">
            Responda algumas perguntas e receba uma estimativa personalizada para o seu projeto de construção civil.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="avatar placeholder flex-shrink-0">
                <div className="w-10 rounded-xl bg-primary-content/20 text-primary-content">
                  {f.icon}
                </div>
              </div>
              <div>
                <p className="text-primary-content font-semibold text-sm">{f.title}</p>
                <p className="text-primary-content/70 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-primary-content/50 text-xs">© 2026 ConstruBot · Plataforma demonstrativa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="card bg-base-100 shadow-xl w-full max-w-sm">
          <div className="card-body gap-5">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 justify-center">
              <div className="avatar placeholder">
                <div className="w-10 rounded-xl bg-primary text-primary-content">
                  <RiBuilding4Line size={20} />
                </div>
              </div>
              <span className="text-base-content text-xl font-bold">ConstruBot</span>
            </div>

            <div>
              <h2 className="card-title text-2xl">Bem-vindo de volta</h2>
              <p className="text-base-content/60 text-sm">
                Acesse sua conta para gerenciar suas cotações.
              </p>
            </div>

            {/* Auth tabs */}
            <div role="tablist" className="tabs tabs-boxed">
              <button
                role="tab"
                onClick={() => { setTab("credentials"); setError(""); }}
                className={`tab flex-1 ${tab === "credentials" ? "tab-active" : ""}`}
              >
                E-mail e senha
              </button>
              <button
                role="tab"
                onClick={() => { setTab("google"); setError(""); }}
                className={`tab flex-1 ${tab === "google" ? "tab-active" : ""}`}
              >
                Google
              </button>
            </div>

            {tab === "credentials" ? (
              <form onSubmit={handleCredentialLogin} className="flex flex-col gap-4">
                <fieldset className="fieldset gap-1">
                  <legend className="fieldset-legend text-sm">E-mail ou usuário</legend>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="seu@email.com"
                    autoComplete="username"
                    className={`input w-full ${error && !username ? "input-error" : ""}`}
                  />
                </fieldset>

                <fieldset className="fieldset gap-1">
                  <legend className="fieldset-legend text-sm">
                    <span>Senha</span>
                    <button type="button" className="link link-primary text-xs ml-auto">
                      Esqueci a senha
                    </button>
                  </legend>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`input w-full pr-10 ${error && !password ? "input-error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70"
                      tabIndex={-1}
                    >
                      {showPassword ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                    </button>
                  </div>
                </fieldset>

                {error && (
                  <div className="alert alert-error py-2">
                    <span className="text-xs">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? <span className="loading loading-spinner loading-sm" /> : "Entrar"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-base-content/60 text-sm text-center leading-relaxed">
                  Use sua conta Google para acessar a plataforma de forma rápida e segura.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="btn btn-outline w-full"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <FcGoogle size={20} />
                      Continuar com Google
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="divider my-0" />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" defaultChecked className="checkbox checkbox-primary checkbox-xs" />
                <span className="text-base-content/50 text-xs">Manter conectado</span>
              </label>
              <span className="text-base-content/30 text-xs">v0.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
