<script lang="ts" setup>
  import { ItemProperty } from "@/models/setting-model";
  import { SettingService } from "@/service/setting/SettingService";

  export let itemProperty: ItemProperty;
  let inputValue = SettingService.ins.SettingConfig[itemProperty.key];

  let changeTimeoutId: NodeJS.Timeout;

  function inputChange() {
    // 清除之前的定时器
    if (changeTimeoutId) {
      clearTimeout(changeTimeoutId);
    }
    changeTimeoutId = setTimeout(() => {
      changeTimeoutId = null;
      SettingService.ins.updateSettingCofnigValue(itemProperty.key, inputValue);
    }, 450);
  }
</script>

{#if itemProperty.type === "text"}
  <input
    class="b3-text-field fn__flex-center fn__size200"
    type="text"
    bind:value={inputValue}
    on:change={inputChange}
  />
{:else if itemProperty.type === "number"}
  <input
    class="b3-text-field fn__flex-center fn__size200"
    min={itemProperty.min}
    max={itemProperty.max}
    type="number"
    bind:value={inputValue}
    on:change={inputChange}
  />
{/if}
