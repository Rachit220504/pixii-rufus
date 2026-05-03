"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  variant?: "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return (
      <div className={`p-2 rounded-lg ${className}`}>
        <div className="w-5 h-5" />
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-colors ${
          theme === "dark"
            ? "text-yellow-400 hover:bg-yellow-400/20"
            : "text-gray-600 hover:bg-gray-100"
        } ${className}`}
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        theme === "dark"
          ? "text-yellow-400 hover:bg-yellow-400/20"
          : "text-gray-600 hover:bg-gray-100"
      } ${className}`}
    >
      {theme === "light" ? (
        <>
          <Moon className="w-5 h-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-5 h-5" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}
