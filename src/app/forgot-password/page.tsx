"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { forgotPassword, resetPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await forgotPassword(email);

    if (result.success) {
      setMessage("Check your email for reset instructions (demo: token shown in console)");
      // For demo purposes, we'll auto-fill the token
      if (result.token) {
        setToken(result.token);
        setStep("reset");
      }
    } else {
      setError(result.error || "Failed to send reset email");
    }

    setIsLoading(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    const result = await resetPassword(token, newPassword);

    if (result.success) {
      setStep("success");
    } else {
      setError(result.error || "Failed to reset password");
    }

    setIsLoading(false);
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password reset successful!</h2>
          <p className="text-gray-600 mb-6">Your password has been reset successfully.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-amazon-dark bg-amazon-orange hover:bg-amazon-orange/90"
          >
            Sign in with new password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-amazon-orange rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-amazon-dark" />
          </div>
          <span className="font-bold text-2xl text-amazon-dark">Rufus AI</span>
        </Link>
        <h2 className="text-center text-3xl font-bold text-gray-900">
          {step === "email" ? "Reset your password" : "Enter new password"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === "email" 
            ? "Enter your email and we'll send you reset instructions"
            : "Enter your new password below"
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl sm:px-10">
          {message && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === "email" ? (
            <form className="space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue sm:text-sm text-gray-900"
                    placeholder="you@example.com"
                  />
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-amazon-dark bg-amazon-orange hover:bg-amazon-orange/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amazon-orange disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Send reset instructions"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleResetSubmit}>
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                  Reset token (from email)
                </label>
                <input
                  id="token"
                  name="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue sm:text-sm text-gray-900"
                  placeholder="Paste your reset token here"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue sm:text-sm text-gray-900"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-amazon-blue focus:border-amazon-blue sm:text-sm text-gray-900"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-amazon-dark bg-amazon-orange hover:bg-amazon-orange/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amazon-orange disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Reset password"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/login"
              className="flex items-center text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
