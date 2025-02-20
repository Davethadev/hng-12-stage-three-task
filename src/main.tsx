import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const originMetaTranslatorAPI = document.createElement("meta");
originMetaTranslatorAPI.httpEquiv = "origin-trial";
originMetaTranslatorAPI.content = import.meta.env.VITE_TRANSLATOR_API_TOKEN;
document.head.append(originMetaTranslatorAPI);

const originMetaLanguageDetectorAPI = document.createElement("meta");
originMetaLanguageDetectorAPI.httpEquiv = "origin-trial";
originMetaLanguageDetectorAPI.content =
  import.meta.env.VITE_LANGUAGE_DETECTOR_API_TOKEN;
document.head.append(originMetaLanguageDetectorAPI);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
