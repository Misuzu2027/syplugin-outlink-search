<script lang="ts">
  import { ItemProperty } from "@/models/setting-model";
  import { SettingService } from "@/service/setting/SettingService";

  export let itemProperty: ItemProperty;
  let checkboxArray: string[] =
    SettingService.ins.SettingConfig[itemProperty.key];

  function handleChange(value: string, checked: boolean) {
    if (checked) {
      checkboxArray = [...checkboxArray, value];
    } else {
      checkboxArray = checkboxArray.filter((v) => v !== value);
    }
    SettingService.ins.updateSettingCofnigValue(
      itemProperty.key,
      checkboxArray
    );
  }
</script>

<div class="config-query">
  {#each itemProperty.options as option}
    <label class="fn__flex">
      {#if option.iconId}
        <svg class="svg"><use xlink:href={option.iconId}></use></svg>
        <span class="fn__space"></span>
      {/if}
      <div class="fn__flex-1">
        {option.name}
      </div>
      <span class="fn__space"></span>
      <input
        class="b3-switch"
        type="checkbox"
        checked={checkboxArray.includes(option.value)}
        on:change={(e) => handleChange(option.value, e.currentTarget.checked)}
      />
    </label>
  {/each}
</div>

<style lang="scss">
  .config-query {
    width: 100%;
  }
  .config-query label {
    width: 24%;
    margin-right: 9%;
  }
</style>
