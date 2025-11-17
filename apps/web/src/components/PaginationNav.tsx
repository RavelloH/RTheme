"use client";

import {
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
} from "@remixicon/react";
import RowGrid, { GridItem } from "./RowGrid";
import Link from "./Link";
import Clickable from "@/ui/Clickable";
import { createArray } from "@/lib/client/createArray";
import { useMobile } from "@/hooks/useMobile";

interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function PaginationNav({
  currentPage,
  totalPages,
  basePath,
}: PaginationNavProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const isMobile = useMobile();
  return (
    <RowGrid className="text-2xl">
      <GridItem
        areas={[1]}
        mobileAreas={[1]}
        width={1}
        height={1 / 12}
        fixedHeight
        className="flex items-center justify-center bg-primary text-primary-foreground"
      >
        {currentPage > 1 ? (
          <Clickable>
            <Link
              href={
                currentPage === 2
                  ? `${basePath}`
                  : `${basePath}/page/${currentPage - 1}`
              }
            >
              {isMobile ? (
                <RiArrowLeftSLine size={"1.5em"} />
              ) : (
                <RiArrowUpSLine size={"1.5em"} />
              )}
            </Link>
          </Clickable>
        ) : (
          <Clickable disabled={true}>
            {isMobile ? (
              <RiArrowLeftSLine size={"1.5em"} />
            ) : (
              <RiArrowUpSLine size={"1.5em"} />
            )}
          </Clickable>
        )}
      </GridItem>
      {createArray(2, 11).map((pageNum) => (
        <GridItem
          key={pageNum}
          areas={[pageNum]}
          mobileAreas={[pageNum]}
          width={1}
          height={1 / 12}
          fixedHeight
          className="flex items-center justify-center"
        >
          {pages[totalPages - 1] && pages[currentPage - 1 + (pageNum - 6)] ? (
            <Clickable>
              <Link
                href={
                  currentPage - 6 + pageNum === 1
                    ? `${basePath}`
                    : `${basePath}/page/${currentPage - 6 + pageNum}`
                }
                className={
                  currentPage === currentPage - 6 + pageNum
                    ? "text-primary"
                    : ""
                }
              >
                {pages[currentPage - 1 + (pageNum - 6)]}
              </Link>
            </Clickable>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </GridItem>
      ))}
      <GridItem
        areas={[12]}
        mobileAreas={[12]}
        width={1}
        height={1 / 12}
        fixedHeight
        className="flex items-center justify-center bg-primary text-primary-foreground"
      >
        {currentPage === totalPages ? (
          <Clickable disabled={true}>
            {isMobile ? (
              <RiArrowRightSLine size={"1.5em"} />
            ) : (
              <RiArrowDownSLine size={"1.5em"} />
            )}
          </Clickable>
        ) : (
          <Clickable>
            <Link href={`${basePath}/page/${currentPage + 1}`}>
              {isMobile ? (
                <RiArrowRightSLine size={"1.5em"} />
              ) : (
                <RiArrowDownSLine size={"1.5em"} />
              )}
            </Link>
          </Clickable>
        )}
      </GridItem>
    </RowGrid>
  );
}
