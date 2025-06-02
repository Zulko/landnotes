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
    gap: 4px;
  }

  .date-select,
  .date-input {
    padding: 6px 8px;
    border: 1px solid #a2a9b1;
    border-radius: 2px;
    background-color: #ffffff;
    color: #000000;
    font-size: 13px;
    font-family: inherit;
    transition:
      border-color 0.15s ease-in-out,
      box-shadow 0.15s ease-in-out;
    outline: none;
    text-align: center;
    cursor: pointer;
    /* Safari-specific overrides */
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  .date-select {
    width: auto;
    min-width: 60px;
    /* Add custom dropdown arrow for Safari */
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 6px center;
    background-size: 12px;
    padding-right: 24px;
  }

  .month-select {
    min-width: 80px;
  }

  .year-input {
    width: 70px;
    cursor: text;
    background-image: none;
    padding-right: 8px;
  }

  .date-select:hover,
  .date-input:hover {
    border-color: #72777d;
  }

  .date-select:focus,
  .date-input:focus {
    border-color: #36c;
    box-shadow: inset 0 0 0 1px #36c;
  }

  .date-select:active {
    background-color: #eaecf0;
  }

  /* Style the spinner buttons to be more subtle */
  .year-input::-webkit-inner-spin-button,
  .year-input::-webkit-outer-spin-button {
    opacity: 0.7;
    height: 1.2em;
    width: 1em;
  }

  .year-input::-webkit-inner-spin-button:hover,
  .year-input::-webkit-outer-spin-button:hover {
    opacity: 1;
  }

  /* Firefox number input styling */
  .year-input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Option styling */
  option {
    color: #000000;
    background-color: #ffffff;
    padding: 4px;
  }

  /* Additional Safari fixes */
  select.date-select {
    -webkit-border-radius: 2px;
    -webkit-box-shadow: none;
  }

  select.date-select::-webkit-inner-spin-button,
  select.date-select::-webkit-outer-spin-button {
    display: none;
    -webkit-appearance: none;
  }
</style>
