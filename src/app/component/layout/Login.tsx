import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  SpinnerGap,
} from "@phosphor-icons/react";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

type AuthState = "idle" | "loading" | "error";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateForm(data: LoginFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.email.trim()) {
    errors.email = "Vui lòng nhập email";
  } else if (!validateEmail(data.email)) {
    errors.email = "Email không hợp lệ";
  }

  if (!data.password) {
    errors.password = "Vui lòng nhập mật khẩu";
  } else if (data.password.length < 6) {
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
  }

  return errors;
}

export function Login(): ReactElement {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (
    field: keyof LoginFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setAuthState("loading");
    setErrors({});

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful login - in production, this would call your auth API
      // For demo: accept any valid email format with password "demo123"
      if (
        formData.email === "demo@sentinel.io" &&
        formData.password === "demo123"
      ) {
        if (formData.rememberMe) {
          localStorage.setItem("sentinel_remember", formData.email);
        }
        setAuthState("idle");
        navigate("/");
      } else {
        setAuthState("error");
        setErrors({
          general:
            "Email hoặc mật khẩu không chính xác. Thử demo@sentinel.io / demo123",
        });
      }
    } catch {
      setAuthState("error");
      setErrors({ general: "Đã xảy ra lỗi. Vui lòng thử lại." });
    }
  };

  const isLoading = authState === "loading";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      {/* Background gradient overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.08), transparent)",
        }}
      />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-[400px]"
        style={{
          animation: "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Card container */}
        <div className="panel overflow-hidden p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            {/* Logo */}
            <div className="mb-5 inline-flex">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))",
                  boxShadow:
                    "0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                <ShieldCheck
                  size={28}
                  weight="duotone"
                  className="text-emerald-400"
                />
              </div>
            </div>

            <h1
              className="mb-1.5 text-xl font-semibold tracking-tight text-zinc-100"
              style={{ lineHeight: 1.2 }}
            >
              Sentinel Fleet
            </h1>
            <p className="text-[12px] text-zinc-500">Operations Console</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* General error */}
            {errors.general && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3"
                style={{ animation: "shakeIn 0.4s ease" }}
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/20">
                  <span className="text-[8px] font-bold text-rose-400">!</span>
                </div>
                <p className="text-[12px] leading-relaxed text-rose-300">
                  {errors.general}
                </p>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400"
              >
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Envelope
                    size={16}
                    weight="regular"
                    className="text-zinc-500"
                  />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={isLoading}
                  placeholder="nguoi.dung@doanh-nghiep.vn"
                  autoComplete="email"
                  className={[
                    "block w-full rounded-lg border bg-surface-2/60 py-2.5 pl-10 pr-4 text-[13px] text-zinc-100",
                    "placeholder:text-zinc-600",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50",
                    errors.email
                      ? "border-rose-500/50"
                      : "border-hairline hover:border-zinc-600",
                    isLoading ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                  style={{ lineHeight: 1.4 }}
                />
              </div>
              {errors.email && (
                <p
                  className="text-[11px] text-rose-400"
                  style={{ animation: "fadeIn 0.2s ease" }}
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock size={16} weight="regular" className="text-zinc-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  disabled={isLoading}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className={[
                    "block w-full rounded-lg border bg-surface-2/60 py-2.5 pl-10 pr-12 text-[13px] text-zinc-100",
                    "placeholder:text-zinc-600",
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50",
                    errors.password
                      ? "border-rose-500/50"
                      : "border-hairline hover:border-zinc-600",
                    isLoading ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                  style={{ lineHeight: 1.4 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 transition-colors hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlash size={16} weight="regular" />
                  ) : (
                    <Eye size={16} weight="regular" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  className="text-[11px] text-rose-400"
                  style={{ animation: "fadeIn 0.2s ease" }}
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    handleInputChange("rememberMe", e.target.checked)
                  }
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-hairline bg-surface-2/60 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0"
                />
                <span className="text-[12px] text-zinc-400">
                  Ghi nhớ đăng nhập
                </span>
              </label>
              <button
                type="button"
                className="text-[12px] text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={[
                "relative w-full rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-surface",
                isLoading
                  ? "cursor-not-allowed bg-emerald-500/80"
                  : "bg-emerald-500 text-zinc-900 hover:bg-emerald-400 active:scale-[0.98]",
              ].join(" ")}
              style={{ lineHeight: 1.4 }}
            >
              <span
                className={`flex items-center justify-center gap-2 ${isLoading ? "opacity-0" : ""}`}
              >
                Đăng nhập
              </span>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <SpinnerGap
                    size={18}
                    className="animate-spin text-zinc-900"
                  />
                </span>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 rounded-lg border border-hairline bg-surface-2/30 p-3">
            <p className="text-[10px] text-center text-zinc-500">
              Demo:{" "}
              <span className="font-mono text-zinc-400">demo@sentinel.io</span>{" "}
              / <span className="font-mono text-zinc-400">demo123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-zinc-600">
          Sentinel Fleet v2.4.1 - Bảo mật bởi Sentinel Systems
        </p>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shakeIn {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
