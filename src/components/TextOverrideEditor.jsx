import React, { useCallback, useEffect, useRef, useState } from "react";
import { Edit3, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "yuiri_text_overrides_v1";
const ROOT_ATTR = "data-yuiri-text-editor-root";
const EDITABLE_ATTR = "data-yuiri-editable-text";
const EDITABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"];
const COMMON_SKIP_SELECTOR = [
  `[${ROOT_ATTR}]`,
  "script",
  "style",
  "noscript",
  "svg",
  "option",
  ".sr-only",
  "[aria-hidden='true']",
  "[contenteditable='true']",
].join(",");
const TEXT_SKIP_SELECTOR = [
  COMMON_SKIP_SELECTOR,
  "input",
  "textarea",
  "select",
].join(",");

function readOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function splitOuterSpace(value) {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return {
    leading: match?.[1] || "",
    text: match?.[2] || "",
    trailing: match?.[3] || "",
  };
}

function isEditableValue(value) {
  const text = value.trim();
  if (!text) return false;
  if (/^[\W_]+$/.test(text)) return false;
  return true;
}

function shouldSkipElement(element, skipSelector = COMMON_SKIP_SELECTOR) {
  if (!element) return true;
  if (element.closest(skipSelector)) return true;
  const style = window.getComputedStyle(element);
  return style.display === "none" || style.visibility === "hidden";
}

export default function TextOverrideEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [overrides, setOverrides] = useState(readOverrides);
  const textEntriesRef = useRef(new WeakMap());
  const attributeEntriesRef = useRef(new WeakMap());
  const elementEntriesRef = useRef(new WeakMap());
  const overridesRef = useRef(overrides);
  const isEditingRef = useRef(isEditing);
  const isApplyingRef = useRef(false);
  const scheduledRef = useRef(false);

  const setAndSaveOverrides = useCallback((nextOverrides) => {
    overridesRef.current = nextOverrides;
    saveOverrides(nextOverrides);
    setOverrides(nextOverrides);
  }, []);

  const markElementEntry = useCallback((element, entry) => {
    element.setAttribute(EDITABLE_ATTR, "true");
    const existing = elementEntriesRef.current.get(element) || [];
    existing.push(entry);
    elementEntriesRef.current.set(element, existing);
  }, []);

  const applyOverrides = useCallback((nextOverrides, editing) => {
    if (!document.body) return;

    isApplyingRef.current = true;
    elementEntriesRef.current = new WeakMap();
    document.body.classList.toggle("yuiri-wording-edit", editing);
    document.querySelectorAll(`[${EDITABLE_ATTR}]`).forEach((element) => {
      element.removeAttribute(EDITABLE_ATTR);
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    textNodes.forEach((node) => {
      const parent = node.parentElement;
      if (shouldSkipElement(parent, TEXT_SKIP_SELECTOR) || !isEditableValue(node.nodeValue || "")) return;

      let entry = textEntriesRef.current.get(node);
      if (!entry) {
        const parts = splitOuterSpace(node.nodeValue || "");
        entry = {
          kind: "text",
          original: parts.text,
          leading: parts.leading,
          trailing: parts.trailing,
          node,
        };
        textEntriesRef.current.set(node, entry);
      }

      const replacement = nextOverrides[entry.original] || entry.original;
      const nextValue = `${entry.leading}${replacement}${entry.trailing}`;
      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue;
      }

      if (editing) {
        markElementEntry(parent, entry);
      }
    });

    const selector = EDITABLE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(",");
    document.querySelectorAll(selector).forEach((element) => {
      if (shouldSkipElement(element)) return;

      const entries = attributeEntriesRef.current.get(element) || [];
      EDITABLE_ATTRIBUTES.forEach((attribute) => {
        const currentValue = element.getAttribute(attribute);
        if (!currentValue || !isEditableValue(currentValue)) return;

        let entry = entries.find((item) => item.attribute === attribute);
        if (!entry) {
          entry = {
            kind: "attribute",
            attribute,
            original: currentValue.trim(),
            element,
          };
          entries.push(entry);
        }

        const replacement = nextOverrides[entry.original] || entry.original;
        if (element.getAttribute(attribute) !== replacement) {
          element.setAttribute(attribute, replacement);
        }

        if (editing) {
          markElementEntry(element, entry);
        }
      });
      attributeEntriesRef.current.set(element, entries);
    });

    isApplyingRef.current = false;
  }, [markElementEntry]);

  const scheduleApply = useCallback(() => {
    if (scheduledRef.current) return;
    scheduledRef.current = true;
    window.requestAnimationFrame(() => {
      scheduledRef.current = false;
      applyOverrides(overridesRef.current, isEditingRef.current);
    });
  }, [applyOverrides]);

  useEffect(() => {
    overridesRef.current = overrides;
    applyOverrides(overrides, isEditing);
  }, [applyOverrides, isEditing, overrides]);

  useEffect(() => {
    isEditingRef.current = isEditing;
    applyOverrides(overridesRef.current, isEditing);
  }, [applyOverrides, isEditing]);

  useEffect(() => {
    if (!document.body) return undefined;

    const observer = new MutationObserver(() => {
      if (!isApplyingRef.current) {
        scheduleApply();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: EDITABLE_ATTRIBUTES,
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove("yuiri-wording-edit");
    };
  }, [scheduleApply]);

  useEffect(() => {
    if (!isEditing) return undefined;

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[${ROOT_ATTR}]`)) return;

      const element = target.closest(`[${EDITABLE_ATTR}='true']`);
      if (!element) return;

      const entries = elementEntriesRef.current.get(element);
      const entry = entries?.[0];
      if (!entry) return;

      event.preventDefault();
      event.stopPropagation();

      const currentValue = overridesRef.current[entry.original] || entry.original;
      const nextValue = window.prompt(
        `Change this wording:\n\n${entry.original}\n\nLeave blank to reset it.`,
        currentValue
      );
      if (nextValue === null) return;

      const cleanedValue = nextValue.trim();
      const nextOverrides = { ...overridesRef.current };
      if (!cleanedValue || cleanedValue === entry.original) {
        delete nextOverrides[entry.original];
      } else {
        nextOverrides[entry.original] = nextValue;
      }
      setAndSaveOverrides(nextOverrides);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isEditing, setAndSaveOverrides]);

  const resetOverrides = () => {
    const confirmed = window.confirm("Remove all custom wording and go back to the app defaults?");
    if (!confirmed) return;
    setAndSaveOverrides({});
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <>
      <style>
        {`
          .yuiri-wording-edit [${EDITABLE_ATTR}="true"] {
            outline: 2px dashed #2563eb;
            outline-offset: 3px;
            cursor: text !important;
          }
        `}
      </style>
      <div
        className="fixed bottom-4 right-4 z-[80] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
        {...{ [ROOT_ATTR]: "true" }}
      >
        {isEditing && (
          <div className="max-w-xs rounded-md border border-blue-100 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">
            Click any highlighted wording, type your Yiddish text, then press OK.
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {isEditing && overrideCount > 0 && (
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={resetOverrides}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {isEditing ? "Done editing" : "Edit wording"}
          </Button>
        </div>
      </div>
    </>
  );
}
