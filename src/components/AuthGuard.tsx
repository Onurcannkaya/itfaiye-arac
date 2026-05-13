"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Client tarafında localStorage'dan token'ı kontrol et
    const authData = localStorage.getItem('sivas-itfaiye-auth');
    const token = localStorage.getItem('auth_token');
    
    let hasToken = false;
    
    if (token) {
      hasToken = true;
    } else if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed?.state?.token) {
          hasToken = true;
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    if (!hasToken) {
      // Token yoksa doğrudan login'e at
      window.location.replace("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-lg font-medium text-muted-foreground animate-pulse">Yetki Kontrol Ediliyor...</h2>
      </div>
    );
  }

  return <>{children}</>;
}
