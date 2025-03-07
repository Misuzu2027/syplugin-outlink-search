<script lang="ts">
  import { EnvConfig } from "@/config/EnvConfig";
  import { onDestroy, onMount } from "svelte";
  import OutlinkSearchPageSvelte from "@/components/outlink/outlink-search-page.svelte";
  import { isElementHidden } from "@/utils/siyuan-util";
  import { clearCssHighlights } from "@/utils/html-util";

  let hiddenDock: boolean;
  let rootElement: HTMLElement;

  let outlinkSearchPageSvelte: OutlinkSearchPageSvelte;

  let lastRootId: string;
  let lastFocusBlockId: string;

  onMount(async () => {
    init();
  });
  onDestroy(() => {
    outlinkSearchPageSvelte.$destroy();
  });

  export function restView() {
    let hiddenDockTemp = hiddenDock;
    hiddenDock = isElementHidden(rootElement);
    if (hiddenDockTemp && !hiddenDock) {
      if (!EnvConfig.ins.isMobile) {
        let searchInputElement = rootElement.querySelector(
          ".misuzu2027__outlink__search-input"
        ) as HTMLElement;
        searchInputElement.focus();

        outlinkSearchPageSvelte.switchDoc(lastRootId, null);
      }
    }
    if (hiddenDock) {
      // 隐藏侧边栏，清空高亮
      clearCssHighlights();
    }
  }

  async function init() {
    lastRootId = EnvConfig.ins.lastViewedDocId;

    EnvConfig.ins.plugin.eventBus.on("switch-protyle", (e: any) => {
      switchProtyleCallback(e);
    });
    console.log("dock init lastRootId ", lastRootId);
    outlinkSearchPageSvelte.switchDoc(lastRootId, lastFocusBlockId);
  }

  async function switchProtyleCallback(e) {
    if (e && e.detail && e.detail.protyle && e.detail.protyle.block) {
      let rootId = e.detail.protyle.block.rootID;
      if (!hiddenDock && lastRootId != rootId) {
        outlinkSearchPageSvelte.switchDoc(rootId, null);
      }
      lastRootId = rootId;
    }
  }
</script>

<div
  class="misuzu2027_outlink-search-dock"
  style="height: 100%;"
  bind:this={rootElement}
>
  <OutlinkSearchPageSvelte bind:this={outlinkSearchPageSvelte} />
</div>
