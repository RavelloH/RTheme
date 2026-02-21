"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { create } from "@orama/orama";
import { createTokenizer } from "@orama/tokenizers/mandarin";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogFooter,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";

function initOrama() {
  return create({
    schema: { _: "string" },
    components: {
      tokenizer: createTokenizer(),
    },
  });
}

export default function ChineseSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    type: "static",
    initOrama,
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
      <SearchDialogFooter />
    </SearchDialog>
  );
}
