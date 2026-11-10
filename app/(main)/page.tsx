import {
  ConversionPresets,
  ConverterSection,
} from "@/features/converter/components";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="mx-auto max-w-2xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          Fast, Private & Free Online Converter
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Convert Any File, Anytime
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Transform documents, images, and e-books into your preferred format in
          seconds with zero loss in quality.
        </p>
      </div>

      {/* Main Interactive Converter Box (Client Component) */}
      <ConverterSection />

      {/* Presets Grid */}
      <div className="mx-auto max-w-5xl pt-4">
        <ConversionPresets />
      </div>
    </main>
  );
}
