"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface WindowProps {
  id: string;
  title: string;
  icon?: string;
  children: ReactNode;
  isActive: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
}

export function Window({
  id,
  title,
  icon,
  children,
  isActive,
  isMinimized,
  isMaximized,
  zIndex,
  initialPosition = { x: 100, y: 50 },
  initialSize = { width: 800, height: 500 },
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
}: WindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Store pre-maximize state
  const preMaximizeState = useRef({ position, size });

  useEffect(() => {
    if (!isMaximized) {
      preMaximizeState.current = { position, size };
    }
  }, [position, size, isMaximized]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: Math.max(28, e.clientY - dragOffset.y), // Don't go above menu bar
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      setSize({
        width: Math.max(400, e.clientX - position.x),
        height: Math.max(300, e.clientY - position.y),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, position]);

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest(".window-controls")) return;
    
    onFocus();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    onFocus();
    setIsResizing(true);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore
      setPosition(preMaximizeState.current.position);
      setSize(preMaximizeState.current.size);
    }
    onMaximize();
  };

  if (isMinimized) return null;

  const windowStyle = isMaximized
    ? {
        top: 28, // Below menu bar
        left: 0,
        width: "100%",
        height: "calc(100vh - 28px - 90px)", // Subtract menu bar and dock
        zIndex,
      }
    : {
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex,
      };

  return (
    <div
      ref={windowRef}
      className={`
        fixed flex flex-col
        bg-bg-secondary rounded-xl overflow-hidden
        shadow-2xl shadow-black/50
        transition-shadow duration-200
        ${isActive ? "shadow-black/70" : "opacity-95"}
        ${isDragging || isResizing ? "select-none" : ""}
      `}
      style={windowStyle}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div
        className={`
          flex items-center gap-2 px-3 h-10 shrink-0
          ${isActive ? "bg-bg-tertiary" : "bg-bg-secondary"}
          cursor-default
        `}
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={handleMaximize}
      >
        {/* Traffic light buttons */}
        <div className="window-controls flex items-center gap-2">
          <button
            onClick={onClose}
            className="group w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 flex items-center justify-center"
          >
            <svg
              className="w-2 h-2 text-[#820005] opacity-0 group-hover:opacity-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
          <button
            onClick={onMinimize}
            className="group w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 flex items-center justify-center"
          >
            <svg
              className="w-2 h-2 text-[#9a6a02] opacity-0 group-hover:opacity-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="group w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 flex items-center justify-center"
          >
            <svg
              className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isMaximized ? (
                <>
                  <path d="M8 4h12v12" />
                  <path d="M4 8h12v12H4z" />
                </>
              ) : (
                <>
                  <path d="M8 4l8 8M8 4v8h8" />
                  <path d="M16 20l-8-8M16 20v-8H8" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {icon && (
            <span className="text-text-muted text-sm font-mono">{icon}</span>
          )}
          <span className="text-text-secondary text-sm">{title}</span>
        </div>

        {/* Spacer to balance */}
        <div className="w-14" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Resize handle */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
        >
          <svg
            className="w-3 h-3 text-text-muted/30 absolute bottom-1 right-1"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
