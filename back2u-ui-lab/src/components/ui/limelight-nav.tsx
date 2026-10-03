"use client";

import React, { useRef, useLayoutEffect, useState, cloneElement, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  id: string;
  href: string;
  icon?: React.ReactElement;
  label: string;
};

type LimelightNavProps = {
  items: NavItem[];
  className?: string;
  limelightClassName?: string;
  itemClassName?: string;
};

export const LimelightNav = ({
  items,
  className,
  limelightClassName,
  itemClassName,
}: LimelightNavProps) => {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Determine active index based on current pathname
    const currentIndex = items.findIndex((item) => {
      if (item.href === "/") {
        return pathname === "/";
      }
      return pathname?.startsWith(item.href);
    });
    setActiveIndex(currentIndex !== -1 ? currentIndex : -1);
  }, [pathname, items]);

  useLayoutEffect(() => {
    if (items.length === 0 || activeIndex === -1) {
      if (limelightRef.current) {
        limelightRef.current.style.opacity = "0";
      }
      return;
    }

    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];

    if (limelight && activeItem) {
      const newLeft =
        activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;
      limelight.style.opacity = "1";

      if (!isReady) {
        setTimeout(() => setIsReady(true), 50);
      }
    }
  }, [activeIndex, isReady, items, pathname]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        "relative inline-flex items-center text-deep-purple overflow-hidden",
        className
      )}
    >
      {items.map(({ id, href, icon, label }, index) => {
        const isActive = activeIndex === index;
        return (
          <Link
            key={id}
            href={href}
            ref={(el) => { navItemRefs.current[index] = el; }}
            className={cn(
              "relative z-20 flex cursor-pointer items-center justify-center gap-2 px-4 py-3 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              isActive ? "text-deep-purple" : "text-deep-purple/60 hover:text-deep-purple",
              itemClassName
            )}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            {icon &&
              cloneElement(icon, {
                className: cn(
                  "w-5 h-5 transition-opacity duration-200 ease-in-out",
                  isActive ? "opacity-100" : "opacity-70",
                  icon.props.className
                ),
              })}
            <span className="text-sm font-medium tracking-wide whitespace-nowrap">
              {label}
            </span>
          </Link>
        );
      })}

      <div
        ref={limelightRef}
        className={cn(
          "absolute top-0 z-10 h-[3px] rounded-b-full bg-deep-purple shadow-[0_15px_20px_rgba(61,49,91,0.4)] pointer-events-none",
          isReady ? "transition-all duration-300 ease-out motion-reduce:transition-none" : "",
          limelightClassName
        )}
        style={{ left: "-999px", opacity: 0, width: "60px" }}
      >
        <div className="absolute left-[-50%] top-[3px] w-[200%] h-[76px] [clip-path:polygon(10%_100%,40%_0,60%_0,90%_100%)] bg-gradient-to-b from-deep-purple/15 to-transparent pointer-events-none" />
      </div>
    </nav>
  );
};
