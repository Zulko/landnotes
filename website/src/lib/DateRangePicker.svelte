<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let startDate = { year: 2023, month: 1, day: 1 };
  export let endDate = { year: 2023, month: 12, day: 31 };
  
  // For styling
  export let className = '';
  
  $: isStartDateValid = isValidDate(startDate);
  $: isEndDateValid = isValidDate(endDate);
  $: isRangeValid = isStartDateValid && isEndDateValid && !isStartAfterEnd;
  $: isStartAfterEnd = isStartDateValid && isEndDateValid && 
      compareDate(startDate, endDate) > 0;
  
  function isValidDate(date) {
    const { year, month, day } = date;
    
    // Check month range
    if (month < 1 || month > 12) return false;
    
    // Get days in the specified month
    const daysInMonth = new Date(
      year < 0 ? year + 1 : year, 
      month, 
      0
    ).getDate();
    
    // Check day range
    if (day < 1 || day > daysInMonth) return false;
    
    return true;
  }
  
  function compareDate(date1, date2) {
    // Compare dates - returns negative if date1 < date2, 0 if equal, positive if date1 > date2
    if (date1.year !== date2.year) return date1.year - date2.year;
    if (date1.month !== date2.month) return date1.month - date2.month;
    return date1.day - date2.day;
  }
  
  function updateDate(dateObj, field, value) {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue)) {
      dateObj[field] = newValue;
      
      // Dispatch an event whenever the date changes
      dispatch('change', { startDate, endDate, isValid: isRangeValid });
    }
  }
</script>

<div class="date-range-picker {className}" class:invalid={!isRangeValid}>
  <div class="date-picker">
    <label>
      <input
        type="number"
        bind:value={startDate.year}
        on:change={() => updateDate(startDate, 'year', startDate.year)}
        class:invalid={!isStartDateValid}
        placeholder="Year"
        aria-label="Start year"
      />
      <span>/</span>
      <input
        type="number"
        min="1"
        max="12"
        bind:value={startDate.month}
        on:change={() => updateDate(startDate, 'month', startDate.month)}
        class:invalid={!isStartDateValid}
        placeholder="Month"
        aria-label="Start month"
      />
      <span>/</span>
      <input
        type="number"
        min="1"
        max="31"
        bind:value={startDate.day}
        on:change={() => updateDate(startDate, 'day', startDate.day)}
        class:invalid={!isStartDateValid}
        placeholder="Day"
        aria-label="Start day"
      />
    </label>
  </div>
  
  <span class="separator">to</span>
  
  <div class="date-picker">
    <label>
      <input
        type="number"
        bind:value={endDate.year}
        on:change={() => updateDate(endDate, 'year', endDate.year)}
        class:invalid={!isEndDateValid || isStartAfterEnd}
        placeholder="Year"
        aria-label="End year"
      />
      <span>/</span>
      <input
        type="number"
        min="1"
        max="12"
        bind:value={endDate.month}
        on:change={() => updateDate(endDate, 'month', endDate.month)}
        class:invalid={!isEndDateValid || isStartAfterEnd}
        placeholder="Month"
        aria-label="End month"
      />
      <span>/</span>
      <input
        type="number"
        min="1"
        max="31"
        bind:value={endDate.day}
        on:change={() => updateDate(endDate, 'day', endDate.day)}
        class:invalid={!isEndDateValid || isStartAfterEnd}
        placeholder="Day"
        aria-label="End day"
      />
    </label>
  </div>
  
  {#if !isRangeValid}
    <div class="error-message">
      {#if !isStartDateValid}
        Invalid start date
      {:else if !isEndDateValid}
        Invalid end date
      {:else if isStartAfterEnd}
        Start date must be before or equal to end date
      {/if}
    </div>
  {/if}
</div>

<style>
  .date-range-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    flex-wrap: nowrap;
    padding: 6px 10px;
    background: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    margin: 0 auto;
    width: fit-content;
  }
  
  .date-picker {
    display: flex;
    align-items: center;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  input {
    width: 50px;
    padding: 3px 6px;
    border: 1px solid #ccc;
    border-radius: 3px;
  }
  
  /* Make month and day inputs smaller */
  input[min="1"] {
    width: 35px;
  }
  
  input.invalid {
    border-color: red;
    background-color: #fff0f0;
  }
  
  .separator {
    margin: 0 3px;
    font-weight: bold;
  }
  
  .error-message {
    color: red;
    font-size: 0.8rem;
    margin-left: 8px;
    position: absolute;
    bottom: -18px;
    left: 0;
    white-space: nowrap;
  }
  
  .date-range-picker.invalid {
    position: relative;
    margin-bottom: 20px;
  }
</style>
