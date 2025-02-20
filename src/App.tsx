import { Send, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend Window interface inline
declare global {
  interface Window {
    ai?: {
      languageDetector: {
        capabilities(): Promise<{
          capabilities: "no" | "readily" | "after-download";
        }>;
        create(options?: {
          monitor?: (m: {
            addEventListener(
              event: string,
              listener: (e: { loaded: number; total: number }) => void
            ): void;
          }) => void;
        }): Promise<{
          detect(
            text: string
          ): Promise<Array<{ detectedLanguage: string; confidence?: number }>>;
          ready: Promise<void>;
        }>;
      };
      translator: {
        capabilities(): Promise<{
          languagePairAvailable: (
            source: string,
            target: string
          ) => "readily" | "after-download" | "no";
        }>;
        create(options: {
          sourceLanguage: string;
          targetLanguage: string;
          monitor?: (m: {
            addEventListener(
              event: string,
              listener: (e: { loaded: number; total: number }) => void
            ): void;
          }) => void;
        }): Promise<{
          translate(text: string): Promise<string>;
        }>;
      };
    };
  }
}

interface TextItem {
  content: string;
  language?: string;
  languageCode?: string;
  status: "detecting" | "completed" | "failed";
  translations?: Record<string, string>;
  selectedLang?: string;
  isTranslating?: boolean;
}

function App() {
  const form = useForm();
  const [text, setText] = useState("");
  const [outputTexts, setOutputTexts] = useState<TextItem[]>([]);
  const [detector, setDetector] = useState<any>(null);
  const [detectorStatus, setDetectorStatus] = useState<string>("initializing");
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    initializeLanguageDetector();
  }, []);

  const setTextItemTranslatingStatus = (index: number, status: boolean) => {
    setOutputTexts((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isTranslating: status } : item
      )
    );
  };

  const setTextItemSelectedLanguage = (index: number, language: string) => {
    setOutputTexts((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selectedLang: language } : item
      )
    );
  };

  const translateTextItem = async (
    textIndex: number,
    targetLanguage: string
  ) => {
    if (!window.ai || !window.ai.translator) {
      toast.error("Translation API not available");
      return;
    }

    const textItem = outputTexts[textIndex];
    if (!textItem || !textItem.languageCode) return;

    setTextItemTranslatingStatus(textIndex, true);

    try {
      const translatorCapabilities = await window.ai.translator.capabilities();
      const canTranslate = translatorCapabilities.languagePairAvailable(
        textItem.languageCode,
        targetLanguage
      );

      if (canTranslate === "readily" || canTranslate === "after-download") {
        const translator = await window.ai.translator.create({
          sourceLanguage: textItem.languageCode,
          targetLanguage: targetLanguage,
          monitor(m) {
            if (canTranslate === "after-download") {
              m.addEventListener("downloadprogress", (e) => {
                const progress = Math.round((e.loaded / e.total) * 100);
                toast.info(`Downloading language pack: ${progress}%`);
              });
            }
          },
        });

        const result = await translator.translate(textItem.content);
        updateTextItemTranslation(textIndex, targetLanguage, result);
        toast.success(`Translation completed`);
      } else {
        toast.error(
          `Translation from ${
            textItem.language
          } to ${languageTagToHumanReadable(
            targetLanguage,
            "en"
          )} is not available`
        );
      }
    } catch (error) {
      toast.error("Translation failed");
    } finally {
      setTextItemTranslatingStatus(textIndex, false);
    }
  };

  const handleOnChange = async (value: string, textIndex: number) => {
    if (!window.ai || !window.ai.translator) {
      toast.error("Translation API not available");
      return;
    }

    const textItem = outputTexts[textIndex];
    if (!textItem || !textItem.languageCode) {
      toast.error("Source language not detected");
      return;
    }

    setTextItemSelectedLanguage(textIndex, value);

    try {
      const translatorCapabilities = await window.ai.translator.capabilities();
      const canTranslate = translatorCapabilities.languagePairAvailable(
        textItem.languageCode,
        value
      );

      if (canTranslate === "readily" || canTranslate === "after-download") {
        if (canTranslate === "after-download") {
          toast.info(
            `Downloading language pack for ${
              textItem.language
            } to ${languageTagToHumanReadable(value, "en")}...`
          );
        }

        await translateTextItem(textIndex, value);
      } else {
        toast.error(
          `Translation from ${
            textItem.language
          } to ${languageTagToHumanReadable(value, "en")} is not available`
        );
      }
    } catch (error) {
      toast.error("Translation failed");
    }
  };

  const updateTextItemTranslation = (
    index: number,
    language: string,
    translation: string
  ) => {
    setOutputTexts((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const newTranslations = { ...(item.translations || {}) };
          newTranslations[language] = translation;
          return { ...item, translations: newTranslations };
        }
        return item;
      })
    );
  };

  const initializeLanguageDetector = async () => {
    try {
      if (!window.ai || !window.ai.languageDetector) {
        setDetectorStatus("unavailable");
        return;
      }

      const languageDetectorCapabilities =
        await window.ai.languageDetector.capabilities();
      const canDetect = languageDetectorCapabilities.capabilities;

      let detectorInstance;
      if (canDetect === "readily") {
        detectorInstance = await window.ai.languageDetector.create();
      } else {
        detectorInstance = await window.ai.languageDetector.create({
          monitor(m) {
            m.addEventListener("downloadprogress", (e) => {
              console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
              setDetectorStatus(
                `downloading: ${Math.round((e.loaded / e.total) * 100)}%`
              );
            });
          },
        });
        await detectorInstance.ready;
      }

      setDetector(detectorInstance);
      setDetectorStatus("ready");
    } catch (error: any) {
      toast.error("Error initializing language detector:", error);
      setDetectorStatus("error");
    }
  };

  const languageTagToHumanReadable = (
    languageTag: string,
    targetLanguage: string
  ) => {
    const displayNames = new Intl.DisplayNames([targetLanguage], {
      type: "language",
    });
    return displayNames.of(languageTag);
  };

  const detectLanguage = async (
    text: string,
    textIndex: number
  ): Promise<void> => {
    if (!detector) {
      toast.error("Language detector not initialized");
      updateTextItemStatus(textIndex, "failed");
      return;
    }

    try {
      const result = await detector.detect(text);
      if (result && result.length > 0) {
        const detectedCode = result[0].detectedLanguage;
        const humanReadableLang = languageTagToHumanReadable(
          detectedCode,
          "en"
        );
        updateTextItemLanguage(
          textIndex,
          humanReadableLang as string,
          detectedCode
        );
      } else {
        toast("No language detected");
        updateTextItemStatus(textIndex, "failed");
      }
    } catch (error: any) {
      toast.error("Error detecting language:", error);
      updateTextItemStatus(textIndex, "failed");
    }
  };

  const updateTextItemLanguage = (
    index: number,
    language: string,
    languageCode: string
  ) => {
    setOutputTexts((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, language, languageCode, status: "completed" as const }
          : item
      )
    );
  };

  const updateTextItemStatus = (
    index: number,
    status: "detecting" | "completed" | "failed"
  ) => {
    setOutputTexts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status } : item))
    );
  };

  const addText = async () => {
    if (text.trim() === "") return;

    setIsDetecting(true);

    const newItem: TextItem = {
      content: text,
      status: "detecting",
      translations: {},
      selectedLang: "",
      isTranslating: false,
    };

    setOutputTexts((prev) => [newItem, ...prev]);

    setText("");

    const newItemIndex = 0;

    if (detector && detectorStatus === "ready") {
      await detectLanguage(text, newItemIndex);
    } else {
      toast.error(`Cannot detect language. Detector status: ${detectorStatus}`);
      updateTextItemStatus(newItemIndex, "failed");
    }

    setIsDetecting(false);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addText();
    }
  };

  return (
    <>
      <Toaster />
      <main className="w-full h-screen min-h-screen overflow-hidden bg-[#01110A] p-4 space-y-5 relative">
        <h2 className="inter-semibold text-white text-lg">
          AI-Powered Text Processing Interface
        </h2>
        {detectorStatus !== "ready" && (
          <div className="bg-[#004d29] inter-regular text-white text-sm p-2 rounded">
            Language detector status: {detectorStatus}
          </div>
        )}
        <section className="overflow-y-auto max-h-[65vh]">
          {outputTexts.length === 0 ? (
            <h2 className="inter-regular text-white">No texts found</h2>
          ) : (
            outputTexts.map((item, index) => {
              const {
                status,
                content,
                language,
                isTranslating,
                translations,
                selectedLang,
                languageCode,
              } = item;
              return (
                <div
                  key={index}
                  className="mb-4 p-3 bg-[#003E1F] rounded-lg grid grid-cols-1 gap-3"
                >
                  <p className="inter-regular text-white text-sm">{content}</p>
                  <div className="flex items-center justify-between">
                    {status === "detecting" ? (
                      <div>
                        <Loader className="animate-spin mr-2" size={16} />
                      </div>
                    ) : status === "completed" && language ? (
                      <p className="inter-regular text-gray-400 text-sm">
                        Detected language: {language}
                      </p>
                    ) : (
                      <p className="inter-regular text-gray-400 text-sm">
                        Language detection unavailable
                      </p>
                    )}
                    {languageCode === "en" && (
                      <button
                        onClick={() => toast.error("Summarization unavailable")}
                        className="w-28 h-10 p-2 border-2 border-white rounded-lg inter-regular text-sm text-white block hover:cursor-pointer hover:bg-white hover:text-[#4d7964]"
                      >
                        Summarize
                      </button>
                    )}
                  </div>

                  {status === "completed" && language && (
                    <>
                      <div className="flex items-center gap-4">
                        <p className="inter-regular text-white text-sm">
                          Translate from {language} to:
                        </p>
                        <Form {...form}>
                          <form className="w-44">
                            <FormField
                              control={form.control}
                              name={`language-${index}`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      handleOnChange(value, index);
                                    }}
                                    defaultValue={selectedLang}
                                    value={selectedLang}
                                  >
                                    <FormControl>
                                      <SelectTrigger
                                        className="border-2 border-white outline-none shadow-none bg-transparent inter-regular text-white text-sm"
                                        disabled={isTranslating}
                                      >
                                        <SelectValue
                                          placeholder="Select language"
                                          className="text-sm"
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {languageCode !== "en" && (
                                        <SelectItem
                                          value="en"
                                          className="inter-regular text-white text-sm"
                                        >
                                          English
                                        </SelectItem>
                                      )}
                                      {languageCode !== "pt" && (
                                        <SelectItem
                                          value="pt"
                                          className="inter-regular text-white text-sm"
                                        >
                                          Portuguese
                                        </SelectItem>
                                      )}
                                      {languageCode !== "es" && (
                                        <SelectItem
                                          value="es"
                                          className="inter-regular text-white text-sm"
                                        >
                                          Spanish
                                        </SelectItem>
                                      )}
                                      {languageCode !== "ru" && (
                                        <SelectItem
                                          value="ru"
                                          className="inter-regular text-white text-sm"
                                        >
                                          Russian
                                        </SelectItem>
                                      )}
                                      {languageCode !== "tr" && (
                                        <SelectItem
                                          value="tr"
                                          className="inter-regular text-white text-sm"
                                        >
                                          Turkish
                                        </SelectItem>
                                      )}
                                      {languageCode !== "fr" && (
                                        <SelectItem
                                          value="fr"
                                          className="inter-regular text-white text-sm"
                                        >
                                          French
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </form>
                        </Form>
                      </div>
                      {isTranslating && (
                        <Loader
                          className="animate-spin ml-2"
                          size={16}
                          color="white"
                        />
                      )}
                      {translations &&
                        selectedLang &&
                        translations[selectedLang] && (
                          <div className="mt-2 p-2 rounded space-y-2 bg-[#004d29]">
                            <p className="inter-regular text-white text-sm">
                              Translation (
                              {languageTagToHumanReadable(selectedLang, "en")}
                              ):
                              {translations[selectedLang]}
                            </p>
                          </div>
                        )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>
        <div className="flex gap-2 fixed right-0 left-0 bottom-4 w-[90%] md:w-3/4 mx-auto">
          <textarea
            value={text}
            className="h-32 w-full rounded-lg border-none bg-[#73BA9B] outline-none p-4 inter-regular text-white placeholder:inter-regular placeholder:text-white"
            style={{ resize: "none" }}
            placeholder="Enter text here"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDetecting}
          ></textarea>
          <button
            onClick={addText}
            className="hover:cursor-pointer disabled:hover:cursor-default text-white disabled:text-gray-400"
            disabled={
              detectorStatus !== "ready" || isDetecting || text.trim() === ""
            }
          >
            <Send />
          </button>
        </div>
      </main>
    </>
  );
}

export default App;
