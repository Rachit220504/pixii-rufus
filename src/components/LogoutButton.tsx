"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/lib/auth";

interface LogoutButtonProps {
  variant?: "icon" | "full";
  className?: string;
}

export function LogoutButton({ variant = "icon", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    setIsLoading(false);
    router.push("/");
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${className}`}
        title="Logout"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogOut className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <LogOut className="w-5 h-5" />
      )}
      <span>Logout</span>
    </button>
  );
}
