import { getMainSiteUrl } from "@/lib/urls";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Handiz Architecture Academy
        </p>
        <div className="flex items-center gap-6 text-sm">
          <a
            href={getMainSiteUrl("/courses")}
            className="text-slate-500 transition-colors hover:text-indigo-600"
          >
            Course Catalog
          </a>
          <a
            href={getMainSiteUrl("/")}
            className="text-slate-500 transition-colors hover:text-indigo-600"
          >
            Main Site
          </a>
        </div>
      </div>
    </footer>
  );
}
