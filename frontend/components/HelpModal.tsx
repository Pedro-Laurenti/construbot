"use client";

import { useEffect, useRef } from "react";
import { RiCloseLine } from "react-icons/ri";

export interface HelpContent {
  title: string;
  body: string;
  imageAlt?: string;
}

interface HelpModalProps {
  content: HelpContent;
  onClose: () => void;
}

export default function HelpModal({ content, onClose }: HelpModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div className="card bg-base-300 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="card-body p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-secondary">
            <h3 className="card-title text-base">{content.title}</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              <RiCloseLine size={20} />
            </button>
          </div>

          {/* Placeholder illustration */}
          <div className="mx-5 mt-5 rounded-xl bg-secondary h-36 flex items-center justify-center">
            <span className="text-base-content/40 text-sm">
              {content.imageAlt ?? "Ilustração"}
            </span>
          </div>

          <div className="px-5 py-5">
            <p className="text-base-content/70 text-sm leading-relaxed whitespace-pre-line">
              {content.body}
            </p>
          </div>

          <div className="px-5 pb-5">
            <button onClick={onClose} className="btn btn-primary w-full">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
