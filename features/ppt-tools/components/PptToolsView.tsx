"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowReloadVerticalIcon,
  Presentation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import PptMerger from "./PptMerger";
import ConverterSection from "@/features/converter/components/ConverterSection";

export type PptToolType = "convert" | "merge";

interface PptToolsViewProps {
  currentTool: PptToolType;
}

const TOOLS = [
  {
    id: "convert" as const,
    label: "Convert to PPT",
    href: "/ppt-tools/convert",
    icon: ArrowReloadVerticalIcon,
    title: "Convert to PowerPoint (.pptx)",
    subtitle:
      "Transform images (PNG, JPG, WEBP), Word documents (.docx, .doc), and PDF documents into PowerPoint slides.",
  },
  {
    id: "merge" as const,
    label: "Merge to PPT",
    href: "/ppt-tools/merge",
    icon: Presentation01Icon,
    title: "Merge Files into PowerPoint Presentation",
    subtitle:
      "Combine images, Word documents (.docx), PDFs, and PPT slides into a single organized PowerPoint presentation.",
  },
];

export default function PptToolsView({ currentTool }: PptToolsViewProps) {
  const pathname = usePathname();

  const activeToolConfig =
    TOOLS.find((t) => t.id === currentTool) || TOOLS[0];

  return (
    <div className="space-y-8">
      {/* Navigation Pills */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-2xl border border-border/80 bg-muted/30 p-1.5 shadow-2xs">
          {TOOLS.map((tool) => {
            const isActive =
              currentTool === tool.id ||
              pathname === tool.href ||
              (tool.id === "convert" && pathname === "/ppt-tools");

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HugeiconsIcon
                  icon={tool.icon}
                  className={`size-4 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span>{tool.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tool Header Details */}
      <div className="mx-auto max-w-2xl text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {activeToolConfig.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activeToolConfig.subtitle}
        </p>
      </div>

      {/* Tool Content Views */}
      <div className="pt-2">
        {currentTool === "convert" && (
          <ConverterSection
            allowedExtensions={["png", "jpg", "jpeg", "webp", "svg", "pdf", "docx", "doc"]}
            dropzoneTitle="Select Files to Convert to PowerPoint"
            dropzoneSubtitle="Supports Images (PNG, JPG, WEBP), Word Documents (.docx, .doc), and PDF documents"
          />
        )}
        {currentTool === "merge" && <PptMerger />}
      </div>
    </div>
  );
}

