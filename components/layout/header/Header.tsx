"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowReloadVerticalIcon,
  Cancel01Icon,
  File01Icon,
  GithubIcon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "./header.constants";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <HugeiconsIcon icon={File01Icon} className="size-5" />
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background shadow-xs">
                <HugeiconsIcon
                  icon={ArrowReloadVerticalIcon}
                  className="size-2.5"
                />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Dr. Doc
              </span>
              <span className="-mt-1 text-[10px] font-medium text-muted-foreground">
                Document Converter
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions: Theme Toggle & GitHub Repo */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />

          <Link
            href="https://github.com/infornics/dr-doc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 rounded-xl text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            )}
          >
            <HugeiconsIcon icon={GithubIcon} className="size-4" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />

          <Link
            href="https://github.com/infornics/dr-doc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 rounded-xl text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={GithubIcon} className="size-4" />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="size-9 rounded-xl"
          >
            <HugeiconsIcon
              icon={isMobileMenuOpen ? Cancel01Icon : Menu01Icon}
              className="size-5"
            />
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="border-b border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
