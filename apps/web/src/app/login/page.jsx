"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        if (!supabase) {
          if (mounted) setCheckingAuth(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          router.replace("/dashboard");
          return;
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    checkUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  const subtitle = useMemo(() => {
    return "Sign in to your Monroy QMS workspace";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        setError("Supabase is not configured. Contact your administrator.");
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed. Check your credentials.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        router.replace("/dashboard");
        return;
      }

      setError("Login failed. Please try again.");
      setLoading(false);
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="login-page loading-screen">
        <div className="loading-ring" />
        <p>Loading workspace...</p>

        <style jsx>{`
          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(circle at top, rgba(91, 240, 255, 0.12), transparent 30%),
              linear-gradient(180deg, #66717f 0%, #4e5864 35%, #2e3640 100%);
            color: #effbff;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .loading-screen {
            flex-direction: column;
            gap: 16px;
          }

          .loading-ring {
            width: 54px;
            height: 54px;
            border-radius: 999px;
            border: 3px solid rgba(146, 255, 255, 0.18);
            border-top-color: #94ffff;
            animation: spin 0.9s linear infinite;
            box-shadow: 0 0 30px rgba(122, 245, 255, 0.25);
          }

          p {
            margin: 0;
            font-size: 14px;
            letter-spacing: 0.04em;
            color: rgba(239, 251, 255, 0.78);
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="login-page">
        <div className="ambient ambient-1" />
        <div className="ambient ambient-2" />
        <div className="ambient ambient-3" />

        <div className="back-screen back-screen-left" />
        <div className="back-screen back-screen-center" />
        <div className="back-screen back-screen-right" />
        <div className="desk" />
        <div className="plant">
          <span className="leaf leaf-1" />
          <span className="leaf leaf-2" />
          <span className="leaf leaf-3" />
          <span className="pot" />
        </div>

        <div className="glass-stage">
          <div className="brand-bar">
            <div className="brand-mark">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="brand-text">MONROY QMS</span>
          </div>

          <div className="login-card">
            <div className="card-glow" />

            <div className="header">
              <h1>Please Log In</h1>
              <p>{subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="field-wrap">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21a8 8 0 0 0-16 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>

                <input
                  type="email"
                  placeholder="Email or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field-wrap">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="10"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error ? <div className="error-message">{error}</div> : null}

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <button
                type="button"
                className="text-link"
                disabled={loading}
                onClick={() => router.push("/forgot-password")}
              >
                Forgot Password?
              </button>

              <div className="signup-row">
                <span>Don&apos;t have an account?</span>
                <button
                  type="button"
                  className="inline-link"
                  disabled={loading}
                  onClick={() => router.push("/signup")}
                >
                  Sign up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #5f6976;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .login-page {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 50% 10%, rgba(170, 246, 255, 0.22), transparent 28%),
            radial-gradient(circle at 0% 100%, rgba(56, 189, 248, 0.14), transparent 35%),
            linear-gradient(180deg, #6a7480 0%, #56606c 32%, #3f4853 65%, #2f3741 100%);
          padding: 24px;
        }

        .ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          pointer-events: none;
        }

        .ambient-1 {
          top: -120px;
          left: -40px;
          width: 340px;
          height: 220px;
          background: rgba(129, 255, 255, 0.12);
        }

        .ambient-2 {
          right: 10%;
          bottom: -80px;
          width: 280px;
          height: 180px;
          background: rgba(74, 222, 255, 0.09);
        }

        .ambient-3 {
          top: 20%;
          right: 18%;
          width: 220px;
          height: 220px;
          background: rgba(255, 255, 255, 0.05);
        }

        .back-screen {
          position: absolute;
          top: 29%;
          width: 240px;
          height: 240px;
          border-radius: 12px;
          background:
            linear-gradient(180deg, rgba(16, 26, 38, 0.92), rgba(7, 14, 22, 0.92)),
            radial-gradient(circle at 50% 50%, rgba(154, 249, 255, 0.08), transparent 45%);
          border: 1px solid rgba(180, 240, 255, 0.12);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 20px 40px rgba(0, 0, 0, 0.24);
          overflow: hidden;
          opacity: 0.78;
        }

        .back-screen::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 20%, rgba(175, 245, 255, 0.1), transparent 24%),
            linear-gradient(180deg, rgba(100, 177, 195, 0.08), transparent 60%);
          mix-blend-mode: screen;
        }

        .back-screen-left {
          left: max(2%, calc(50% - 510px));
        }

        .back-screen-center {
          width: 320px;
          height: 190px;
          top: auto;
          bottom: 102px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0.62;
        }

        .back-screen-right {
          right: max(2%, calc(50% - 510px));
        }

        .desk {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(1100px, 100%);
          height: 98px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.02));
          border-top: 1px solid rgba(255, 255, 255, 0.16);
          filter: blur(0.2px);
        }

        .plant {
          position: absolute;
          right: max(12px, calc(50% - 545px));
          bottom: 78px;
          width: 100px;
          height: 150px;
          pointer-events: none;
        }

        .leaf {
          position: absolute;
          display: block;
          background: linear-gradient(180deg, #7edfa2, #3da56c);
          border-radius: 100% 0;
          transform-origin: bottom center;
          opacity: 0.9;
          filter: blur(0.2px);
        }

        .leaf-1 {
          width: 34px;
          height: 74px;
          left: 28px;
          top: 8px;
          transform: rotate(-14deg);
        }

        .leaf-2 {
          width: 30px;
          height: 66px;
          left: 48px;
          top: 18px;
          transform: rotate(14deg);
        }

        .leaf-3 {
          width: 26px;
          height: 58px;
          left: 16px;
          top: 28px;
          transform: rotate(-28deg);
        }

        .pot {
          position: absolute;
          left: 18px;
          bottom: 0;
          width: 58px;
          height: 54px;
          background: linear-gradient(180deg, #f8fbfd, #d9e4ea);
          border-radius: 10px 10px 16px 16px;
          box-shadow: 0 18px 22px rgba(0, 0, 0, 0.12);
        }

        .glass-stage {
          position: relative;
          width: min(900px, 100%);
          min-height: 560px;
          border-radius: 28px;
          border: 1px solid rgba(174, 252, 255, 0.4);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.04)),
            rgba(255, 255, 255, 0.06);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            0 22px 90px rgba(8, 20, 31, 0.32);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          overflow: hidden;
        }

        .glass-stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 18%),
            radial-gradient(circle at 50% 20%, rgba(175, 247, 255, 0.16), transparent 45%);
          pointer-events: none;
        }

        .glass-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.04), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.04)),
            linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.03) 100%);
          pointer-events: none;
        }

        .brand-bar {
          position: absolute;
          top: 20px;
          left: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 2;
        }

        .brand-mark {
          display: grid;
          grid-template-columns: repeat(3, 4px);
          gap: 3px;
        }

        .brand-mark span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(213, 250, 255, 0.88);
          box-shadow: 0 0 8px rgba(156, 244, 255, 0.45);
        }

        .brand-text {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 0.22em;
          color: rgba(236, 253, 255, 0.92);
          text-shadow: 0 0 10px rgba(156, 244, 255, 0.18);
        }

        .login-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(410px, calc(100% - 32px));
          padding: 34px 30px 22px;
          border-radius: 22px;
          border: 1px solid rgba(169, 251, 255, 0.36);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06)),
            rgba(255, 255, 255, 0.055);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.24),
            0 18px 70px rgba(5, 16, 25, 0.22);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          z-index: 2;
        }

        .card-glow {
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          pointer-events: none;
          box-shadow:
            0 0 0 1px rgba(167, 250, 255, 0.16) inset,
            0 0 30px rgba(116, 243, 255, 0.08);
        }

        .header {
          text-align: center;
          margin-bottom: 22px;
        }

        .header h1 {
          margin: 0;
          color: #f7feff;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-shadow: 0 0 12px rgba(112, 235, 255, 0.18);
        }

        .header p {
          margin: 6px 0 0;
          font-size: 14px;
          color: rgba(238, 251, 255, 0.72);
          line-height: 1.4;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(233, 253, 255, 0.72);
          z-index: 1;
        }

        .input-icon svg {
          width: 18px;
          height: 18px;
        }

        .field-wrap input {
          width: 100%;
          height: 48px;
          padding: 0 16px 0 42px;
          border-radius: 14px;
          border: 1px solid rgba(131, 248, 255, 0.64);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035)),
            rgba(255, 255, 255, 0.035);
          color: #f4feff;
          font-size: 15px;
          outline: none;
          box-shadow:
            inset 0 0 0 1px rgba(161, 251, 255, 0.1),
            0 0 20px rgba(105, 244, 255, 0.12);
          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.25s ease,
            background 0.25s ease;
        }

        .field-wrap input::placeholder {
          color: rgba(232, 251, 255, 0.7);
        }

        .field-wrap input:focus {
          border-color: rgba(144, 255, 255, 0.95);
          box-shadow:
            inset 0 0 0 1px rgba(161, 251, 255, 0.2),
            0 0 0 4px rgba(139, 245, 255, 0.08),
            0 0 26px rgba(105, 244, 255, 0.18);
          transform: translateY(-1px);
        }

        .field-wrap input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          width: 100%;
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 71, 87, 0.12);
          border: 1px solid rgba(255, 111, 124, 0.3);
          color: #ffe2e6;
          font-size: 13px;
          box-shadow: 0 0 14px rgba(255, 71, 87, 0.08);
        }

        .btn-login {
          margin-top: 2px;
          width: 100%;
          height: 50px;
          border: 1px solid rgba(145, 227, 255, 0.62);
          border-radius: 15px;
          background:
            linear-gradient(180deg, rgba(153, 224, 255, 0.42), rgba(90, 177, 255, 0.32)),
            rgba(108, 196, 255, 0.2);
          color: #f9feff;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            0 0 24px rgba(103, 193, 255, 0.22);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            filter 0.25s ease,
            opacity 0.25s ease;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.26),
            0 0 30px rgba(103, 193, 255, 0.34);
          filter: brightness(1.04);
        }

        .btn-login:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .text-link {
          margin-top: 2px;
          background: transparent;
          border: 0;
          color: rgba(241, 252, 255, 0.8);
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }

        .text-link:hover:not(:disabled),
        .inline-link:hover:not(:disabled) {
          color: #ffffff;
          text-shadow: 0 0 12px rgba(126, 243, 255, 0.18);
        }

        .signup-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 2px;
          font-size: 13px;
          color: rgba(241, 252, 255, 0.8);
          flex-wrap: wrap;
        }

        .inline-link {
          background: transparent;
          border: 0;
          color: rgba(241, 252, 255, 0.95);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .text-link:disabled,
        .inline-link:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 920px) {
          .glass-stage {
            min-height: 520px;
          }

          .brand-text {
            font-size: 22px;
          }

          .back-screen-left,
          .back-screen-right {
            width: 180px;
            height: 180px;
            top: 32%;
          }

          .plant {
            transform: scale(0.92);
            transform-origin: bottom right;
          }
        }

        @media (max-width: 640px) {
          .login-page {
            padding: 16px;
          }

          .glass-stage {
            min-height: 100vh;
            width: 100%;
            border-radius: 22px;
          }

          .brand-bar {
            left: 18px;
            top: 16px;
          }

          .brand-text {
            font-size: 17px;
            letter-spacing: 0.16em;
          }

          .login-card {
            width: calc(100% - 24px);
            padding: 28px 18px 20px;
          }

          .header h1 {
            font-size: 28px;
          }

          .header p {
            font-size: 13px;
          }

          .back-screen-left,
          .back-screen-right,
          .back-screen-center,
          .plant {
            display: none;
          }

          .glass-stage {
            min-height: calc(100vh - 32px);
          }
        }
      `}</style>
    </>
  );
}
