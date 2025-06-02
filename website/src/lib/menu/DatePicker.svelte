<script>
  import { constrainedDate } from "../data/date_utils";
  // Define a date object to hold the values
  let { date = $bindable({ year: 1810, month: 3, day: "all" }) } = $props();

  // Add an array of month abbreviations
  const monthAbbreviations = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Optional: you can also export individual props if needed
  // but they should be bound to date properties

  // const firstYearRequiringMonth = 1500;
  // const firstYearRequiringDay = 1920;
  const firstYearRequiringMonth = 3000;
  const firstYearRequiringDay = 3000;

  function getDaysInMonth(year, month) {
    return new Date(year < 0 ? year + 1 : year, month, 0).getDate();
  }

  function updateDate(field, value) {
    if (field === "year" && value === 0) {
      // If setting year to 0, change to -1 if current year is positive, or 1 otherwise
      value = date.year > 0 ? -1 : 1;
    }
    date = constrainedDate({ ...date, [field]: value });
  }

  function incrementYear() {
    const newYear = date.year + 1;
    if (newYear === 0) {
      updateDate("year", 1);
    } else {
      updateDate("year", newYear);
    }
  }

  function decrementYear() {
    const newYear = date.year - 1;
    if (newYear === 0) {
      updateDate("year", -1);
    } else {
      updateDate("year", newYear);
    }
  }
</script>

<div class="date-picker">
  {#if date.month !== "all"}
    <select
      value={date.day}
      onchange={(e) =>
        updateDate(
          "day",
          e.currentTarget.value === "all"
            ? "all"
            : parseInt(e.currentTarget.value)
        )}
      aria-label="Day"
      class="date-select"
    >
      {#if date.year < firstYearRequiringDay}
        <option value="all">All</option>
      {/if}
      {#each Array.from({ length: getDaysInMonth(date.year, date.month) }, (_, i) => 1 + i) as day}
        <option value={day}>{day}</option>
      {/each}
    </select>
  {/if}
  <select
    value={date.month}
    onchange={(e) =>
      updateDate(
        "month",
        e.currentTarget.value === "all"
          ? "all"
          : parseInt(e.currentTarget.value)
      )}
    class="date-select month-select"
  >
    {#if date.year < firstYearRequiringMonth}
      <option value="all">All year</option>
    {/if}
    {#each Array.from({ length: 12 }, (_, i) => 1 + i) as month}
      <option value={month}>{monthAbbreviations[month - 1]}</option>
    {/each}
  </select>
  <div class="year-container">
    <input
      type="number"
      value={date.year}
      onchange={(e) => updateDate("year", parseInt(e.currentTarget.value))}
      min="-10000"
      max="2000"
      placeholder="Year"
      aria-label="Year"
      class="date-input year-input"
    />
    <div class="year-spinners">
      <button
        type="button"
        class="year-spinner year-spinner-up"
        onclick={incrementYear}
        aria-label="Increment year"
        title="Increment year"
        tabindex="-1"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18,15 12,9 6,15"></polyline>
        </svg>
      </button>
      <button
        type="button"
        class="year-spinner year-spinner-down"
        onclick={decrementYear}
        aria-label="Decrement year"
        title="Decrement year"
        tabindex="-1"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .date-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "Liberation Sans", sans-serif;
    flex-wrap: nowrap;
    padding: 8px;
    width: fit-content;
    margin: 0 auto;
    gap: 6px;
  }

  .date-select,
  .date-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background-color: #ffffff;
    color: #374151;
    font-size: 14px;
    font-family: inherit;
    font-weight: 500;
    transition: all 0.2s ease;
    outline: none;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    /* Safari-specific overrides */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  .date-select {
    width: auto;
    min-width: 70px;
    /* Add custom dropdown arrow for Safari */
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23858585' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 14px;
    padding-right: 32px;
  }

  .month-select {
    min-width: 90px;
  }

  .year-container {
    position: relative;
    display: inline-block;
  }

  .year-input {
    width: 80px;
    cursor: text;
    background-image: none;
    padding-right: 32px;
  }

  .year-spinners {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .year-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 14px;
    border: none;
    border-radius: 3px;
    background-color: transparent;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    padding: 0;
  }

  .year-spinner:hover {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .year-spinner:focus {
    background-color: #e5e7eb;
    color: #374151;
  }

  .year-spinner:active {
    background-color: #d1d5db;
    transform: scale(0.9);
  }

  .date-select:hover,
  .date-input:hover {
    border-color: #9ca3af;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .date-select:focus,
  .date-input:focus {
    border-color: #3b82f6;
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .date-select:active {
    background-color: #f9fafb;
    transform: translateY(0);
  }

  /* Hide native number input spinners */
  .year-input::-webkit-inner-spin-button,
  .year-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox number input styling */
  .year-input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Option styling */
  option {
    color: #374151;
    background-color: #ffffff;
    padding: 6px;
  }

  /* Additional Safari fixes */
  select.date-select {
    -webkit-border-radius: 8px;
    -webkit-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  select.date-select::-webkit-inner-spin-button,
  select.date-select::-webkit-outer-spin-button {
    display: none;
    -webkit-appearance: none;
  }
</style>
