"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MultiChatInterface } from "@/components/MultiChatInterface";
import { isAuthenticated, getUserId, getUserName } from "@/lib/auth";

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Get user info
    const id = getUserId();
    const name = getUserName();
    
    if (!id) {
      // Fallback: create a temporary user ID based on timestamp
      const tempId = `temp_${Date.now()}`;
      setUserId(tempId);
    } else {
      setUserId(id);
    }
    
    setUserName(name);
  }, [router]);

  if (!userId) {
    return (
      <main className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amazon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen">
      <MultiChatInterface userId={userId} userName={userName || undefined} />
    </main>
  );
}
