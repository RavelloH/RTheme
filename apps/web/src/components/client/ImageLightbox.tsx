/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCloseLine,
} from "@remixicon/react";
import { useFooterStore } from "@/store/footer-store";

interface LightboxImage {
  src: string;
  alt: string;
}

/**
 * Image Lightbox Component
 * Adds click-to-zoom functionality for images with data-lightbox attribute.
 * Supports navigation (prev/next), keyboard shortcuts, and "zoom-from-origin" animations.
 */
export default function ImageLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(0); // -1: prev, 1: next, 0: initial/close
  const [isSliding, setIsSliding] = useState(false); // true during nav, false during open/close
  const [isClosing, setIsClosing] = useState(false); // New state for manual close control
  const [openedIndex, setOpenedIndex] = useState<number | null>(null); // Track which image opened the lightbox
  const [scale, setScale] = useState(1); // Zoom level

  // Store references to the actual DOM elements to calculate positions
  const imageElementsRef = useRef<(HTMLImageElement | null)[]>([]);

  // Footer control
  const setFooterVisible = useFooterStore((state) => state.setFooterVisible);
  const previousFooterVisibleRef = useRef(true);

  // Store refs for thumbnails to scroll into view
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll active thumbnail into center
  useEffect(() => {
    if (isOpen && images.length > 0) {
      // Use a small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const thumbEl = thumbnailRefs.current[currentIndex];
        if (thumbEl) {
          thumbEl.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isOpen, images.length]);

  // Helper to toggle original image visibility
  const setOriginalImageVisible = useCallback(
    (index: number, visible: boolean) => {
      const img = imageElementsRef.current[index];
      // Verify if the element is still in the document to prevent errors during navigation
      if (img && document.body.contains(img)) {
        img.style.opacity = visible ? "1" : "0";
      }
    },
    [],
  );

  // Initialize mounted state for Portal
  useEffect(() => {
    setMounted(true);
    return () => {
      // Safety cleanup
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Reset scale when index changes
  useEffect(() => {
    setScale(1);
  }, [currentIndex]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Only zoom if lightbox is open
      if (!isOpen) return;

      e.stopPropagation();

      setScale((prevScale) => {
        // Determine direction and speed
        // deltaY is usually around 100 for a mouse wheel notch
        const delta = -e.deltaY * 0.001;
        const newScale = prevScale + delta;

        // Clamp scale between 1 and 5
        return Math.min(Math.max(1, newScale), 5);
      });
    },
    [isOpen],
  );

  // Scan for images in the document
  const scanImages = useCallback(() => {
    const imgElements = Array.from(
      document.querySelectorAll<HTMLImageElement>("img[data-lightbox]"),
    );

    const newImages = imgElements.map((img) => ({
      src: img.src,
      alt: img.alt || "",
    }));

    setImages(newImages);
    imageElementsRef.current = imgElements;
    return { elements: imgElements, data: newImages };
  }, []);

  // Handle opening the lightbox
  const openLightbox = useCallback(
    (index: number) => {
      // Rescan images to get fresh references for current page
      const { data: freshImages, elements: freshElements } = scanImages();
      setImages(freshImages);
      imageElementsRef.current = freshElements;

      // Record current footer state and hide it
      previousFooterVisibleRef.current =
        useFooterStore.getState().isFooterVisible;
      setFooterVisible(false);

      setOriginalImageVisible(index, false); // Hide original immediately
      setCurrentIndex(index);
      setOpenedIndex(index);
      setDirection(0);
      setIsSliding(false);
      setIsClosing(false);
      setIsOpen(true);
    },
    [setOriginalImageVisible, setFooterVisible, scanImages],
  );

  // Close the lightbox
  const closeLightbox = useCallback(() => {
    // Instead of unmounting immediately, start closing animation
    setIsClosing(true);
    setDirection(0);
    setIsSliding(false);
  }, []);

  // Navigate to previous image
  const prevImage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setOriginalImageVisible(currentIndex, true); // Show old
      const newIndex = (currentIndex - 1 + images.length) % images.length;
      setOriginalImageVisible(newIndex, false); // Hide new

      setDirection(-1);
      setIsSliding(true);
      setCurrentIndex(newIndex);
    },
    [images.length, currentIndex, setOriginalImageVisible],
  );

  // Navigate to next image
  const nextImage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setOriginalImageVisible(currentIndex, true); // Show old
      const newIndex = (currentIndex + 1) % images.length;
      setOriginalImageVisible(newIndex, false); // Hide new

      setDirection(1);
      setIsSliding(true);
      setCurrentIndex(newIndex);
    },
    [images.length, currentIndex, setOriginalImageVisible],
  );

  // Jump to specific image
  const jumpToImage = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setOriginalImageVisible(currentIndex, true);
      setOriginalImageVisible(index, false);
      setDirection(index > currentIndex ? 1 : -1);
      setIsSliding(true);
      setCurrentIndex(index);
    },
    [currentIndex, setOriginalImageVisible],
  );

  // Restore all images on unmount or forced cleanup
  useEffect(() => {
    return () => {
      // Restore opacity of all images
      imageElementsRef.current.forEach((img) => {
        if (img) img.style.opacity = "";
      });
      // Clear all references
      imageElementsRef.current = [];
      thumbnailRefs.current = [];
    };
  }, []);

  // Handle global click for event delegation
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const img = target.closest<HTMLImageElement>("img[data-lightbox]");

      if (img && !isOpen) {
        e.preventDefault();
        // Scan images at click time to get fresh references
        const imgElements = Array.from(
          document.querySelectorAll<HTMLImageElement>("img[data-lightbox]"),
        );
        const index = imgElements.indexOf(img);
        if (index !== -1) {
          openLightbox(index);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, [isOpen, openLightbox]);

  // Apply global styles for lightbox-enabled images
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "image-lightbox-styles";
    style.innerHTML = `
      img[data-lightbox] {
        cursor: zoom-in !important;
        transition: opacity 0.2s ease !important;
      }
      img[data-lightbox]:hover {
        opacity: 0.8 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("image-lightbox-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          prevImage();
          break;
        case "ArrowRight":
          nextImage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeLightbox, prevImage, nextImage]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // --- Animation Logic ---

  // Calculate the geometry for the current image
  const geometry = useMemo(() => {
    if (!isOpen || !images[currentIndex]) return null;

    // Default fallback if logic fails
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const targetMaxWidth = viewportWidth * 0.9;
    // Reserve space for top bar and bottom strip
    const targetMaxHeight = viewportHeight * 0.75;

    const imgElement = imageElementsRef.current[currentIndex];
    let initialRect = {
      top: viewportHeight / 2,
      left: viewportWidth / 2,
      width: 0,
      height: 0,
    };
    let naturalWidth = 800;
    let naturalHeight = 600;

    if (imgElement) {
      const rect = imgElement.getBoundingClientRect();
      initialRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
      // Use natural dimensions if available, otherwise fallback to rect (scaled up/down later)
      naturalWidth = imgElement.naturalWidth || rect.width;
      naturalHeight = imgElement.naturalHeight || rect.height;
    }

    // Calculate target dimensions (fit within target box, maintain aspect ratio)
    const widthRatio = targetMaxWidth / naturalWidth;
    const heightRatio = targetMaxHeight / naturalHeight;
    // Allow scaling up to 2x if image is small, otherwise fit to screen
    const scale = Math.min(
      widthRatio,
      heightRatio,
      naturalWidth < targetMaxWidth ? 2 : 1,
    );

    const targetWidth = naturalWidth * scale;
    const targetHeight = naturalHeight * scale;

    const targetX = (viewportWidth - targetWidth) / 2;
    // Center vertically within the available space, maybe bias upwards slightly if needed
    const targetY = (viewportHeight - targetHeight) / 2 - 40;

    return {
      initialRect,
      targetRect: {
        x: targetX,
        y: targetY,
        width: targetWidth,
        height: targetHeight,
      },
    };
  }, [currentIndex, isOpen, images]); // Recalculate when index changes

  if (!mounted) return null;

  const currentImage = images[currentIndex];

  return createPortal(
    <div className="lightbox-portal" onWheel={handleWheel}>
      {/* Group 1: UI Elements (Backdrop & Controls) - Persistent across slides */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 1. Backdrop Layer */}
            <motion.div
              key="lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: isClosing ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm"
              onClick={closeLightbox}
            />

            {/* 2. Controls Layer */}
            <div className="fixed inset-0 z-[1001] pointer-events-none flex flex-col justify-between">
              {/* Top Bar: Alt Text & Close Button */}
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: isClosing ? 0 : 1, y: isClosing ? -50 : 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start pointer-events-auto"
              >
                <div className="flex flex-col text-white/90 max-w-[80%]">
                  {currentImage && currentImage.alt && (
                    <span className="font-medium text-lg line-clamp-2">
                      {currentImage.alt}
                    </span>
                  )}
                  {images.length > 1 && (
                    <span className="text-sm opacity-70 mt-1">
                      {currentIndex + 1} / {images.length}
                    </span>
                  )}
                </div>
                <button
                  className="p-2 text-white/70 hover:text-white transition-colors hover:bg-white/10 rounded-full"
                  onClick={closeLightbox}
                  aria-label="Close lightbox"
                >
                  <RiCloseLine size={32} />
                </button>
              </motion.div>

              {/* Navigation Arrows (Absolute Center) */}
              {images.length > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isClosing ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md z-10"
                    onClick={prevImage}
                    aria-label="Previous image"
                  >
                    <RiArrowLeftLine size={32} />
                  </button>
                  <button
                    className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md z-10"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    <RiArrowRightLine size={32} />
                  </button>
                </motion.div>
              )}

              {/* Bottom Bar: Thumbnail Strip */}
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: isClosing ? 0 : 1, y: isClosing ? 100 : 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full bg-black/80 backdrop-blur-md h-24 overflow-x-auto pointer-events-auto z-20"
              >
                <div className="w-fit h-full flex items-center gap-2 px-4 mx-auto">
                  {images.map((img, idx) => (
                    <button
                      title="Jump to image"
                      key={idx}
                      ref={(el) => {
                        thumbnailRefs.current[idx] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        jumpToImage(idx);
                      }}
                      className={`relative h-16 flex-shrink-0 transition-all rounded-md overflow-hidden border-2 ${
                        currentIndex === idx
                          ? "border-white opacity-100 scale-105"
                          : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="h-full w-auto object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Group 2: Image Layer - Dynamic keys for sliding */}
      <AnimatePresence mode="popLayout" custom={{ direction, isSliding }}>
        {isOpen && geometry && currentImage && (
          <motion.img
            key={currentIndex}
            src={currentImage.src}
            alt={currentImage.alt}
            // Enable drag only when zoomed in
            drag={scale > 1}
            dragConstraints={{
              left: -1000,
              right: 1000,
              top: -1000,
              bottom: 1000,
            }} // Loose constraints for now
            dragElastic={0.1}
            // Animation Variants
            variants={{
              // Case 1: Initial Open (Zoom from rect)
              enter: (custom) => {
                const { direction: dir, isSliding } = custom || {
                  direction: 0,
                  isSliding: false,
                };
                // Only slide if we are sliding AND there is a direction
                if (isSliding && dir !== 0) {
                  // Sliding Enter (Parallax: Incoming image)
                  return {
                    x: dir > 0 ? window.innerWidth : -window.innerWidth,
                    y: geometry.targetRect.y,
                    width: geometry.targetRect.width,
                    height: geometry.targetRect.height,
                    opacity: 1, // Start fully opaque for clean slide
                    scale: 1,
                  };
                }
                // Zoom Enter (Default / Opacity 1 is key here)
                return {
                  x: geometry.initialRect.left,
                  y: geometry.initialRect.top,
                  width: geometry.initialRect.width,
                  height: geometry.initialRect.height,
                  opacity: 1,
                  borderRadius: "4px",
                };
              },
              // Case 2: Center (Target state for both)
              center: {
                x: geometry.targetRect.x,
                y: geometry.targetRect.y,
                width: geometry.targetRect.width,
                height: geometry.targetRect.height,
                opacity: 1,
                scale: scale, // Use the state scale
                borderRadius: "2px",
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                },
              },
              // Case 3: Closed (Manual exit animation)
              closed: () => {
                if (currentIndex === openedIndex) {
                  return {
                    x: geometry.initialRect.left,
                    y: geometry.initialRect.top,
                    width: geometry.initialRect.width,
                    height: geometry.initialRect.height,
                    opacity: 1,
                    scale: 1, // Reset scale on close
                    transition: { duration: 0.25, ease: "easeInOut" },
                  };
                }
                return {
                  opacity: 0,
                  // Explicitly hold position to ensure "dissolve in place"
                  x: geometry.targetRect.x,
                  y: geometry.targetRect.y,
                  width: geometry.targetRect.width,
                  height: geometry.targetRect.height,
                  scale: 1,
                  transition: { duration: 0.2 },
                };
              },
              // Case 4: Exit (Slide out)
              exit: (custom) => {
                const { direction: dir, isSliding } = custom || {
                  direction: 0,
                  isSliding: false,
                };
                if (isSliding) {
                  // Sliding Exit (Parallax: Outgoing image moves slower/less distance)
                  return {
                    x:
                      dir > 0
                        ? -window.innerWidth * 0.3
                        : window.innerWidth * 0.3,
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.2 },
                  };
                }
                // Check if we should zoom back or fade out
                if (currentIndex === openedIndex) {
                  // Zoom Exit (Back to rect, Opacity stays 1 for solid feel)
                  return {
                    x: geometry.initialRect.left,
                    y: geometry.initialRect.top,
                    width: geometry.initialRect.width,
                    height: geometry.initialRect.height,
                    opacity: 1,
                    boxShadow: "none", // Remove shadow so it merges with original
                    transition: { duration: 0.25, ease: "easeInOut" },
                  };
                }
                return {
                  opacity: 0,
                  // Explicitly hold position to ensure "dissolve in place"
                  x: geometry.targetRect.x,
                  y: geometry.targetRect.y,
                  width: geometry.targetRect.width,
                  height: geometry.targetRect.height,
                  scale: 1,
                  transition: { duration: 0.2 },
                };
              },
            }}
            initial="enter"
            animate={isClosing ? "closed" : "center"}
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === "closed") {
                // Animation finished: original image size/pos reached.
                // 1. Show original image
                setOriginalImageVisible(currentIndex, true);
                // 2. Clear all references to prevent memory leak
                setImages([]);
                imageElementsRef.current = [];
                thumbnailRefs.current = [];
                // 3. Unmount lightbox
                setIsOpen(false);
                setIsClosing(false);
                // 4. Restore footer visibility
                setTimeout(() => {
                  setFooterVisible(previousFooterVisibleRef.current);
                }, 200);
              }
            }}
            className="fixed top-0 left-0 z-[1000] object-contain shadow-2xl origin-center select-none"
            style={{
              maxWidth: "none",
              maxHeight: "none",
              cursor: scale > 1 ? "grab" : "auto",
            }}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
