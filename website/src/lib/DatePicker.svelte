<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Define a date object to hold the values
  export let date;
  
  // Add an array of month abbreviations
  const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Optional: you can also export individual props if needed
  // but they should be bound to date properties
  
  $: isDateValid = isValidDate(date);
  
  function isValidDate(date) {
    const { year, month, day } = date;
    
    // Basic validation
    if (!year || !month || !day) return false;
    
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
  
  function updateDate(field, value) {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue)) {
      date[field] = newValue;
      dispatch('change', { date, isValid: isDateValid });
    }
  }
</script>

<div class="date-picker">
  <input
      type="number"
      min="1"
      max="31"
      bind:value={date.day}
      on:change={() => date = { ...date }}
      placeholder="Day"
      aria-label="Day"
  />
  <select 
    bind:value={date.month}
    on:change={() => date = { ...date }}
  >
    {#each Array.from({length: 12}, (_, i) => 1 + i) as month}
      <option value={month}>{monthAbbreviations[month-1]}</option>
    {/each}
  </select>
    <input
      type="number"
      bind:value={date.year}
      on:change={() => date = { ...date }}
      min="-10000"
      max="2000"
      class:invalid={!isDateValid}
      placeholder="Year"
      aria-label="Year"
    />

</div>

<style>
  .date-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    flex-wrap: nowrap;
    padding: 8px;
    width: fit-content;
    /* -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px); */
    
    margin: 0 auto -5px;
  }
  
  .date-picker {
    display: flex;
    align-items: center;
  }
  
  input, select {
    margin-left: 4px;
    padding: 6px 4px;
    border: 1px solid #e0e4e8;
    border-radius: 6px;
    background-color: #fff;
    color: #333;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }
  
  input:focus {
    border-color: #4f86ed;
    box-shadow: 0 0 0 2px rgba(79, 134, 237, 0.2);
  }
  
  input:hover:not(:focus) {
    border-color: #cbd2d9;
  }
  
  /* Make month and day inputs smaller */
  input[min="1"] {
    width: 35px;
  }
  
  input.invalid {
    border-color: #e53935;
    background-color: #fff;
    box-shadow: 0 0 0 1px rgba(229, 57, 53, 0.3);
  }
  
  span:not(.separator) {
    color: #718096;
    font-weight: 400;
  }
  
  .error-message {
    color: #e53935;
    font-size: 0.75rem;
    margin-left: 8px;
    position: absolute;
    bottom: -20px;
    left: 0;
    white-space: nowrap;
    padding: 2px 8px;
    background-color: rgba(253, 240, 239, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 4px;
    font-weight: 500;
  }

  /* Style the spinner buttons to be always visible */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    opacity: 1;
    height: 1.5em;
    width: 1.2em;
    position: relative;
    right: -2px;
  }
</style>
