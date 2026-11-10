"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  ArrowReloadVerticalIcon,
  Cancel01Icon,
  File01Icon,
  Menu01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "./header.constants";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

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
              <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
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

        {/* Right CTA Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign In
          </Link>

          <Link
            href="/convert"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5 shadow-sm")}
          >
            <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
            <span>Convert Now</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
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
            <div className="my-1 border-t border-border/50" />

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

            <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-border/60">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-center",
                )}
              >
                Sign In
              </Link>
              <Link
                href="/convert"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "w-full justify-center gap-1.5",
                )}
              >
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
                <span>Convert Now</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
