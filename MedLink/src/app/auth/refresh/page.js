"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";


function RefreshContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams.get("redirect") || "/";

    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(res => {
        if (res.ok) {
          router.replace(redirect);
        } else {
          router.replace("/login/user?redirect=" + encodeURIComponent(redirect));
        }
      })
      .catch(() => {
        router.replace("/login/user");
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-600">Refreshing session...</p>
      </div>
    </div>
  );
}

// ✅ Default export wraps it in Suspense — this fixes the build error
export default function RefreshPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600">Refreshing session...</p>
        </div>
      </div>
    }>
      <RefreshContent />
    </Suspense>
  );
}