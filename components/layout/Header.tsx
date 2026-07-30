"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Compass,
  ExternalLink,
  LogIn,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";
import { getUserInitials, logoutUser } from "@/lib/auth";
import { getMainSiteUrl, getSignInUrl } from "@/lib/urls";
import { useAuthUser } from "@/hooks/useAuthUser";
import type { AuthUser } from "@/types/user";

function formatDisplayName(user: AuthUser): string {
  const parts = [user.firstname, user.lastname].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (user.username) return user.username;
  return user.email?.split("@")[0] || "Account";
}

function navLinkClass(isActive: boolean) {
  return [
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-indigo-50 text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, loading, refresh } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isMyCoursesActive =
    pathname === "/my-courses" || pathname.startsWith("/courses/");

  useEffect(() => {
    if (!accountOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountOpen]);

  const displayName = user ? formatDisplayName(user) : "Account";

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

  const signInHref = getSignInUrl(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <Link
            href="/my-courses"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/logo/Logo-black-black.png"
              alt="Handiz Learn"
              width={194}
              height={44}
              priority
              className="h-9 w-auto sm:h-10"
            />
          </Link>

          <div className="hidden h-6 w-px bg-slate-200 md:block" aria-hidden />

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/my-courses"
              className={navLinkClass(isMyCoursesActive)}
              aria-current={isMyCoursesActive ? "page" : undefined}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
              My Courses
            </Link>
            <a
              href={getMainSiteUrl("/courses")}
              className={navLinkClass(false)}
            >
              <Compass className="h-4 w-4 shrink-0" aria-hidden />
              Browse Courses
              <ExternalLink
                className="h-3 w-3 shrink-0 text-slate-400"
                aria-hidden
              />
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className={[
                "flex items-center gap-2.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition-all",
                accountOpen
                  ? "border-indigo-200 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              {loading ? (
                <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              ) : isAuthenticated && user ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-semibold text-white shadow-sm">
                  {getUserInitials(user)}
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
              )}
              <span className="max-w-[140px] truncate capitalize">
                {isAuthenticated ? displayName : "Sign In"}
              </span>
              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                  accountOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              />
            </button>

            {accountOpen && (
              <div
                className="dropdown-enter absolute right-0 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10"
                role="menu"
              >
                {isAuthenticated && user ? (
                  <>
                    <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 to-white px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/25">
                          {getUserInitials(user)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold capitalize text-slate-900">
                            {displayName}
                          </p>
                          {user.email && (
                            <p className="truncate text-sm text-slate-500">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <Link
                        href="/my-courses"
                        role="menuitem"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        onClick={() => setAccountOpen(false)}
                      >
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        My Courses
                      </Link>
                      <a
                        href={getMainSiteUrl("/courses")}
                        role="menuitem"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Compass className="h-4 w-4 text-slate-400" />
                        Browse Courses
                        <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300" />
                      </a>
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={loggingOut}
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        {loggingOut ? "Logging out…" : "Sign out"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <div className="mb-4 text-center">
                      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <User className="h-6 w-6" />
                      </span>
                      <p className="font-semibold text-slate-900">
                        Welcome to Handiz Learn
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Sign in to access your courses and track progress.
                      </p>
                    </div>
                    <a
                      href={signInHref}
                      role="menuitem"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          {isAuthenticated && user && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50/60 to-white px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-semibold text-white">
                {getUserInitials(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold capitalize text-slate-900">
                  {displayName}
                </p>
                {user.email && (
                  <p className="truncate text-sm text-slate-500">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            <Link
              href="/my-courses"
              className={navLinkClass(isMyCoursesActive)}
              onClick={() => setMenuOpen(false)}
              aria-current={isMyCoursesActive ? "page" : undefined}
            >
              <BookOpen className="h-4 w-4" />
              My Courses
            </Link>
            <a
              href={getMainSiteUrl("/courses")}
              className={navLinkClass(false)}
            >
              <Compass className="h-4 w-4" />
              Browse Courses
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300" />
            </a>

            <div className="my-2 h-px bg-slate-100" />

            {!isAuthenticated ? (
              <a
                href={signInHref}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                onClick={() => setMenuOpen(false)}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </a>
            ) : (
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Logging out…" : "Sign out"}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
