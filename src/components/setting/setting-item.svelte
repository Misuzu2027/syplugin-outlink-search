<script lang="ts" setup>
  import { ItemProperty } from "@/models/setting-model";

  export let itemProperty: ItemProperty;
</script>

<div
  class="fn__flex b3-label config__item"
  style={itemProperty.type == "checkbox" ? "flex-wrap:wrap;" : ""}
>
  <div class="fn__flex-1 fn__flex-center" style="font-size:110%">
    {itemProperty.name}
    <div class="b3-label__text">
      {@html itemProperty.description}
    </div>
  </div>
  <div class="fn__space"></div>
  {#if itemProperty.type == "checkbox"}
    <div style="width: 100%;"></div>
    <slot />
  {:else}
    <slot />
  {/if}
</div>
