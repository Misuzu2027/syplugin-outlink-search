<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    openTab,
    openMobileFileById,
    ITab,
    TProtyleAction,
    Constants,
  } from "siyuan";
  import { openSettingsDialog } from "@/components/setting/setting-util";

  import { getBlockByID, getBlockIsFolded } from "@/utils/api";
  import { bgFade, getOpenTabActionByZoomIn } from "@/utils/siyuan-util";
  import { BlockItem, DocumentItem } from "@/models/outlink-model";
  import {
    clearCssHighlights,
    highlightElementTextByCssReturnMatchRange,
  } from "@/utils/html-util";
  import { EnvConfig } from "@/config/EnvConfig";
  import {
    findScrollingElement,
    getRangeByElement,
    selectItemByArrowKeys,
    toggleAllCollpsedItem,
  } from "@/service/search/search-util";
  import SearchResultItem from "./search-result-item.svelte";
  import { delayedTwiceRefresh } from "@/utils/timing-util";
  import { SettingService } from "@/service/setting/SettingService";
  import { OutLinkDataService } from "@/service/outlink/OutLinkService";
  import { isStrNotBlank } from "@/utils/string-util";
  import { SETTING_DOCUMENT_SORT_MODE_ELEMENT } from "@/models/setting-constant";
  import { CacheManager } from "@/config/CacheManager";

  let rootElement: HTMLElement;
  let documentSearchInputElement: HTMLInputElement;

  let crossBlockSearch: boolean;
  // let outlinkQueryDepth: number;
  let documentSortMode: DocumentSortMode;

  let lastRootId = "";
  let lastFocusBlockId = "";

  let showCurDocName: string = "";

  let allFowardlinkIdSet: Set<string> = new Set<string>();
  let allQueryDocItemArray: DocumentItem[] = [];
  let curPageDocItemArray: DocumentItem[] = [];

  let searchInputKey: string = "";
  let selectedItemIndex: number = -1;
  let inputChangeTimeoutId;
  let isSearching: number = 0;
  let lastIncludeKeywords: string[];
  let allDocumentCount: number = null;
  let curPage: number = 0;
  let totalPage: number = 0;
  let previewProtyleMatchFocusIndex = 0;
  let lastOpenBlockId: string;
  let lastDocumentContentElement: HTMLElement;
  // let notebookMap: Map<string, Notebook> = new Map();

  onMount(async () => {
    initData();
  });

  onDestroy(() => {});

  export async function switchDoc(rootId: string, focusBlockId: string) {
    console.log("switchDoc rootId ", rootId, " , focusBlockId ", focusBlockId);
    if (!rootId && !focusBlockId) {
      return;
    }
    updateCurDoc(rootId);

    lastRootId = rootId;
    lastFocusBlockId = focusBlockId;

    const startTime = performance.now(); // 记录开始时间
    isSearching = 1;
    refreshNotebook();
    let SettingConfig = SettingService.ins.SettingConfig;

    // searchInputKey = "";
    curPage = 0;
    if (isStrNotBlank(focusBlockId)) {
      rootId = focusBlockId;
    }
    let queryDepth = SettingConfig.outlinkQueryDepth;

    allFowardlinkIdSet = await OutLinkDataService.ins.getDocmuentOutLinkByDepth(
      rootId,
      queryDepth
    );

    await refreshSearchDocList();
    isSearching = Math.max(0, isSearching - 1);
    const endTime = performance.now(); // 记录结束时间
    const executionTime = endTime - startTime; // 计算时间差
    console.log(
      `出链面板 切换文档 : ${rootId} , 数量 : ${allFowardlinkIdSet.size} , 消耗时长 : ${executionTime} ms`
    );
  }

  function initData() {
    let SettingConfig = SettingService.ins.SettingConfig;
    crossBlockSearch = SettingConfig.defaultCrossBlockSearch;
    // outlinkQueryDepth = SettingConfig.outlinkQueryDepth;
    documentSortMode = SettingConfig.documentSortMode;
    curPage = 1;
  }

  async function refreshNotebook() {
    EnvConfig.ins.refreshNotebookMap();
  }

  function handleKeyDownDefault() {}

  async function updateCurDoc(docId: string) {
    let showCurDocNameTemp = "";

    if (isStrNotBlank(docId)) {
      let docInfo = await getBlockByID(docId);
      // showCurPathTemp = getBoxIconAndNameHtml(parentDocInfo.box);
      // let hpathSplit = parentDocInfo.hpath.split("/");
      // let pathSplit = parentDocInfo.path.split("/");
      showCurDocNameTemp += `<span class="doc-path" data-path-type="doc" data-id="${docId}">${docInfo.content}</span>`;
    }
    showCurDocName = showCurDocNameTemp;
  }

  function handleKeyDownSelectItem(event: KeyboardEvent) {
    let selectedBlockItem = selectItemByArrowKeys(
      event,
      selectedItemIndex,
      curPageDocItemArray
    );

    if (selectedBlockItem) {
      documentSearchInputElement.focus();

      selectedItemIndex = selectedBlockItem.index;
      expandSelectedItemDocument(selectedBlockItem);
      scrollToSelectedBlock(selectedBlockItem);

      if (event.key === "Enter") {
        let block = selectedBlockItem.block;
        openBlockTab(block.id, block.root_id);
      }
    }
    if (event.altKey && event.key === "r") {
      event.preventDefault();
      event.stopPropagation();

      clickCrossBlockSearchIcon();
    }
  }

  function expandSelectedItemDocument(selectedItem: DocumentItem | BlockItem) {
    if (!selectedItem || !curPageDocItemArray) {
      return;
    }
    // 响应式有延迟，需要自己修改一下类样式。。。
    let itemElements = rootElement.querySelectorAll(
      `div[data-type="search-item"][data-root-id="${selectedItem.block.root_id}"]`
    );
    itemElements.forEach((element) => {
      element.classList.remove("fn__none");
    });
    for (const item of curPageDocItemArray) {
      if (!item.isCollapsed) {
        continue;
      }
      if (item == selectedItem) {
        item.isCollapsed = false;
        return;
      }
      for (const subItem of item.subItems) {
        if (subItem == selectedItem) {
          item.isCollapsed = false;
          return;
        }
      }
    }
  }

  function scrollToSelectedBlock(selectedItem: DocumentItem | BlockItem) {
    if (!selectedItem) {
      return;
    }
    let searchResultListElement = rootElement.querySelector(
      "#documentSearchList"
    ) as HTMLElement;

    let focusItem = rootElement.querySelector(
      `div[data-type="search-item"][data-node-id="${selectedItem.block.id}"]`
    ) as HTMLElement;

    if (!focusItem) {
      focusItem = rootElement.querySelector(
        `div.b3-list-item[data-node-id="${selectedItem.block.id}"]`
      ) as HTMLElement;
    }

    if (!searchResultListElement || !focusItem) {
      return;
    }

    // console.log("focusItem.offsetTop", focusItem.offsetTop);
    let scrollTop =
      focusItem.offsetTop - searchResultListElement.clientHeight / 2;
    if (focusItem.offsetTop > scrollTop) {
      searchResultListElement.scrollTop = scrollTop;
    } else {
      searchResultListElement.scrollTop = 0;
    }
  }

  function handleSearchInputChange(event) {
    let inputValue = event.target.value;
    if (searchInputKey == inputValue) {
      return;
    }

    // 更新输入值
    searchInputKey = inputValue;
    // 清除之前的定时器
    clearTimeout(inputChangeTimeoutId);

    inputChangeTimeoutId = setTimeout(() => {
      curPage = 1;
      refreshSearchDocList();
    }, 450);
  }

  function documentSortMethodChange(event) {
    documentSortMode = event.target.value;
    refreshSearchDocList();
  }

  function pageTurning(page: number) {
    if (page < 1 || page > totalPage) {
      return;
    }
    curPage = page;
    refreshCurPageDocList();
  }

  function clearDocumentSearchInput() {
    searchInputKey = "";
    curPage = 1;
    refreshSearchDocList();
    clearCssHighlights();
  }

  async function refreshSearchDocList() {
    // 每次查询改为2，防止因为异常，加载图案不会消失。目前获取到查询-1，处理完搜索结果-1。
    isSearching = 2;

    let queryCriteria = OutLinkDataService.ins.getFowardlinkQueryCriteria(
      Array.from(allFowardlinkIdSet),
      searchInputKey,
      crossBlockSearch,
      curPage,
      documentSortMode
    );

    allQueryDocItemArray =
      await OutLinkDataService.ins.getDocumentItemArray(queryCriteria);
    isSearching = Math.max(0, isSearching - 1);
    allDocumentCount = allQueryDocItemArray.length;

    lastIncludeKeywords = queryCriteria.includeKeywords;

    // 更新当前页数据。
    refreshCurPageDocList();
    isSearching = Math.max(0, isSearching - 1);
  }

  async function refreshCurPageDocList() {
    if (allDocumentCount < 1) {
      allDocumentCount = 0;
      curPage = 0;
    } else if (curPage == 0) {
      curPage = 1;
    }
    selectedItemIndex = -1;
    let pageSize = SettingService.ins.SettingConfig.pageSize;
    totalPage = Math.ceil(allDocumentCount / pageSize);
    curPageDocItemArray = await OutLinkDataService.ins.getPageDocumentItemArray(
      allQueryDocItemArray,
      curPage
    );
  }

  function clickItem(event, item: DocumentItem) {
    let block = item.block;
    let blockId = block.id;
    let rootId = block.root_id;
    selectedItemIndex = item.index;

    // documentSearchInputFocus();

    openBlockTab(blockId, rootId);
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  async function openBlockTab(blockId: string, rootId: string) {
    if (lastOpenBlockId == blockId) {
      previewProtyleMatchFocusIndex++;
    } else {
      previewProtyleMatchFocusIndex = 0;
    }

    let zoomIn = await getBlockIsFolded(blockId);
    let actions: TProtyleAction[] = getOpenTabActionByZoomIn(zoomIn);

    if (EnvConfig.ins.isMobile) {
      openMobileFileById(EnvConfig.ins.app, blockId, actions);
    } else {
      openDestopBlockTab(zoomIn, actions, blockId, rootId);
    }
  }

  async function openDestopBlockTab(
    zoomIn: boolean,
    actions: TProtyleAction[],
    blockId: string,
    rootId: string
  ) {
    if (rootId == blockId) {
      // actions = actions.filter((item) => item !== Constants.CB_GET_HL);
      actions = [Constants.CB_GET_FOCUS, Constants.CB_GET_SCROLL];
    }
    lastOpenBlockId = blockId;

    // 如果被查找节点不是聚焦状态，节点文档是当前查看文档，节点的文档element 存在，文档element 保护查找的节点
    if (
      !zoomIn &&
      // rootId != blockId &&
      rootId == EnvConfig.ins.lastViewedDocId &&
      lastDocumentContentElement &&
      document.contains(lastDocumentContentElement)
    ) {
      let targetNodeElement: Element | null =
        lastDocumentContentElement.querySelector(`[data-node-id="${blockId}"]`);
      if (targetNodeElement) {
        let matchBlockId = rootId == blockId ? null : blockId;
        let matchFocusRangePromise = highlightElementTextByCssReturnMatchRange(
          lastDocumentContentElement,
          lastIncludeKeywords,
          matchBlockId,
          previewProtyleMatchFocusIndex
        );

        matchFocusRangePromise.then((focusRange) => {
          if (!focusRange) {
            focusRange = getRangeByElement(targetNodeElement);
          }

          renderNextSearchMarkByRange(focusRange);
        });

        if (matchBlockId) {
          bgFade(targetNodeElement);
        }
        return;
      }
    }

    let docTabPromise: Promise<ITab> = openTab({
      app: EnvConfig.ins.app,
      doc: {
        id: blockId,
        action: actions,
      },
      afterOpen() {
        let tmpBlockId = "";
        if (rootId != blockId) {
          tmpBlockId = blockId;
        }
        afterOpenDocTab(docTabPromise, tmpBlockId);
      },
    });
  }

  async function afterOpenDocTab(
    docTabPromise: Promise<ITab>,
    blockId: string
  ) {
    let docTab = await docTabPromise;
    lastDocumentContentElement = docTab.panelElement.children[1] as HTMLElement;

    delayedTwiceRefresh(() => {
      let matchFocusRangePromise = highlightElementTextByCssReturnMatchRange(
        lastDocumentContentElement,
        lastIncludeKeywords,
        blockId,
        previewProtyleMatchFocusIndex
      );

      matchFocusRangePromise.then((focusRange) => {
        renderFirstSearchMarkByRange(focusRange);
      });
    }, 50);
  }

  function renderFirstSearchMarkByRange(matchRange: Range) {
    scrollByRange(matchRange, "nearest");
  }

  function renderNextSearchMarkByRange(matchRange: Range) {
    scrollByRange(matchRange, "center");
  }

  function scrollByRange(matchRange: Range, position: ScrollLogicalPosition) {
    if (matchRange) {
      const matchElement = matchRange.commonAncestorContainer.parentElement;

      if (matchElement.clientHeight > document.documentElement.clientHeight) {
        // 特殊情况：如果一个段落中软换行非常多，此时如果定位到匹配节点的首行，
        // 是看不到查询的文本的，需要通过 Range 的精确位置进行定位。
        const scrollingElement = findScrollingElement(matchElement);
        const contentRect = scrollingElement.getBoundingClientRect();
        let scrollTop =
          scrollingElement.scrollTop +
          matchRange.getBoundingClientRect().top -
          contentRect.top -
          contentRect.height / 2;
        scrollingElement.scrollTo({
          top: scrollTop,
          behavior: "smooth",
        });
      } else {
        matchElement.scrollIntoView({
          behavior: "smooth",
          block: position,
          inline: position,
        });
      }
    }
  }

  function clickSearchSettingOther() {
    openSettingsDialog();
  }
  function clickCrossBlockSearchIcon() {
    crossBlockSearch = !crossBlockSearch;
    if (isStrNotBlank(searchInputKey)) {
      refreshSearchDocList();
    }
  }

  function clearCacheAndRefresh() {
    CacheManager.ins.clearRootFowardlinkIdSet();
    switchDoc(lastRootId, lastFocusBlockId);
  }

  function clickExpandAll() {
    toggleAllCollpsedItem(curPageDocItemArray, false);
    curPageDocItemArray = curPageDocItemArray;
  }

  function clickCollapseAll() {
    toggleAllCollpsedItem(curPageDocItemArray, true);
    curPageDocItemArray = curPageDocItemArray;
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="fn__flex-column misuzu2027__outlink-search__area"
  style="height: 100%;"
  bind:this={rootElement}
>
  <div class="block__icons" style="overflow: auto">
    <span class="fn__space"></span>
    <span
      class="block__icon ariaLabel {crossBlockSearch ? 'label-selected' : ''}"
      aria-label="跨块搜索"
      style="opacity: 1;"
      on:click={clickCrossBlockSearchIcon}
      on:keydown={handleKeyDownDefault}
    >
      <svg class="ft__on-surface svg fn__flex-center"
        ><use xlink:href="#iconFullTextSearch"></use></svg
      >
    </span>
    <span class="fn__space"></span>
    <span
      class="block__icon ariaLabel"
      aria-label="清空缓存并刷新"
      style="opacity: 1;"
      on:click={clearCacheAndRefresh}
      on:keydown={handleKeyDownDefault}
    >
      <svg class="ft__on-surface svg fn__flex-center"
        ><use xlink:href="#iconResetInitialization"></use></svg
      >
    </span>
    <span class="fn__space"></span>

    <span
      aria-label={window.siyuan.languages.config}
      class="block__icon block__icon--show ariaLabel"
      data-position="9bottom"
      on:click={clickSearchSettingOther}
      on:keydown={handleKeyDownDefault}
    >
      <svg><use xlink:href="#iconSettings"></use></svg>
    </span>
    <span class="fn__flex-1" style="min-height: 100%"></span>
    <span class="fn__space"></span>

    <span
      id="documentSearchExpand"
      class="block__icon block__icon--show ariaLabel"
      data-position="9bottom"
      aria-label={EnvConfig.ins.i18n.expand}
      on:click={clickExpandAll}
      on:keydown={handleKeyDownDefault}
    >
      <svg><use xlink:href="#iconExpand"></use></svg>
    </span>
    <span class="fn__space"></span>
    <span
      id="documentSearchCollapse"
      class="block__icon block__icon--show ariaLabel"
      data-position="9bottom"
      aria-label={EnvConfig.ins.i18n.collapse}
      on:click={clickCollapseAll}
      on:keydown={handleKeyDownDefault}
    >
      <svg><use xlink:href="#iconContract"></use></svg>
    </span>
  </div>
  <div class="block__icons" style="overflow: auto">
    <span class="fn__space"></span>
    <select
      class="b3-select fn__flex-center ariaLabel"
      aria-label="文档排序方式"
      style="max-width: 120px;"
      on:change={documentSortMethodChange}
    >
      {#each SETTING_DOCUMENT_SORT_MODE_ELEMENT() as element}
        <option
          value={element.value}
          selected={element.value == documentSortMode}
        >
          {element.name}
        </option>
      {/each}
    </select>
    <span class="fn__space"></span>
    <span class="fn__space"></span>
    <!-- 路径信息 -->
    <span class="doc-name__span" on:touchmove|stopPropagation={() => {}}>
      {@html showCurDocName}
    </span>
  </div>
  <div
    class="b3-form__icon search__header"
    on:keydown={handleKeyDownSelectItem}
  >
    <div style="position: relative" class="fn__flex-1">
      <span>
        <svg data-menu="true" class="b3-form__icon-icon">
          <use xlink:href="#iconSearch"></use>
        </svg>
        <!-- <svg class="search__arrowdown"
                    ><use xlink:href="#iconDown"></use>
                </svg> -->
      </span>
      <input
        bind:this={documentSearchInputElement}
        class="b3-text-field b3-text-field--text misuzu2027__outlink__search-input"
        style="padding-right: 32px !important;"
        on:input={handleSearchInputChange}
        bind:value={searchInputKey}
      />
      <svg
        class="b3-form__icon-clear ariaLabel {searchInputKey == ''
          ? 'fn__none'
          : ''}"
        aria-label={EnvConfig.ins.i18n.clear}
        style="right: 8px;height:42px"
        on:click|stopPropagation={clearDocumentSearchInput}
        on:keydown={handleKeyDownDefault}
      >
        <use xlink:href="#iconCloseRound"></use>
      </svg>
    </div>
    <div class="block__icons">
      <span
        id="documentSearchRefresh"
        aria-label={EnvConfig.ins.i18n.refresh}
        class="block__icon ariaLabel"
        data-position="9bottom"
        on:click|stopPropagation={() => {
          refreshSearchDocList();
        }}
        on:keydown={handleKeyDownDefault}
      >
        <svg><use xlink:href="#iconRefresh"></use></svg>
      </span>
    </div>
  </div>

  <div class="block__icons" style="overflow:auto">
    <span
      class="fn__flex-shrink ft__selectnone
        {allDocumentCount == null || allDocumentCount < 0 ? 'fn__none' : ''}"
    >
      <span class="fn__space"></span>

      <span class="ft__on-surface">
        {EnvConfig.ins.i18n.findInDoc.replace("${x}", String(allDocumentCount))}
        <!-- 中匹配 {searchResultTotalCount}块 -->
      </span>
    </span>
    <span class="fn__space"></span>
    <span class="fn__flex-1" style="min-height: 100%"></span>

    <span
      class="fn__flex-shrink ft__selectnone
    {allDocumentCount == null || allDocumentCount < 0 ? 'fn__none' : ''}"
    >
      {curPage}/{totalPage}
    </span>

    <span class="fn__space"></span>
    <span
      data-position="9bottom"
      data-type="previous"
      class="block__icon block__icon--show ariaLabel
            {curPage <= 1 ? 'disabled' : ''}"
      aria-label={EnvConfig.ins.i18n.previousLabel}
      on:click={() => {
        pageTurning(curPage - 1);
      }}
      on:keydown={handleKeyDownDefault}
      ><svg><use xlink:href="#iconLeft"></use></svg></span
    >
    <span class="fn__space"></span>
    <span
      data-position="9bottom"
      data-type="next"
      class="block__icon block__icon--show ariaLabel
            {curPage >= totalPage ? 'disabled' : ''}"
      aria-label={EnvConfig.ins.i18n.nextLabel}
      on:click={() => {
        pageTurning(curPage + 1);
      }}
      on:keydown={handleKeyDownDefault}
      ><svg><use xlink:href="#iconRight"></use></svg></span
    >

    <span class="fn__space"></span>
  </div>
  <div class="search__layout search__layout--row">
    <SearchResultItem
      documentItemSearchResult={curPageDocItemArray}
      selectedIndex={selectedItemIndex}
      clickCallback={clickItem}
    />
  </div>
</div>
<div
  class="fn__loading fn__loading--top {isSearching > 0 ? '' : 'fn__none'}"
  style="top:125px"
>
  <!-- svelte-ignore a11y-missing-attribute -->
  <img width="120px" src="/stage/loading-pure.svg" />
</div>

<style lang="scss">
  .label-selected {
    background-color: var(--b3-theme-primary-light);
    transition: box-shadow 0.5s ease-in-out;
  }
  .disabled {
    /* pointer-events: none; */ /* 禁止元素接受用户的鼠标事件 */
    opacity: 0.5; /* 设置元素透明度，表示禁用状态 */
    cursor: not-allowed;
    /* cursor: not-allowed;*/ /* 改变鼠标光标，表示不允许交互 */
  }

  .misuzu2027__outlink-search__area .doc-name__span {
    font-size: 80%;
  }
</style>
