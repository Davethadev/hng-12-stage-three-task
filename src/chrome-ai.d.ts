interface LanguageDetectorCapabilities {
    capabilities: "no" | "readily" | "after-download";
}

interface LanguageDetectionResult {
    language: string;
    confidence?: number;
}

interface LanguageDetectorMonitor {
    addEventListener(
        event: string,
        listener: (e: { loaded: number; total: number }) => void
    ): void;
}

interface LanguageDetectorOptions {
    monitor: (m: LanguageDetectorMonitor) => void;
}

interface LanguageDetector {
    detect(text: string): Promise<LanguageDetectionResult[]>;
    ready: Promise<void>;
}

interface AILanguageDetector {
    capabilities(): Promise<LanguageDetectorCapabilities>;
    create(options?: LanguageDetectorOptions): Promise<LanguageDetector>;
}

interface ChromeAI {
    languageDetector: AILanguageDetector;
}

// Extend the global Window interface
declare global {
    interface Window {
        ai?: ChromeAI;
    }
}