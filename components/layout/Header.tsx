"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  LogIn,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { getUserInitials, logoutUser } from "@/lib/auth";
import { getMainSiteUrl, getSignInUrl } from "@/lib/urls";
import { useAuthUser } from "@/hooks/useAuthUser";

export default function Header() {
  const { user, isAuthenticated, loading, refresh } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [accountOpen]);

  const displayName =
    user?.firstname || user?.username || user?.email || "Account";

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const success = await logoutUser();
      setAccountOpen(false);
      if (success) {
        window.location.reload();
        return;
      }
      await refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const signInHref =
    typeof window !== "undefined"
      ? getSignInUrl(window.location.href)
      : getSignInUrl("/my-courses");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/my-courses" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="hidden font-semibold text-slate-900 sm:block">
              Handiz <span className="text-indigo-600">Learn</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/my-courses"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              My Courses
            </Link>
            <a
              href={getMainSiteUrl("/courses")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Browse Courses
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              aria-expanded={accountOpen}
            >
              {loading ? (
                <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              ) : isAuthenticated && user ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {getUserInitials(user)}
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <LogIn className="h-4 w-4" />
                </span>
              )}
              <span className="max-w-[120px] truncate">
                {isAuthenticated ? displayName : "Sign In"}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50">
                {isAuthenticated && user && (
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate font-medium text-slate-900">
                      {displayName}
                    </p>
                    {user.email && (
                      <p className="truncate text-sm text-slate-500">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
                {isAuthenticated ? (
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Logging out…" : "Logout"}
                  </button>
                ) : (
                  <a
                    href={signInHref}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/my-courses"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <BookOpen className="h-4 w-4" />
              My Courses
            </Link>
            <a
              href={getMainSiteUrl("/courses")}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Browse Courses
            </a>
            {!isAuthenticated && (
              <a
                href={signInHref}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                onClick={() => setMenuOpen(false)}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </a>
            )}
            {isAuthenticated && (
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out…" : "Logout"}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
