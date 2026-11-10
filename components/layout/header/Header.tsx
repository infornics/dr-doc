"use client";

import Link from "next/link";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  ArrowReloadVerticalIcon,
  ChevronDownIcon,
  Menu01Icon,
  Cancel01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const navLinks = [
  { label: "Convert", href: "/#convert" },
  { label: "PDF Tools", href: "/#pdf-tools" },
  { label: "Image Tools", href: "/#image-tools" },
  { label: "Pricing", href: "/pricing" },
];

const popularFormats = [
  { from: "PNG", to: "PDF" },
  { from: "PDF", to: "DOCX" },
  { from: "JPG", to: "PNG" },
  { from: "DOCX", to: "PDF" },
];

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
            {/* Tools Dropdown trigger */}
            <div
              className="relative"
              onMouseEnter={() => setToolsDropdownOpen(true)}
              onMouseLeave={() => setToolsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setToolsDropdownOpen((prev) => !prev)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span>All Converters</span>
                <HugeiconsIcon
                  icon={ChevronDownIcon}
                  className={`size-3.5 transition-transform duration-200 ${
                    toolsDropdownOpen ? "rotate-180 text-foreground" : ""
                  }`}
                />
              </button>

              {/* Tools Flyout */}
              {toolsDropdownOpen && (
                <div className="absolute left-0 top-full pt-1.5 w-72">
                  <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Popular Conversions
                    </p>
                    <div className="mt-1 flex flex-col gap-1">
                      {popularFormats.map((format) => (
                        <Link
                          key={`${format.from}-${format.to}`}
                          href={`/convert/${format.from.toLowerCase()}-to-${format.to.toLowerCase()}`}
                          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-popover-foreground transition-colors hover:bg-muted"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {format.from}
                            </span>
                            <span className="text-muted-foreground">to</span>
                            <span className="font-semibold text-foreground">
                              {format.to}
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground/80">
                            Fast & Free
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {navLinks.map((item) => (
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
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-1.5 shadow-sm"
            )}
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
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Popular Converters
            </div>
            <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
              {popularFormats.map((format) => (
                <Link
                  key={`m-${format.from}-${format.to}`}
                  href={`/convert/${format.from.toLowerCase()}-to-${format.to.toLowerCase()}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg border border-border/60 bg-muted/40 p-2 text-center text-xs font-medium text-foreground hover:bg-muted"
                >
                  {format.from} → {format.to}
                </Link>
              ))}
            </div>

            <div className="my-1 border-t border-border/50" />

            {navLinks.map((item) => (
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
                  "w-full justify-center"
                )}
              >
                Sign In
              </Link>
              <Link
                href="/convert"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "w-full justify-center gap-1.5"
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
