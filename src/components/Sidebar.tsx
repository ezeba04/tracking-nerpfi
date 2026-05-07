"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { section: "Plataformas" },
  { href: "/codeforces", label: "Codeforces", icon: "🏆" },
  { href: "/cses", label: "CSES", icon: "📘" },
  { section: "Sistema" },
  { href: "/settings", label: "Configuración", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">🧑‍💻 Cooperativa los Trapitos</div>
      {links.map((item, i) => {
        if ("section" in item) {
          return <div key={i} className="sidebar-section">{item.section}</div>;
        }
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href!);
        return (
          <Link
            key={item.href}
            href={item.href!}
            className={`sidebar-link ${isActive ? "active" : ""}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
